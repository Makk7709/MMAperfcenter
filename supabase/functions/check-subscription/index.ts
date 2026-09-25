// Reconciles the user's subscription row with Stripe (called after checkout).
// The webhook remains the primary writer; both use the same mapping (syncArgs)
// so they can never disagree on plan or status.
import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { errorResponse, jsonResponse, preflight } from "../_shared/http.ts";
import { createStripe, findCustomerId, pickRelevantSubscription, syncArgs } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const user = await requireUser(supabase, req);
    const stripe = createStripe();

    const customerId = await findCustomerId(supabase, stripe, user);
    if (!customerId) return jsonResponse(req, { subscribed: false, plan: "free" });

    const { data: subs } = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    const sub = pickRelevantSubscription(subs);
    if (!sub) return jsonResponse(req, { subscribed: false, plan: "free" });

    const args = syncArgs(user.id, sub);
    const { error } = await supabase.rpc("sync_stripe_subscription", args);
    if (error) throw new Error(`sync_stripe_subscription failed: ${error.message}`);

    return jsonResponse(req, {
      subscribed: args.p_plan !== "free",
      plan: args.p_plan,
      subscription_end: args.p_current_period_end,
    });
  } catch (error) {
    return errorResponse(req, error, "check-subscription");
  }
});
