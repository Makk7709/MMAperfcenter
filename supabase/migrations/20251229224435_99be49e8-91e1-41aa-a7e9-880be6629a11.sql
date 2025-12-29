-- =============================================
-- SUBSCRIPTION SYSTEM HARDENING - PRODUCTION READY
-- =============================================

-- 1. Add unique constraints to prevent data corruption
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Allow multiple subscriptions per user over time but only one active stripe subscription
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_unique 
ON public.subscriptions (stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
ON public.subscriptions (stripe_customer_id);

-- 3. Create a webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook events (no user access needed)
-- No policies = no access for users, only service role

-- 4. Create SECURITY DEFINER function for safe subscription sync
-- This avoids giving SERVICE_ROLE access to edge functions
CREATE OR REPLACE FUNCTION public.sync_stripe_subscription(
  p_user_id UUID,
  p_plan subscription_plan,
  p_status TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_price_id TEXT,
  p_current_period_start TIMESTAMP WITH TIME ZONE,
  p_current_period_end TIMESTAMP WITH TIME ZONE,
  p_cancel_at_period_end BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert subscription record
  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    updated_at
  )
  VALUES (
    p_user_id,
    p_plan,
    p_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_price_id,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_price_id = EXCLUDED.stripe_price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now();
END;
$$;

-- 5. Create function to check if webhook was already processed (idempotency)
CREATE OR REPLACE FUNCTION public.is_webhook_processed(p_event_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.stripe_webhook_events 
    WHERE stripe_event_id = p_event_id
  );
END;
$$;

-- 6. Create function to mark webhook as processed
CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.stripe_webhook_events (stripe_event_id, event_type, payload)
  VALUES (p_event_id, p_event_type, p_payload)
  ON CONFLICT (stripe_event_id) DO NOTHING;
END;
$$;

-- 7. Create function to get user by stripe customer id
CREATE OR REPLACE FUNCTION public.get_user_id_by_stripe_customer(p_stripe_customer_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.subscriptions
  WHERE stripe_customer_id = p_stripe_customer_id
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;

-- 8. Create function to check subscription access with proper logic
CREATE OR REPLACE FUNCTION public.check_subscription_access(p_user_id UUID)
RETURNS TABLE(
  has_access BOOLEAN,
  plan subscription_plan,
  status TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  SELECT s.plan, s.status, s.current_period_end, s.cancel_at_period_end
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
  
  -- No subscription found = free tier
  IF v_sub IS NULL THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 
      'free'::subscription_plan, 
      'active'::TEXT, 
      NULL::TIMESTAMP WITH TIME ZONE, 
      FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Access decision logic:
  -- 1. active = full access
  -- 2. trialing = full access (if we support trials)
  -- 3. past_due = grace period access (continue until period end)
  -- 4. canceled with cancel_at_period_end = access until period end
  -- 5. canceled/unpaid/incomplete = no premium access
  
  RETURN QUERY SELECT 
    CASE 
      -- Active subscription = access
      WHEN v_sub.status = 'active' THEN TRUE
      -- Trialing = access
      WHEN v_sub.status = 'trialing' THEN TRUE
      -- Past due but period not ended = grace period
      WHEN v_sub.status = 'past_due' AND v_sub.current_period_end > now() THEN TRUE
      -- Canceled but period not ended = access until end
      WHEN v_sub.status IN ('canceled', 'active') 
           AND v_sub.cancel_at_period_end = TRUE 
           AND v_sub.current_period_end > now() THEN TRUE
      -- Everything else = no premium access (fallback to free)
      ELSE FALSE
    END,
    CASE 
      WHEN v_sub.status IN ('active', 'trialing') THEN v_sub.plan
      WHEN v_sub.status = 'past_due' AND v_sub.current_period_end > now() THEN v_sub.plan
      WHEN v_sub.cancel_at_period_end = TRUE AND v_sub.current_period_end > now() THEN v_sub.plan
      ELSE 'free'::subscription_plan
    END,
    v_sub.status,
    v_sub.current_period_end,
    v_sub.cancel_at_period_end;
END;
$$;

-- 9. Add current_period_start column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions' 
    AND column_name = 'current_period_start'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;