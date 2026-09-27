import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createSparringHandler } from "../../supabase/functions/analyze-sparring/handler.ts";
import { PublicError } from "../../supabase/functions/_shared/http.ts";

type Deps = NonNullable<Parameters<typeof createSparringHandler>[0]>;
const valid = {
  frames: [0, 1, 2].map((timestamp) => ({ base64: "YWJj", timestamp })),
  totalDuration: 30,
  qualityMode: "pro",
};
function fixture(overrides: Partial<Deps> = {}) {
  let consumed = 0,
    refunded = 0,
    mode = "";
  const deps = {
    createServiceClient: () => ({}),
    requireUser: async () => ({ id: "user" }),
    consumeQuota: async () => {
      consumed++;
      return { counted: true, userId: "user", feature: "sparring_analysis" };
    },
    refundQuota: async () => {
      refunded++;
    },
    runAnalysis: async (input: { qualityMode: string }) => {
      mode = input.qualityMode;
      return { summary: "Analyse test" };
    },
    ...overrides,
  } as Deps;
  const handler = createSparringHandler(deps);
  return {
    run: (body: unknown) =>
      handler(
        new Request("https://edge.test/analyze", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      ),
    stats: () => ({ consumed, refunded, mode }),
  };
}
Deno.test(
  "sparring production validation rejects malformed frames and durations before quota",
  async () => {
    for (const body of [
      {},
      { ...valid, frames: [] },
      { ...valid, totalDuration: -1 },
      { ...valid, frames: [{ base64: "!" }, ...valid.frames] },
    ]) {
      const f = fixture();
      assertEquals((await f.run(body)).status, 400);
      assertEquals(f.stats().consumed, 0);
    }
  },
);
Deno.test("sparring production handler requires authentication", async () => {
  const f = fixture({
    requireUser: () => {
      throw new PublicError("auth", 401);
    },
  });
  assertEquals((await f.run(valid)).status, 401);
  assertEquals(f.stats().consumed, 0);
});
Deno.test(
  "sparring paid model cannot be forced by a metered client",
  async () => {
    const f = fixture();
    assertEquals((await f.run(valid)).status, 200);
    assertEquals(f.stats(), { consumed: 1, refunded: 0, mode: "fast" });
  },
);
Deno.test("sparring refuses an exhausted quota before calling AI", async () => {
  const f = fixture({
    consumeQuota: () => {
      throw new PublicError("quota", 402);
    },
  });
  assertEquals((await f.run(valid)).status, 402);
  assertEquals(f.stats().mode, "");
});
Deno.test("sparring refunds a consumed quota after an AI failure", async () => {
  const f = fixture({
    runAnalysis: () => {
      throw new PublicError("upstream", 503);
    },
  });
  assertEquals((await f.run(valid)).status, 503);
  assertEquals(f.stats().refunded, 1);
});
