// ============================================================================
// Stripe webhook receiver
// ----------------------------------------------------------------------------
// - Verifies the Stripe signature (HMAC SHA-256 with STRIPE_WEBHOOK_SECRET).
// - Idempotency via the `stripe_webhook_events` table (RPC: is_webhook_processed
//   / mark_webhook_processed).
// - Synchronises the `subscriptions` table via the `sync_stripe_subscription`
//   RPC for the events that change subscription state:
//     * checkout.session.completed
//     * customer.subscription.created
//     * customer.subscription.updated
//     * customer.subscription.deleted
//
// Security:
//   - JWT verification is disabled for this function (Stripe authenticates via
//     signature). See supabase/config.toml.
//   - The user is resolved from ids we set ourselves at checkout
//     (client_reference_id / metadata), never from a user-editable field.
// ============================================================================

import { createServiceClient, type ServiceClient } from "../_shared/auth.ts";
import { errorMessage } from "../_shared/errors.ts";
import { createStripe, Stripe, syncSubscriptionRow, USER_ID_METADATA_KEY } from "../_shared/stripe.ts";

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret || !Deno.env.get("STRIPE_SECRET_KEY")) {
    log("Missing secrets");
    return json({ error: "Webhook not configured" }, 500);
  }
  const stripe = createStripe();

  // ---- Signature verification ---------------------------------------------
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing signature" }, 400);

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    log("Signature verification failed", { error: errorMessage(err) });
    return json({ error: "Invalid signature" }, 400);
  }

  log("Event received", { id: event.id, type: event.type });
  const supabase = createServiceClient();

  // ---- Idempotence check ---------------------------------------------------
  const { data: already, error: idemErr } = await supabase.rpc("is_webhook_processed", { p_event_id: event.id });
  if (idemErr) log("is_webhook_processed RPC error (continuing)", { error: idemErr.message });
  if (already === true) return json({ received: true, duplicate: true }, 200);

  // ---- Event routing -------------------------------------------------------
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(supabase, stripe, sub, session.client_reference_id);
        } else {
          log("checkout.session.completed without subscription", { sessionId: session.id });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Events can arrive out of order: always sync the current state.
        const { id } = event.data.object as Stripe.Subscription;
        await syncSubscription(supabase, stripe, await stripe.subscriptions.retrieve(id), null);
        break;
      }

      default:
        log("Event type not handled", { type: event.type });
        break;
    }

    const { error: markErr } = await supabase.rpc("mark_webhook_processed", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload: event as unknown as Record<string, unknown>,
    });
    if (markErr) log("mark_webhook_processed RPC error", { error: markErr.message });

    return json({ received: true }, 200);
  } catch (err) {
    log("Handler error", { error: errorMessage(err) });
    // Return 500 so Stripe retries — the idempotence guard will deduplicate.
    return json({ error: "Handler failure" }, 500);
  }
});

// ============================================================================
// Helpers
// ============================================================================

async function resolveUserId(
  supabase: ServiceClient,
  stripe: Stripe,
  sub: Stripe.Subscription,
  clientReferenceId: string | null,
): Promise<string | null> {
  const fromMetadata = sub.metadata?.[USER_ID_METADATA_KEY];
  if (fromMetadata) return fromMetadata;
  if (clientReferenceId) return clientReferenceId;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data: viaRow, error } = await supabase.rpc("get_user_id_by_stripe_customer", {
    p_stripe_customer_id: customerId,
  });
  if (!error && viaRow) return viaRow as string;

  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted) {
    const fromCustomer = customer.metadata?.[USER_ID_METADATA_KEY];
    if (fromCustomer) return fromCustomer;
  }
  return null;
}

async function syncSubscription(
  supabase: ServiceClient,
  stripe: Stripe,
  sub: Stripe.Subscription,
  clientReferenceId: string | null,
): Promise<void> {
  const userId = await resolveUserId(supabase, stripe, sub, clientReferenceId);
  if (!userId) {
    // Throwing makes Stripe retry: the user may be linked later by
    // check-subscription, and the event must not be marked as processed.
    throw new Error(`Could not resolve user for subscription ${sub.id}`);
  }

  // A deleted account (delete-account cancels its subscription) has nothing
  // left to sync: acknowledge instead of letting Stripe retry for days.
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError?.status === 404 || (!authError && !authUser?.user)) {
    log("Subscription of a deleted user ignored", { userId, subscriptionId: sub.id });
    return;
  }
  if (authError) throw new Error(`getUserById failed: ${authError.message}`);

  const { skipped } = await syncSubscriptionRow(supabase, userId, sub);
  log(skipped ? "Stale subscription ignored" : "Subscription synced", { userId, subscriptionId: sub.id, status: sub.status });
}
