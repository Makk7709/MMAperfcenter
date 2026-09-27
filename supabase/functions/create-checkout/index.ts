import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { appBaseUrl, errorResponse, jsonResponse, preflight, PublicError, readJsonBody } from "../_shared/http.ts";
import {
  checkoutPriceFor,
  createStripe,
  getOrCreateCustomerId,
  isPaidPlan,
  type PaidPlan,
  planFromPriceId,
  USER_ID_METADATA_KEY,
} from "../_shared/stripe.ts";

// Recorded on the Stripe session and subscription: proof that the customer
// asked for immediate access and waived the 14-day withdrawal period.
const WITHDRAWAL_WAIVER_KEY = "withdrawal_waiver_at";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const user = await requireUser(supabase, req);
    if (!user.email) throw new PublicError("Un email vérifié est requis pour s'abonner", 400);

    const body = (await readJsonBody(req, 4 * 1024)) as { plan?: unknown; priceId?: unknown; withdrawalWaiver?: unknown };
    // priceId: clients released before plan names were sent.
    const plan: PaidPlan | null = isPaidPlan(body?.plan)
      ? body.plan
      : typeof body?.priceId === "string" ? planFromPriceId(body.priceId) : null;
    if (!plan) throw new PublicError("Offre inconnue", 400);
    if (body?.withdrawalWaiver !== true) {
      throw new PublicError("Confirmez la demande d'accès immédiat pour continuer.", 400, "WITHDRAWAL_WAIVER_REQUIRED");
    }

    // A second checkout would create a second, parallel subscription.
    const { data: current } = await supabase
      .from("subscriptions")
      .select("plan, status, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (current?.plan !== "free" && current?.status === "active" && current?.stripe_subscription_id) {
      throw new PublicError("Tu as déjà un abonnement actif : change d'offre depuis « Gérer mon abonnement ».", 409);
    }

    const stripe = createStripe();
    const customerId = await getOrCreateCustomerId(supabase, stripe, user);
    const baseUrl = appBaseUrl(req);
    const waiverAt = new Date().toISOString();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: checkoutPriceFor(plan), quantity: 1 }],
      mode: "subscription",
      subscription_data: { metadata: { [USER_ID_METADATA_KEY]: user.id, [WITHDRAWAL_WAIVER_KEY]: waiverAt } },
      metadata: { [USER_ID_METADATA_KEY]: user.id, [WITHDRAWAL_WAIVER_KEY]: waiverAt },
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
    });

    return jsonResponse(req, { url: session.url });
  } catch (error) {
    return errorResponse(req, error, "create-checkout");
  }
});
