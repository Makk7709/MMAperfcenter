-- ============================================================================
-- Stripe webhook idempotence + subscription sync helpers.
--
-- Context:
--   The TypeScript types generated from the live database expose a table named
--   `stripe_webhook_events` and a set of webhook-related RPCs that did not yet
--   have a versioned migration. This file makes the schema authoritative for
--   transmission/audit and creates the contract used by the new
--   `stripe-webhook` Edge Function.
--
--   All statements are idempotent so they can be safely re-applied on an
--   environment where the table already exists (`IF NOT EXISTS` + `CREATE OR
--   REPLACE`).
-- ============================================================================

-- ---- 1. Idempotence table for Stripe webhooks ------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id  text        UNIQUE NOT NULL,
  event_type       text        NOT NULL,
  payload          jsonb,
  processed_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_event_type_idx
  ON public.stripe_webhook_events (event_type);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No application policies: only the service role (Edge Function) should
-- read/write this table.

-- ---- 2. Idempotence helpers -------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_webhook_processed(p_event_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stripe_webhook_events WHERE stripe_event_id = p_event_id
  );
$$;

CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  p_event_id   text,
  p_event_type text,
  p_payload    jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.stripe_webhook_events (stripe_event_id, event_type, payload)
  VALUES (p_event_id, p_event_type, p_payload)
  ON CONFLICT (stripe_event_id) DO NOTHING;
$$;

-- ---- 3. Stripe customer → app user resolution ------------------------------
CREATE OR REPLACE FUNCTION public.get_user_id_by_stripe_customer(
  p_stripe_customer_id text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.subscriptions
  WHERE stripe_customer_id = p_stripe_customer_id
  LIMIT 1;
$$;

-- ---- 4. Authoritative subscription sync from a webhook payload --------------
CREATE OR REPLACE FUNCTION public.sync_stripe_subscription(
  p_user_id                uuid,
  p_stripe_customer_id     text,
  p_stripe_subscription_id text,
  p_stripe_price_id        text,
  p_plan                   public.subscription_plan,
  p_status                 text,
  p_current_period_start   timestamptz,
  p_current_period_end     timestamptz,
  p_cancel_at_period_end   boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Subscription rows are created by the handle_new_user_subscription trigger
  -- at signup; we update in place.
  UPDATE public.subscriptions
  SET
    plan                    = p_plan,
    status                  = p_status,
    stripe_customer_id      = p_stripe_customer_id,
    stripe_subscription_id  = p_stripe_subscription_id,
    stripe_price_id         = p_stripe_price_id,
    current_period_start    = p_current_period_start,
    current_period_end      = p_current_period_end,
    cancel_at_period_end    = p_cancel_at_period_end,
    updated_at              = now()
  WHERE user_id = p_user_id;

  -- Defensive insert if no row existed yet (e.g. legacy users).
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      user_id, plan, status,
      stripe_customer_id, stripe_subscription_id, stripe_price_id,
      current_period_start, current_period_end, cancel_at_period_end
    )
    VALUES (
      p_user_id, p_plan, p_status,
      p_stripe_customer_id, p_stripe_subscription_id, p_stripe_price_id,
      p_current_period_start, p_current_period_end, p_cancel_at_period_end
    );
  END IF;
END;
$$;

-- ---- 5. Lightweight access check (consumed by the front-end if needed) ------
CREATE OR REPLACE FUNCTION public.check_subscription_access(p_user_id uuid)
RETURNS TABLE (
  has_access           boolean,
  plan                 public.subscription_plan,
  status               text,
  current_period_end   timestamptz,
  cancel_at_period_end boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > now())) AS has_access,
    s.plan,
    s.status,
    s.current_period_end,
    COALESCE(s.cancel_at_period_end, false)
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;
$$;
