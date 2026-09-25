-- ============================================================================
-- Durcissement sécurité pré-lancement (audit du 2026-09-25)
--
-- 1. Les fonctions SECURITY DEFINER réservées au serveur ne sont plus
--    exécutables via l'API publique (anon / authenticated).
-- 2. Les fonctions de quota encore appelées par le front n'agissent plus que
--    sur l'utilisateur courant.
-- 3. Consommation de quota atomique (+ remboursement) pour les Edge Functions.
-- 4. Bucket des vidéos de sparring rendu privé.
-- 5. WITH CHECK sur les politiques UPDATE (empêche de réaffecter une ligne à
--    un autre utilisateur ou une autre meute).
--
-- Idempotent : peut être rejoué sans effet de bord.
-- ============================================================================

-- ---- 0. Appelant de confiance ----------------------------------------------
-- Vrai pour la clé service_role (Edge Functions) et pour les connexions
-- directes à la base (SQL editor, migrations), où aucun JWT n'est défini.
-- PostgREST pose toujours un JWT (rôle anon au minimum) : un client public
-- n'est donc jamais considéré comme de confiance.
CREATE OR REPLACE FUNCTION public.is_trusted_caller()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.jwt() IS NULL OR coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- ---- 1. Fonctions réservées au serveur -------------------------------------
-- Boucle sur pg_proc : couvre toutes les surcharges et ignore les fonctions
-- absentes de l'environnement (dérive de schéma entre projets).
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'sync_stripe_subscription',
        'mark_webhook_processed',
        'is_webhook_processed',
        'get_user_id_by_stripe_customer',
        'check_subscription_access',
        'create_notification',
        'increment_organization_usage',
        'reset_monthly_organization_quotas',
        'check_organization_quota'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END;
$$;

-- ---- 2. Fonctions de quota appelées par le front ---------------------------
-- get_feature_usage : lecture limitée à son propre compteur.
CREATE OR REPLACE FUNCTION public.get_feature_usage(_user_id uuid, _feature_name text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF NOT public.is_trusted_caller() AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT usage_count INTO current_count
  FROM public.feature_usage
  WHERE user_id = _user_id
    AND feature_name = _feature_name
    AND month = date_trunc('month', current_date)::date;

  RETURN coalesce(current_count, 0);
END;
$$;

-- increment_feature_usage : le front ne peut incrémenter que son propre
-- compteur, et uniquement pour les fonctionnalités sans coût serveur
-- (scan code-barres, exécuté côté client). Les fonctionnalités IA sont
-- décomptées exclusivement par consume_feature_quota.
CREATE OR REPLACE FUNCTION public.increment_feature_usage(_user_id uuid, _feature_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  IF NOT public.is_trusted_caller() THEN
    IF _user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF _feature_name <> 'barcode_scan' THEN
      RAISE EXCEPTION 'feature counted server-side' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.feature_usage (user_id, feature_name, usage_count, month)
  VALUES (_user_id, _feature_name, 1, date_trunc('month', current_date)::date)
  ON CONFLICT (user_id, feature_name, month)
  DO UPDATE SET usage_count = feature_usage.usage_count + 1, updated_at = now()
  RETURNING usage_count INTO current_count;

  RETURN current_count;
END;
$$;

-- ---- 3. Quota atomique pour les Edge Functions -----------------------------
-- Vérifie ET consomme en une seule instruction : l'UPDATE conditionnel sous
-- verrou de ligne empêche N requêtes parallèles de passer toutes le contrôle.
-- Retourne :
--   'counted'   : une unité a été consommée (à rembourser si l'appel échoue) ;
--   'unlimited' : accès sans décompte (admin, coach, plan illimité) ;
--   'denied'    : pas d'accès ou quota épuisé.
DROP FUNCTION IF EXISTS public.consume_feature_quota(uuid, text);
CREATE FUNCTION public.consume_feature_quota(_user_id uuid, _feature text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan  public.subscription_plan;
  v_limit integer;
  v_count integer;
BEGIN
  IF public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'coach') THEN
    RETURN 'unlimited';
  END IF;

  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_id = _user_id AND status = 'active';

  v_limit := public.get_feature_limit(coalesce(v_plan, 'free'), _feature);

  IF v_limit = -1 THEN
    RETURN CASE WHEN public.has_feature_access(_user_id, _feature) THEN 'unlimited' ELSE 'denied' END;
  END IF;
  -- NULL doit refuser : sinon le premier INSERT (sans conflit) passerait
  -- sans jamais évaluer la limite.
  IF v_limit IS NULL OR v_limit <= 0 THEN
    RETURN 'denied';
  END IF;

  INSERT INTO public.feature_usage (user_id, feature_name, usage_count, month)
  VALUES (_user_id, _feature, 1, date_trunc('month', current_date)::date)
  ON CONFLICT (user_id, feature_name, month)
  DO UPDATE SET usage_count = feature_usage.usage_count + 1, updated_at = now()
  WHERE feature_usage.usage_count < v_limit
  RETURNING usage_count INTO v_count;

  RETURN CASE WHEN v_count IS NOT NULL THEN 'counted' ELSE 'denied' END;
END;
$$;

-- Rend le crédit consommé quand l'appel IA échoue (les retries du front ne
-- doivent pas épuiser le quota).
CREATE OR REPLACE FUNCTION public.refund_feature_quota(_user_id uuid, _feature text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.feature_usage
  SET usage_count = usage_count - 1, updated_at = now()
  WHERE user_id = _user_id
    AND feature_name = _feature
    AND month = date_trunc('month', current_date)::date
    AND usage_count > 0;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_feature_quota(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_feature_quota(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_feature_quota(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_feature_quota(uuid, text) TO service_role;

-- ---- 4. Vidéos de sparring privées ------------------------------------------
-- Les objets restent accessibles au propriétaire via URL signée
-- (politique SELECT existante sur storage.objects).
UPDATE storage.buckets SET public = false WHERE id = 'sparring-videos';

-- ---- 5. WITH CHECK sur les politiques UPDATE --------------------------------
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('profiles',          'Users can update their own profile',        'auth.uid() = id'),
      ('workouts',          'Users can update their own workouts',       'auth.uid() = user_id'),
      ('nutrition_logs',    'Users can update their own nutrition logs', 'auth.uid() = user_id'),
      ('nutrition_goals',   'Users can update their own nutrition goals','auth.uid() = user_id'),
      ('workout_journal',   'Users can update their own journal entries','auth.uid() = user_id'),
      ('notifications',     'Users can update their own notifications',  'auth.uid() = user_id'),
      ('sparring_analyses', 'Users can update their own analyses',       'auth.uid() = user_id'),
      ('meutes',            'Owners can update their meutes',            'auth.uid() = owner_id'),
      ('meute_members',     'Users update their own membership',         'auth.uid() = user_id')
    ) AS t(tbl, pol, expr)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = p.tbl AND policyname = p.pol
    ) THEN
      EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', p.pol, p.tbl, p.expr);
    ELSE
      RAISE WARNING 'Policy "%" absente sur public.% : WITH CHECK non appliqué', p.pol, p.tbl;
    END IF;
  END LOOP;
END;
$$;

-- ---- 6. Meutes : une adhésion ne peut pas changer de meute ni de titulaire --
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meute_id IS DISTINCT FROM OLD.meute_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
    RAISE EXCEPTION 'Une adhésion ne peut pas être déplacée vers une autre meute ou un autre membre';
  END IF;

  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  IF public.is_meute_owner(NEW.meute_id, auth.uid())
     OR public.get_meute_member_role(NEW.meute_id, auth.uid()) = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Seuls les propriétaires et administrateurs peuvent modifier les rôles des membres';
END;
$$;
