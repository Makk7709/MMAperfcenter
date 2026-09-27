import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createCheckoutHandler } from "../../supabase/functions/create-checkout/handler.ts";
import { PublicError } from "../../supabase/functions/_shared/http.ts";

type Session = {
  id: string;
  url: string;
  status: string;
  mode: string;
  subscription?: string;
};
function fixture() {
  let locked = false;
  let row: Record<string, unknown> = {
    request_id: null,
    params: null,
    session_id: null,
  };
  let failSave = false;
  let loseResponse = false;
  let status: string | null = null;
  const subscriptionStatus = new Map<string, string>();
  const sessions = new Map<string, Session>();
  const keys = new Map<string, Session>();
  const calls: string[] = [];
  const db = {
    rpc: (name: string) => {
      if (name === "release_checkout_lock") {
        locked = false;
        return { error: null };
      }
      const data = !locked;
      locked = true;
      return { data, error: null };
    },
    from: (name: string) => {
      let patch: Record<string, unknown> | undefined;
      const query = {
        select: () => query,
        eq: () => query,
        update: (data: Record<string, unknown>) => {
          patch = data;
          return query;
        },
        maybeSingle: () => ({ data: { plan: "free" }, error: null }),
        single: () => {
          if (failSave && patch)
            return { data: null, error: { message: "offline" } };
          if (patch) row = structuredClone(patch);
          return {
            data: name === "checkout_attempts" ? structuredClone(row) : {},
            error: null,
          };
        },
      };
      return query;
    },
  };
  const stripe = {
    subscriptions: {
      list: async function* () {
        if (status) yield { status };
      },
      retrieve: (id: string) =>
        Promise.resolve({ id, status: subscriptionStatus.get(id) ?? "active" }),
    },
    checkout: {
      sessions: {
        list: async function* () {
          for (const s of sessions.values())
            if (s.status === "open") yield { ...s };
        },
        retrieve: (id: string) => Promise.resolve({ ...sessions.get(id)! }),
        expire: (id: string) => {
          calls.push("expire:" + id);
          const s = sessions.get(id)!;
          if (s.status === "complete") throw Error("already paid");
          s.status = "expired";
          return Promise.resolve({ ...s });
        },
        create: (_params: unknown, options: { idempotencyKey: string }) => {
          let s = keys.get(options.idempotencyKey);
          if (!s) {
            s = {
              id: "cs_" + (sessions.size + 1),
              url: "https://checkout.test/" + (sessions.size + 1),
              status: "open",
              mode: "subscription",
            };
            sessions.set(s.id, s);
            keys.set(options.idempotencyKey, s);
            calls.push("create:" + s.id);
          }
          if (loseResponse) {
            loseResponse = false;
            throw Error("response lost");
          }
          return Promise.resolve({ ...s });
        },
      },
    },
  };
  type Dependencies = Parameters<typeof createCheckoutHandler>[0];
  const deps = {
    createServiceClient: () => db,
    requireUser: () =>
      Promise.resolve({ id: "user", email: "test@example.test" }),
    createStripe: () => stripe,
    getOrCreateCustomerId: () => Promise.resolve("cus_test"),
    appBaseUrl: () => "https://app.test",
    checkoutPriceFor: (p: string) => "price_" + p,
  } as unknown as NonNullable<Dependencies>;
  return {
    handler: createCheckoutHandler(deps),
    deps,
    sessions,
    calls,
    failSave: () => {
      failSave = true;
    },
    loseResponse: () => {
      loseResponse = true;
    },
    subscription: (s: string) => {
      status = s;
    },
    subscriptionStatus,
    row: () => row,
  };
}
const req = (plan = "pro", withdrawalWaiver = true) =>
  new Request("https://edge.test/create-checkout", {
    method: "POST",
    body: JSON.stringify({ plan, withdrawalWaiver }),
  });

Deno.test("checkout reuses one session across repeated requests", async () => {
  const f = fixture();
  const a = await f.handler(req());
  const b = await f.handler(req());
  assertEquals(a.status, 200);
  assertEquals(await a.json(), await b.json());
  assertEquals(f.sessions.size, 1);
});
Deno.test(
  "checkout serializes concurrent requests for the same account",
  async () => {
    const f = fixture();
    const result = await Promise.all([f.handler(req()), f.handler(req())]);
    assertEquals(result.map((r) => r.status).sort(), [200, 409]);
    assertEquals(f.sessions.size, 1);
  },
);
Deno.test(
  "checkout expires the previous offer before creating another",
  async () => {
    const f = fixture();
    await f.handler(req());
    const result = await f.handler(req("elite"));
    assertEquals(result.status, 200);
    assertEquals(f.calls, ["create:cs_1", "expire:cs_1", "create:cs_2"]);
  },
);
Deno.test(
  "checkout recovers a lost Stripe response with the same durable key",
  async () => {
    const f = fixture();
    f.loseResponse();
    assertEquals((await f.handler(req())).status, 500);
    assert(f.row().request_id);
    assertEquals((await f.handler(req())).status, 200);
    assertEquals(f.sessions.size, 1);
  },
);
Deno.test(
  "checkout never calls Stripe create when attempt persistence fails",
  async () => {
    const f = fixture();
    f.failSave();
    assertEquals((await f.handler(req())).status, 500);
    assertEquals(f.sessions.size, 0);
  },
);
Deno.test(
  "checkout refuses completed payment while webhook is pending",
  async () => {
    const f = fixture();
    await f.handler(req());
    f.sessions.get("cs_1")!.status = "complete";
    assertEquals((await f.handler(req())).status, 409);
    assertEquals(f.sessions.size, 1);
  },
);
Deno.test(
  "checkout refuses a paid session whose subscription is still live",
  async () => {
    const f = fixture();
    await f.handler(req());
    Object.assign(f.sessions.get("cs_1")!, {
      status: "complete",
      subscription: "sub_1",
    });
    assertEquals((await f.handler(req())).status, 409);
    assertEquals(f.sessions.size, 1);
  },
);
Deno.test(
  "checkout lets a customer subscribe again after cancellation",
  async () => {
    const f = fixture();
    await f.handler(req());
    Object.assign(f.sessions.get("cs_1")!, {
      status: "complete",
      subscription: "sub_1",
    });
    f.subscriptionStatus.set("sub_1", "canceled");
    const again = await f.handler(req());
    assertEquals(again.status, 200);
    assertEquals(f.sessions.size, 2);
    assertEquals(f.row().session_id, "cs_2");
  },
);
Deno.test(
  "checkout blocks incomplete, past due and paused subscriptions",
  async () => {
    for (const s of ["incomplete", "past_due", "paused"]) {
      const f = fixture();
      f.subscription(s);
      assertEquals((await f.handler(req())).status, 409);
      assertEquals(f.sessions.size, 0);
    }
  },
);
Deno.test("checkout creates a new attempt after expiration", async () => {
  const f = fixture();
  await f.handler(req());
  f.sessions.get("cs_1")!.status = "expired";
  assertEquals((await f.handler(req())).status, 200);
  assertEquals(f.sessions.size, 2);
});
Deno.test("checkout requires consent and an authenticated user", async () => {
  const f = fixture();
  assertEquals((await f.handler(req("pro", false))).status, 400);
  const handler = createCheckoutHandler({
    ...f.deps,
    requireUser: () => {
      throw new PublicError("unauthorized", 401);
    },
  });
  assertEquals((await handler(req())).status, 401);
  assertEquals(f.sessions.size, 0);
});
