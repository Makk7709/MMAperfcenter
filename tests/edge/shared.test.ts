// Tests des modules partagés réels (catalogue Stripe, lecture du corps, modèles IA).

import { assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkoutPriceFor, isPaidPlan, planFromPriceId, planFromSubscription, type Stripe } from "../../supabase/functions/_shared/stripe.ts";
import { readJsonBody, readTextBody } from "../../supabase/functions/_shared/http.ts";
import { aiModel } from "../../supabase/functions/_shared/ai-gateway.ts";
import { sessionSignInMs } from "../../supabase/functions/_shared/session.ts";

const STRIPE_ENV = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_PRO", "STRIPE_PRICE_ELITE", "STRIPE_PRICE_SENSEI",
  "STRIPE_PRODUCT_PRO", "STRIPE_PRODUCT_ELITE", "STRIPE_PRODUCT_SENSEI",
];

function withEnv(values: Record<string, string>, run: () => void | Promise<void>) {
  return async () => {
    const saved = new Map(STRIPE_ENV.concat("AI_MODEL_FAST", "AI_MODEL_PRO").map((k) => [k, Deno.env.get(k)]));
    for (const key of saved.keys()) Deno.env.delete(key);
    for (const [key, value] of Object.entries(values)) Deno.env.set(key, value);
    try {
      await run();
    } finally {
      for (const [key, value] of saved) value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value);
    }
  };
}

function subscription(productId: string, priceId: string): Stripe.Subscription {
  return {
    id: "sub_test",
    items: { data: [{ price: { id: priceId, product: productId } }] },
  } as unknown as Stripe.Subscription;
}

Deno.test("stripe: test key uses the test catalogue", withEnv({ STRIPE_SECRET_KEY: "sk_test_x" }, () => {
  assertEquals(checkoutPriceFor("pro"), "price_1SQSL1DLrTr0qdOpfIx50iSu");
  assertEquals(planFromPriceId("price_1SQSLMDLrTr0qdOpffTBpoJL"), "elite");
  assertEquals(planFromPriceId("price_unknown"), null);
}));

Deno.test("stripe: live key without live IDs is a configuration error", withEnv({ STRIPE_SECRET_KEY: "sk_live_x" }, () => {
  assertThrows(() => checkoutPriceFor("pro"), Error, "STRIPE_PRICE_PRO");
}));

Deno.test("stripe: a restricted live key is live too", withEnv({ STRIPE_SECRET_KEY: "rk_live_x" }, () => {
  assertThrows(() => checkoutPriceFor("pro"), Error, "required with a live Stripe key");
}));

Deno.test("stripe: plans not on sale need no live product", withEnv({
  STRIPE_SECRET_KEY: "sk_live_x", STRIPE_PRICE_PRO: "price_live_pro", STRIPE_PRODUCT_PRO: "prod_live_pro",
}, () => {
  assertEquals(planFromSubscription(subscription("prod_live_pro", "price_live_pro")), "pro");
  assertThrows(() => checkoutPriceFor("elite"), Error, "STRIPE_PRICE_ELITE is not set");
  assertThrows(() => planFromSubscription(subscription("prod_other", "price_other")), Error, "Unknown Stripe product");
}));

Deno.test("stripe: live IDs come from the secrets", withEnv({
  STRIPE_SECRET_KEY: "sk_live_x",
  STRIPE_PRICE_PRO: "price_live_pro", STRIPE_PRICE_ELITE: "price_live_elite", STRIPE_PRICE_SENSEI: "price_live_sensei",
  STRIPE_PRODUCT_PRO: "prod_live_pro", STRIPE_PRODUCT_ELITE: "prod_live_elite", STRIPE_PRODUCT_SENSEI: "prod_live_sensei",
}, () => {
  assertEquals(checkoutPriceFor("sensei"), "price_live_sensei");
  assertEquals(planFromSubscription(subscription("prod_live_elite", "price_other")), "elite");
  assertEquals(planFromPriceId("price_1SQSL1DLrTr0qdOpfIx50iSu"), null);
}));

Deno.test("stripe: an unknown product never maps a paying customer to free", withEnv({ STRIPE_SECRET_KEY: "sk_test_x" }, () => {
  assertThrows(() => planFromSubscription(subscription("prod_unknown", "price_unknown")), Error, "Unknown Stripe product");
}));

Deno.test("stripe: only paid plans are accepted at checkout", () => {
  assertEquals(isPaidPlan("pro"), true);
  assertEquals(isPaidPlan("free"), false);
  assertEquals(isPaidPlan("PRO"), false);
  assertEquals(isPaidPlan(undefined), false);
});

Deno.test("http: readTextBody returns the body under the limit", async () => {
  const req = new Request("http://x", { method: "POST", body: "héllo" });
  assertEquals(await readTextBody(req, 100), "héllo");
});

Deno.test("http: readTextBody rejects an oversized streamed body", async () => {
  const req = new Request("http://x", { method: "POST", body: "x".repeat(2048) });
  await assertRejects(() => readTextBody(req, 1024));
});

Deno.test("http: readJsonBody rejects invalid JSON", async () => {
  const req = new Request("http://x", { method: "POST", body: "{nope" });
  await assertRejects(() => readJsonBody(req, 1024));
});

Deno.test("ai: model names default and can be overridden", withEnv({}, () => {
  assertEquals(aiModel("fast"), "google/gemini-2.5-flash");
  assertEquals(aiModel("pro"), "google/gemini-2.5-pro");
  Deno.env.set("AI_MODEL_FAST", "google/gemini-3-flash");
  assertEquals(aiModel("fast"), "google/gemini-3-flash");
}));

function bearer(claims: unknown): Request {
  const b64url = (v: unknown) => btoa(JSON.stringify(v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return new Request("http://x", { headers: { authorization: `Bearer ${b64url({ alg: "HS256" })}.${b64url(claims)}.sig` } });
}

Deno.test("session: sign-in time comes from the amr claim of this token", () => {
  const req = bearer({ sub: "u", amr: [{ method: "password", timestamp: 1_700_000_000 }, { method: "otp", timestamp: 1_700_000_500 }] });
  assertEquals(sessionSignInMs(req), 1_700_000_500_000);
});

Deno.test("session: no usable amr gives null (caller falls back)", () => {
  assertEquals(sessionSignInMs(bearer({ sub: "u" })), null);
  assertEquals(sessionSignInMs(new Request("http://x")), null);
  assertEquals(sessionSignInMs(new Request("http://x", { headers: { authorization: "Bearer not-a-jwt" } })), null);
});
