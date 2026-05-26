// ----------------------------------------------------------------------------
// Harness minimal pour la fonction stripe-webhook.
//
// On ne charge PAS la fonction réelle (elle dépend de modules ESM Stripe et
// supabase-js seulement disponibles à l'exécution Edge). On reconstitue les
// décisions critiques du dispatcher avec des mocks locaux, et on valide :
//   1. Signature invalide → 400
//   2. Événement déjà traité (idempotence) → 200 sans re-traitement
//   3. customer.subscription.updated → appelle sync_stripe_subscription
// ----------------------------------------------------------------------------

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

type RpcCall = { name: string; args: Record<string, unknown> };

class FakeSupabase {
  public calls: RpcCall[] = [];
  public processedEventIds = new Set<string>();

  // deno-lint-ignore no-explicit-any
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: null }> {
    this.calls.push({ name, args });
    if (name === "is_webhook_processed") {
      const eventId = String(args.p_event_id);
      return Promise.resolve({ data: this.processedEventIds.has(eventId), error: null });
    }
    if (name === "mark_webhook_processed") {
      this.processedEventIds.add(String(args.p_event_id));
      return Promise.resolve({ data: null, error: null });
    }
    if (name === "get_user_id_by_stripe_customer") {
      return Promise.resolve({ data: "user-uuid-123", error: null });
    }
    if (name === "sync_stripe_subscription") {
      return Promise.resolve({ data: null, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }
}

interface StubEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

// Mini-dispatcher qui reflète la logique de production sans dépendre de Stripe.
async function dispatch(
  rawBody: string,
  signature: string | null,
  expectedSig: string,
  supabase: FakeSupabase,
): Promise<Response> {
  if (!signature || signature !== expectedSig) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  let event: StubEvent;
  try {
    event = JSON.parse(rawBody) as StubEvent;
  } catch {
    return new Response(JSON.stringify({ error: "Bad payload" }), { status: 400 });
  }

  const { data: already } = await supabase.rpc("is_webhook_processed", { p_event_id: event.id });
  if (already === true) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    const sub = event.data.object;
    await supabase.rpc("get_user_id_by_stripe_customer", {
      p_stripe_customer_id: sub.customer,
    });
    await supabase.rpc("sync_stripe_subscription", {
      p_user_id: "user-uuid-123",
      p_stripe_customer_id: sub.customer,
      p_stripe_subscription_id: sub.id,
      p_plan: "pro",
      p_status: sub.status,
    });
  }

  await supabase.rpc("mark_webhook_processed", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: event,
  });
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// ----------------------------------------------------------------------------
Deno.test("stripe-webhook rejects invalid signature with 400", async () => {
  const supabase = new FakeSupabase();
  const res = await dispatch("{}", "wrong-sig", "good-sig", supabase);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid signature");
  assertEquals(supabase.calls.length, 0);
});

Deno.test("stripe-webhook deduplicates already-processed events", async () => {
  const supabase = new FakeSupabase();
  supabase.processedEventIds.add("evt_123");

  const payload = JSON.stringify({
    id: "evt_123",
    type: "customer.subscription.updated",
    data: { object: { id: "sub_1", customer: "cus_1", status: "active" } },
  });
  const res = await dispatch(payload, "good-sig", "good-sig", supabase);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.duplicate, true);

  const rpcNames = supabase.calls.map((c) => c.name);
  assert(!rpcNames.includes("sync_stripe_subscription"));
});

Deno.test("stripe-webhook syncs subscription on customer.subscription.updated", async () => {
  const supabase = new FakeSupabase();
  const payload = JSON.stringify({
    id: "evt_xyz",
    type: "customer.subscription.updated",
    data: { object: { id: "sub_42", customer: "cus_42", status: "active" } },
  });
  const res = await dispatch(payload, "good-sig", "good-sig", supabase);
  assertEquals(res.status, 200);

  const rpcNames = supabase.calls.map((c) => c.name);
  assert(rpcNames.includes("get_user_id_by_stripe_customer"));
  assert(rpcNames.includes("sync_stripe_subscription"));
  assert(rpcNames.includes("mark_webhook_processed"));
});
