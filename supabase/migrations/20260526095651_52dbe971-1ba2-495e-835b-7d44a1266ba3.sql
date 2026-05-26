-- Empêche les utilisateurs de bypasser les quotas en modifiant feature_usage manuellement
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.feature_usage;
-- SELECT policy conservée; INSERT/UPDATE désormais possibles uniquement via SECURITY DEFINER (increment_feature_usage)