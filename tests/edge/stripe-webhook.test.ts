import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createWebhookHandler } from "../../supabase/functions/stripe-webhook/handler.ts";
import { Stripe } from "../../supabase/functions/_shared/stripe.ts";
const secret = "whsec_offline_test";
const real = new Stripe("sk_test_offline", { apiVersion: "2025-08-27.basil" });
function fixture() {
  const seen = new Set<string>();
  const calls: string[] = [];
  const sub = {
    id: "sub_test",
    customer: "cus_test",
    status: "active",
    metadata: { supabase_user_id: "user" },
    items: {
      data: [
        {
          price: { id: "price_1SQSL1DLrTr0qdOpfIx50iSu" },
          current_period_start: 1,
          current_period_end: 100,
        },
      ],
    },
  };
  const db = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push(name);
      if (name === "mark_webhook_processed") seen.add(String(args.p_event_id));
      return {
        data:
          name === "is_webhook_processed"
            ? seen.has(String(args.p_event_id))
            : null,
        error: null,
      };
    },
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: "user" } },
          error: null,
        }),
      },
    },
  };
  type Deps = NonNullable<Parameters<typeof createWebhookHandler>[0]>;
  const handler = createWebhookHandler({
    createServiceClient: () => db,
    createStripe: () => ({
      webhooks: real.webhooks,
      subscriptions: { retrieve: async () => sub },
    }),
  } as unknown as Deps);
  return { calls, handler };
}
async function request(id = "evt_test", valid = true) {
  const payload = JSON.stringify({
    id,
    type: "customer.subscription.updated",
    livemode: false,
    data: { object: { id: "sub_test" } },
  });
  const signature = await real.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: valid ? secret : "wrong",
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
  return new Request("https://edge.test/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}
async function withSecrets(run: () => Promise<void>) {
  const keys = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  const old = keys.map((k) => Deno.env.get(k));
  Deno.env.set(keys[0], "sk_test_offline");
  Deno.env.set(keys[1], secret);
  try {
    await run();
  } finally {
    keys.forEach((k, i) =>
      old[i] === undefined ? Deno.env.delete(k) : Deno.env.set(k, old[i]!),
    );
  }
}
Deno.test(
  "production webhook rejects a real HMAC signed with another secret",
  () =>
    withSecrets(async () => {
      const f = fixture();
      assertEquals(
        (await f.handler(await request("evt_bad", false))).status,
        400,
      );
      assertEquals(f.calls, []);
    }),
);
Deno.test(
  "production webhook syncs signed events and deduplicates replay",
  () =>
    withSecrets(async () => {
      const f = fixture();
      assertEquals((await f.handler(await request())).status, 200);
      assertEquals((await f.handler(await request())).status, 200);
      assertEquals(
        f.calls.filter((c) => c === "sync_stripe_subscription").length,
        1,
      );
      assertEquals(
        f.calls.filter((c) => c === "mark_webhook_processed").length,
        1,
      );
    }),
);
Deno.test(
  "production webhook rejects an absent signature and wrong method",
  () =>
    withSecrets(async () => {
      const f = fixture();
      assertEquals(
        (await f.handler(new Request("https://edge.test", { method: "POST" })))
          .status,
        400,
      );
      assertEquals(
        (await f.handler(new Request("https://edge.test"))).status,
        405,
      );
    }),
);
