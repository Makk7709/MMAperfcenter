import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { appBaseUrl, errorResponse, jsonResponse, preflight, PublicError, readJsonBody } from "../_shared/http.ts";
import { CHECKOUT_PRICE_TO_PLAN, createStripe, getOrCreateCustomerId, USER_ID_METADATA_KEY } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const user = await requireUser(supabase, req);
    if (!user.email) throw new PublicError("Un email vérifié est requis pour s'abonner", 400);

    const { priceId } = (await readJsonBody(req, 4 * 1024)) as { priceId?: unknown };
    if (typeof priceId !== "string" || !CHECKOUT_PRICE_TO_PLAN[priceId]) {
      throw new PublicError("Offre inconnue", 400);
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: { metadata: { [USER_ID_METADATA_KEY]: user.id } },
      metadata: { [USER_ID_METADATA_KEY]: user.id },
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
    });

    return jsonResponse(req, { url: session.url });
  } catch (error) {
    return errorResponse(req, error, "create-checkout");
  }
});
