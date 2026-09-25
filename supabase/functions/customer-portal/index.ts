import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { appBaseUrl, errorResponse, jsonResponse, preflight, PublicError } from "../_shared/http.ts";
import { createStripe, findCustomerId } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const user = await requireUser(supabase, req);
    const stripe = createStripe();

    const customerId = await findCustomerId(supabase, stripe, user);
    if (!customerId) throw new PublicError("Aucun abonnement Stripe associé à ce compte", 404);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appBaseUrl(req)}/pricing`,
    });

    return jsonResponse(req, { url: portalSession.url });
  } catch (error) {
    return errorResponse(req, error, "customer-portal");
  }
});
