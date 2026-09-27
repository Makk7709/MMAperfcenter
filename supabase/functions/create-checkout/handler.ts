import {
  createServiceClient,
  requireUser,
  type ServiceClient,
} from "../_shared/auth.ts";
import {
  appBaseUrl,
  errorResponse,
  jsonResponse,
  preflight,
  PublicError,
  readJsonBody,
} from "../_shared/http.ts";
import {
  checkoutPriceFor,
  createStripe,
  getOrCreateCustomerId,
  isPaidPlan,
  planFromPriceId,
  PLANS_ON_SALE,
  type Stripe,
  USER_ID_METADATA_KEY,
} from "../_shared/stripe.ts";

interface Attempt {
  request_id: string | null;
  params: Stripe.Checkout.SessionCreateParams | null;
  session_id: string | null;
}

const defaults = {
  createServiceClient,
  requireUser,
  createStripe,
  getOrCreateCustomerId,
  appBaseUrl,
  checkoutPriceFor,
  plansOnSale: PLANS_ON_SALE,
};

async function saveAttempt(
  db: ServiceClient,
  userId: string,
  token: string,
  attempt: Attempt,
) {
  const { data, error } = await db
    .from("checkout_attempts")
    .update(attempt)
    .eq("user_id", userId)
    .eq("lock_token", token)
    .select("user_id")
    .single();
  if (error || !data) throw new Error("Could not persist checkout attempt");
}

async function assertNoSubscription(stripe: Stripe, customer: string) {
  for await (const sub of stripe.subscriptions.list({
    customer,
    status: "all",
    limit: 100,
  })) {
    // Incomplete and paused subscriptions can still become payable.
    if (!["canceled", "incomplete_expired"].includes(sub.status)) {
      throw new PublicError(
        "Un abonnement existe déjà : utilise « Gérer mon abonnement ».",
        409,
      );
    }
  }
}

export function createCheckoutHandler(deps: typeof defaults = defaults) {
  return async (req: Request): Promise<Response> => {
    const pre = preflight(req);
    if (pre) return pre;
    let lock: { db: ServiceClient; userId: string; token: string } | undefined;
    try {
      const db = deps.createServiceClient();
      const user = await deps.requireUser(db, req);
      if (!user.email)
        throw new PublicError(
          "Un email vérifié est requis pour s'abonner",
          400,
        );
      const body = (await readJsonBody(req, 4096)) as {
        plan?: unknown;
        priceId?: unknown;
        withdrawalWaiver?: unknown;
      };
      const plan = isPaidPlan(body?.plan)
        ? body.plan
        : typeof body?.priceId === "string"
          ? planFromPriceId(body.priceId)
          : null;
      if (!plan) throw new PublicError("Offre inconnue", 400);
      if (!deps.plansOnSale.has(plan))
        throw new PublicError(
          "Cette offre n'est pas encore disponible.",
          409,
          "PLAN_NOT_ON_SALE",
        );
      if (body?.withdrawalWaiver !== true)
        throw new PublicError(
          "Confirmez la demande d'accès immédiat pour continuer.",
          400,
          "WITHDRAWAL_WAIVER_REQUIRED",
        );

      const token = crypto.randomUUID();
      const { data: acquired, error: lockError } = await db.rpc(
        "acquire_checkout_lock",
        { p_user_id: user.id, p_token: token },
      );
      if (lockError) throw new Error("Could not acquire checkout lock");
      if (!acquired)
        throw new PublicError(
          "Un paiement est en cours de préparation. Réessaie dans quelques instants.",
          409,
          "CHECKOUT_BUSY",
        );
      lock = { db, userId: user.id, token };

      const { data: current, error: currentError } = await db
        .from("subscriptions")
        .select("plan, status, stripe_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (currentError) throw new Error("Could not read subscription");
      if (
        current?.plan !== "free" &&
        current?.status === "active" &&
        current?.stripe_subscription_id
      ) {
        throw new PublicError(
          "Tu as déjà un abonnement actif : utilise « Gérer mon abonnement ».",
          409,
        );
      }

      const stripe = deps.createStripe();
      const customer = await deps.getOrCreateCustomerId(db, stripe, user);
      await assertNoSubscription(stripe, customer);
      const { data: stored, error: readError } = await db
        .from("checkout_attempts")
        .select("request_id, params, session_id")
        .eq("user_id", user.id)
        .single();
      if (readError || !stored)
        throw new Error("Could not read checkout attempt");
      let attempt = stored as Attempt;
      let session: Stripe.Checkout.Session | null = null;

      if (attempt.session_id) {
        session = await stripe.checkout.sessions.retrieve(attempt.session_id);
      } else if (
        attempt.params &&
        (attempt.params.expires_at ?? 0) > Date.now() / 1000
      ) {
        // Recover an uncertain response with the identical payload and key.
        session = await stripe.checkout.sessions.create(attempt.params, {
          idempotencyKey: `checkout-${attempt.request_id}`,
        });
        attempt = { ...attempt, session_id: session.id };
        await saveAttempt(db, user.id, token, attempt);
      }
      if (session?.status === "complete") {
        // The attempt row outlives the subscription it paid for.
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const ended =
          !!subId &&
          ["canceled", "incomplete_expired"].includes(
            (await stripe.subscriptions.retrieve(subId)).status,
          );
        if (!ended)
          throw new PublicError(
            "Paiement déjà envoyé. Patiente pendant la confirmation de ton abonnement.",
            409,
          );
        session = null;
        attempt = { request_id: null, params: null, session_id: null };
      }

      const price = deps.checkoutPriceFor(plan);
      const reusable =
        session?.status === "open" &&
        attempt.params?.line_items?.[0]?.price === price;
      // Close legacy sessions too. If payment wins the race, expiration fails
      // and no replacement is created; a retry will see the subscription.
      for await (const open of stripe.checkout.sessions.list({
        customer,
        status: "open",
        limit: 100,
      })) {
        if (
          open.mode === "subscription" &&
          (!reusable || open.id !== session?.id)
        ) {
          await stripe.checkout.sessions.expire(open.id);
        }
      }
      if (session?.status === "open" && !reusable) {
        const previous = await stripe.checkout.sessions.retrieve(session.id);
        if (previous.status === "open")
          await stripe.checkout.sessions.expire(previous.id);
        else if (previous.status === "complete")
          throw new PublicError(
            "Un paiement vient d'être confirmé. Patiente quelques instants.",
            409,
          );
      }
      await assertNoSubscription(stripe, customer);
      if (reusable) {
        if (!session?.url) throw new Error("Stripe returned no checkout URL");
        return jsonResponse(req, { url: session.url });
      }

      const requestId = crypto.randomUUID();
      const waiverAt = new Date().toISOString();
      const baseUrl = deps.appBaseUrl(req);
      const params: Stripe.Checkout.SessionCreateParams = {
        customer,
        client_reference_id: user.id,
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        // Shorter than Stripe's minimum idempotency retention (24 h).
        expires_at: Math.floor(Date.now() / 1000) + 23 * 60 * 60,
        subscription_data: {
          metadata: {
            [USER_ID_METADATA_KEY]: user.id,
            withdrawal_waiver_at: waiverAt,
          },
        },
        metadata: {
          [USER_ID_METADATA_KEY]: user.id,
          withdrawal_waiver_at: waiverAt,
        },
        success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
      };
      attempt = { request_id: requestId, params, session_id: null };
      // Persist before Stripe: a crash must not create a second key.
      await saveAttempt(db, user.id, token, attempt);
      session = await stripe.checkout.sessions.create(params, {
        idempotencyKey: `checkout-${requestId}`,
      });
      await saveAttempt(db, user.id, token, {
        ...attempt,
        session_id: session.id,
      });
      if (!session.url) throw new Error("Stripe returned no checkout URL");
      return jsonResponse(req, { url: session.url });
    } catch (error) {
      return errorResponse(req, error, "create-checkout");
    } finally {
      if (lock) {
        try {
          const { error } = await lock.db.rpc("release_checkout_lock", {
            p_user_id: lock.userId,
            p_token: lock.token,
          });
          if (error)
            console.error("Could not release checkout lock", error.message);
        } catch {
          console.error("Could not release checkout lock");
        }
      }
    }
  };
}
