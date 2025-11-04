-- Create subscription_plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'elite', 'sensei');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to auto-create free subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$;

-- Trigger to create subscription when user signs up
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION public.has_feature_access(_user_id UUID, _feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
BEGIN
  SELECT plan INTO user_plan
  FROM public.subscriptions
  WHERE user_id = _user_id AND status = 'active';
  
  -- Free plan features
  IF user_plan = 'free' THEN
    RETURN _feature IN ('basic_training', 'hydration_log', 'limited_scan');
  END IF;
  
  -- Pro plan features
  IF user_plan = 'pro' THEN
    RETURN _feature NOT IN ('ai_videos', 'advanced_recovery', 'priority_support', 'multi_athletes');
  END IF;
  
  -- Elite plan features
  IF user_plan = 'elite' THEN
    RETURN _feature NOT IN ('multi_athletes', 'collective_tracking', 'pdf_export');
  END IF;
  
  -- Sensei plan has all features
  IF user_plan = 'sensei' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;