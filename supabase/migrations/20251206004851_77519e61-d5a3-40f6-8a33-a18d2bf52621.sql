-- Table pour tracker l'usage mensuel des fonctionnalités limitées
CREATE TABLE public.feature_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  month DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_name, month)
);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
ON public.feature_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert their own usage"
ON public.feature_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update their own usage"
ON public.feature_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_feature_usage_user_month ON public.feature_usage(user_id, month);
CREATE INDEX idx_feature_usage_feature ON public.feature_usage(feature_name);

-- Trigger pour updated_at
CREATE TRIGGER update_feature_usage_updated_at
BEFORE UPDATE ON public.feature_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour incrémenter l'usage d'une fonctionnalité
CREATE OR REPLACE FUNCTION public.increment_feature_usage(
  _user_id UUID,
  _feature_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  current_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
  -- Insert or update the usage count
  INSERT INTO feature_usage (user_id, feature_name, usage_count, month)
  VALUES (_user_id, _feature_name, 1, current_month)
  ON CONFLICT (user_id, feature_name, month)
  DO UPDATE SET 
    usage_count = feature_usage.usage_count + 1,
    updated_at = now()
  RETURNING usage_count INTO current_count;
  
  RETURN current_count;
END;
$$;

-- Fonction pour obtenir l'usage actuel d'une fonctionnalité
CREATE OR REPLACE FUNCTION public.get_feature_usage(
  _user_id UUID,
  _feature_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  current_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
  SELECT COALESCE(usage_count, 0) INTO current_count
  FROM feature_usage
  WHERE user_id = _user_id 
    AND feature_name = _feature_name 
    AND month = current_month;
  
  RETURN COALESCE(current_count, 0);
END;
$$;

-- Mise à jour de la fonction has_feature_access avec les nouvelles règles
CREATE OR REPLACE FUNCTION public.has_feature_access(_user_id UUID, _feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
  current_usage INTEGER;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan
  FROM public.subscriptions
  WHERE user_id = _user_id AND status = 'active';
  
  -- Default to free if no subscription
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- SENSEI: Accès à tout
  IF user_plan = 'sensei' THEN
    RETURN TRUE;
  END IF;
  
  -- Fonctionnalités exclusives SENSEI
  IF _feature IN ('multi_athletes', 'team_dashboard', 'collective_tracking', 'pdf_export') THEN
    RETURN user_plan = 'sensei';
  END IF;
  
  -- ELITE: Tout sauf les exclusivités Sensei
  IF user_plan = 'elite' THEN
    RETURN TRUE;
  END IF;
  
  -- Fonctionnalités ELITE+
  IF _feature IN ('ai_videos', 'advanced_recovery', 'advanced_nutrition', 'priority_support') THEN
    RETURN user_plan IN ('elite', 'sensei');
  END IF;
  
  -- PRO: Fonctionnalités illimitées sauf Elite/Sensei
  IF user_plan = 'pro' THEN
    RETURN TRUE;
  END IF;
  
  -- Fonctionnalités PRO+
  IF _feature IN ('unlimited_ai', 'full_macros', 'full_journal', 'unlimited_scan') THEN
    RETURN user_plan IN ('pro', 'elite', 'sensei');
  END IF;
  
  -- FREE: Fonctionnalités de base avec limites
  IF _feature IN ('basic_training', 'hydration_log', 'basic_stats') THEN
    RETURN TRUE;
  END IF;
  
  -- Fonctionnalités limitées pour FREE
  IF _feature IN ('ai_coach', 'barcode_scan', 'sparring_analysis') THEN
    -- Check usage limit (3/month for free)
    SELECT COALESCE(get_feature_usage(_user_id, _feature), 0) INTO current_usage;
    RETURN current_usage < 3;
  END IF;
  
  -- Default: no access
  RETURN FALSE;
END;
$$;

-- Fonction pour obtenir les limites d'une fonctionnalité selon le plan
CREATE OR REPLACE FUNCTION public.get_feature_limit(_plan subscription_plan, _feature TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limites pour les fonctionnalités comptées
  IF _feature IN ('ai_coach', 'barcode_scan', 'sparring_analysis') THEN
    CASE _plan
      WHEN 'free' THEN RETURN 3;
      WHEN 'pro' THEN RETURN -1; -- illimité
      WHEN 'elite' THEN RETURN -1;
      WHEN 'sensei' THEN RETURN -1;
      ELSE RETURN 0;
    END CASE;
  END IF;
  
  -- Par défaut: pas de limite (-1 = illimité)
  RETURN -1;
END;
$$;