// Reconciles the user's subscription row with Stripe (called after checkout).
// The webhook remains the primary writer; both use the same mapping (syncArgs)
// so they can never disagree on plan or status.
import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { errorResponse, jsonResponse, preflight } from "../_shared/http.ts";
import { createStripe, findCustomerId, pickRelevantSubscription, syncSubscriptionRow } from "../_shared/stripe.ts";

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

    const { args, skipped } = await syncSubscriptionRow(supabase, user.id, sub);
    if (skipped) {
      const { data: row } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      const plan = row?.status === "active" ? (row.plan ?? "free") : "free";
      return jsonResponse(req, { subscribed: plan !== "free", plan, subscription_end: row?.current_period_end ?? null });
    }

    return jsonResponse(req, {
      subscribed: args.p_plan !== "free",
      plan: args.p_plan,
      subscription_end: args.p_current_period_end,
    });
  } catch (error) {
    return errorResponse(req, error, "check-subscription");
  }
});
