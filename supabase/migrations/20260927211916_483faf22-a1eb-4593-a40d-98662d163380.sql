SET lock_timeout = '5s';
ALTER FUNCTION public.session_type_label(text) SET search_path = public;
CREATE SCHEMA IF NOT EXISTS korev_private;
REVOKE ALL ON SCHEMA korev_private FROM PUBLIC;
GRANT USAGE ON SCHEMA korev_private TO anon, authenticated, service_role;
DO $$ DECLARE fn record; BEGIN
  FOR fn IN SELECT * FROM (VALUES ('has_role','uuid, public.app_role'),('has_feature_access','uuid, text'),('is_meute_member','uuid, uuid'),('is_meute_owner','uuid, uuid'),('get_meute_member_role','uuid, uuid')) AS t(name, args)
  LOOP
    IF to_regprocedure(format('korev_private.%s(%s)', fn.name, fn.args)) IS NULL AND to_regprocedure(format('public.%s(%s)', fn.name, fn.args)) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION public.%s(%s) SET SCHEMA korev_private', fn.name, fn.args);
    END IF;
  END LOOP;
END; $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.is_trusted_caller() OR _user_id = auth.uid()) AND korev_private.has_role(_user_id, _role);
$$;
CREATE OR REPLACE FUNCTION public.has_feature_access(_user_id uuid, _feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.is_trusted_caller() OR _user_id = auth.uid()) AND korev_private.has_feature_access(_user_id, _feature);
$$;
CREATE OR REPLACE FUNCTION public.is_meute_member(_meute_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.is_trusted_caller() OR _user_id = auth.uid()) AND korev_private.is_meute_member(_meute_id, _user_id);
$$;
CREATE OR REPLACE FUNCTION public.is_meute_owner(_meute_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.is_trusted_caller() OR _user_id = auth.uid()) AND korev_private.is_meute_owner(_meute_id, _user_id);
$$;
CREATE OR REPLACE FUNCTION public.get_meute_member_role(_meute_id uuid, _user_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_trusted_caller() OR _user_id = auth.uid() THEN korev_private.get_meute_member_role(_meute_id, _user_id) END;
$$;

CREATE TABLE IF NOT EXISTS public.feature_daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  day date NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, feature_name, day)
);
GRANT ALL ON public.feature_daily_usage TO service_role;
ALTER TABLE public.feature_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_daily_usage FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.get_daily_feature_cap(_feature text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _feature WHEN 'ai_coach' THEN 200 WHEN 'sparring_analysis' THEN 20 ELSE 100 END;
$$;
CREATE OR REPLACE FUNCTION public.refund_daily_feature_usage(_user_id uuid, _feature text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.feature_daily_usage SET usage_count = usage_count - 1 WHERE user_id = _user_id AND feature_name = _feature AND day = current_date AND usage_count > 0;
$$;
CREATE OR REPLACE FUNCTION public.consume_feature_quota(_user_id uuid, _feature text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan public.subscription_plan; v_limit integer; v_count integer; v_day date := current_date;
BEGIN
  IF korev_private.has_role(_user_id, 'admin') THEN RETURN 'unlimited'; END IF;
  INSERT INTO public.feature_daily_usage (user_id, feature_name, day, usage_count) VALUES (_user_id, _feature, v_day, 1)
  ON CONFLICT (user_id, feature_name, day) DO UPDATE SET usage_count = feature_daily_usage.usage_count + 1
  WHERE feature_daily_usage.usage_count < public.get_daily_feature_cap(_feature)
  RETURNING usage_count INTO v_count;
  IF v_count IS NULL THEN RETURN 'rate_limited'; END IF;
  DELETE FROM public.feature_daily_usage WHERE user_id = _user_id AND day < v_day - 7;
  IF korev_private.has_role(_user_id, 'coach') THEN RETURN 'unlimited'; END IF;
  SELECT plan INTO v_plan FROM public.subscriptions WHERE user_id = _user_id AND status = 'active';
  v_limit := public.get_feature_limit(coalesce(v_plan, 'free'), _feature);
  IF v_limit = -1 THEN
    IF public.has_feature_access(_user_id, _feature) THEN RETURN 'unlimited'; END IF;
    PERFORM public.refund_daily_feature_usage(_user_id, _feature); RETURN 'denied';
  END IF;
  IF v_limit IS NULL OR v_limit <= 0 THEN PERFORM public.refund_daily_feature_usage(_user_id, _feature); RETURN 'denied'; END IF;
  v_count := NULL;
  INSERT INTO public.feature_usage (user_id, feature_name, usage_count, month) VALUES (_user_id, _feature, 1, date_trunc('month', current_date)::date)
  ON CONFLICT (user_id, feature_name, month) DO UPDATE SET usage_count = feature_usage.usage_count + 1, updated_at = now()
  WHERE feature_usage.usage_count < v_limit
  RETURNING usage_count INTO v_count;
  IF v_count IS NULL THEN PERFORM public.refund_daily_feature_usage(_user_id, _feature); RETURN 'denied'; END IF;
  RETURN 'counted';
END; $$;
DROP FUNCTION IF EXISTS public.refund_feature_quota(uuid, text);
CREATE OR REPLACE FUNCTION public.refund_feature_quota(_user_id uuid, _feature text, _monthly boolean DEFAULT true) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refund_daily_feature_usage(_user_id, _feature);
  IF _monthly THEN
    UPDATE public.feature_usage SET usage_count = usage_count - 1, updated_at = now()
    WHERE user_id = _user_id AND feature_name = _feature AND month = date_trunc('month', current_date)::date AND usage_count > 0;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.consume_feature_quota(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_feature_quota(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_daily_feature_usage(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_feature_quota(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_feature_quota(uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_daily_feature_usage(uuid, text) TO service_role;

DROP POLICY IF EXISTS "Users can upload their own sparring videos" ON storage.objects;

UPDATE public.profiles SET full_name = left(btrim(full_name), 100) WHERE char_length(full_name) > 100;
UPDATE public.profiles SET target_event = left(target_event, 200) WHERE char_length(target_event) > 200;
UPDATE public.profiles SET belt_rank = left(belt_rank, 60) WHERE char_length(belt_rank) > 60;
UPDATE public.workouts SET name = left(name, 120) WHERE char_length(name) > 120;
UPDATE public.meutes SET name = left(btrim(name), 60) WHERE char_length(btrim(name)) > 60;
UPDATE public.meutes SET name = 'Team' WHERE btrim(name) = '';
UPDATE public.meutes SET description = left(description, 280) WHERE char_length(description) > 280;
UPDATE public.meute_activities SET description = left(description, 300) WHERE char_length(description) > 300;
UPDATE public.notifications SET title = left(title, 200) WHERE char_length(title) > 200;
UPDATE public.notifications SET message = left(message, 1000) WHERE char_length(message) > 1000;
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT * FROM (VALUES
      ('profiles','profiles_full_name_length','full_name IS NULL OR char_length(full_name) <= 100'),
      ('profiles','profiles_target_event_length','target_event IS NULL OR char_length(target_event) <= 200'),
      ('profiles','profiles_belt_rank_length','belt_rank IS NULL OR char_length(belt_rank) <= 60'),
      ('workouts','workouts_name_length','char_length(name) <= 120'),
      ('meutes','meutes_name_length','char_length(btrim(name)) BETWEEN 1 AND 60'),
      ('meutes','meutes_description_length','description IS NULL OR char_length(description) <= 280'),
      ('meute_activities','meute_activities_description_length','char_length(description) <= 300'),
      ('notifications','notifications_title_length','char_length(title) <= 200'),
      ('notifications','notifications_message_length','char_length(message) <= 1000')
    ) AS t(tbl, name, expr)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name AND conrelid = format('public.%I', c.tbl)::regclass) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s)', c.tbl, c.name, c.expr);
    END IF;
  END LOOP;
END; $$;
UPDATE public.stripe_webhook_events SET payload = jsonb_build_object('object_id', payload -> 'data' -> 'object' ->> 'id', 'livemode', payload -> 'livemode') WHERE payload ? 'data';
CREATE OR REPLACE FUNCTION public.clamp_new_profile_text() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.full_name := left(NEW.full_name, 100); NEW.target_event := left(NEW.target_event, 200); NEW.belt_rank := left(NEW.belt_rank, 60);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS clamp_new_profile_text ON public.profiles;
CREATE TRIGGER clamp_new_profile_text BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.clamp_new_profile_text();
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['organizations','organization_members','organization_invitations','render_usage','documents'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.invite_team_member(_meute_id uuid, _email text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_target uuid; v_status text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT (korev_private.is_meute_owner(_meute_id, v_caller) OR coalesce(korev_private.get_meute_member_role(_meute_id, v_caller) IN ('owner', 'admin'), false)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM public.meute_members WHERE meute_id = _meute_id AND status = 'pending') >= 50 THEN RETURN 'too_many_pending'; END IF;
  IF (SELECT count(*) FROM public.meute_members WHERE invited_by = v_caller AND invited_at > now() - interval '1 day') >= 20 THEN RETURN 'rate_limited'; END IF;
  SELECT id INTO v_target FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF v_target IS NULL THEN RETURN 'sent'; END IF;
  SELECT status INTO v_status FROM public.meute_members WHERE meute_id = _meute_id AND user_id = v_target;
  IF v_status = 'accepted' THEN RETURN 'already_member';
  ELSIF v_status IS NOT NULL THEN RETURN 'sent';
  END IF;
  INSERT INTO public.meute_members (meute_id, user_id, invited_by, role, status) VALUES (_meute_id, v_target, v_caller, 'member', 'pending');
  PERFORM public.create_notification(v_target, 'Invitation Team', 'Tu as reçu une invitation à rejoindre une team. Ouvre l''onglet Team pour répondre.', 'info');
  RETURN 'sent';
END; $$;
CREATE OR REPLACE FUNCTION public.get_team_members(_meute_id uuid)
RETURNS TABLE (id uuid, user_id uuid, role text, joined_at timestamptz, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.user_id, m.role, m.joined_at, public.public_display_name(m.user_id), p.avatar_url
  FROM public.meute_members m LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.meute_id = _meute_id AND m.status = 'accepted'
    AND (korev_private.is_meute_member(_meute_id, auth.uid()) OR korev_private.is_meute_owner(_meute_id, auth.uid()))
  ORDER BY (m.role = 'owner') DESC, m.joined_at NULLS LAST;
$$;
CREATE OR REPLACE FUNCTION public.get_team_activities(_meute_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE (id uuid, user_id uuid, activity_type text, description text, created_at timestamptz, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.user_id, a.activity_type, a.description, a.created_at, public.public_display_name(a.user_id)
  FROM public.meute_activities a
  WHERE a.meute_id = _meute_id AND (korev_private.is_meute_member(_meute_id, auth.uid()) OR korev_private.is_meute_owner(_meute_id, auth.uid()))
  ORDER BY a.created_at DESC
  LIMIT least(greatest(coalesce(_limit, 20), 1), 50);
$$;
CREATE OR REPLACE FUNCTION public.get_my_team_invitations()
RETURNS TABLE (id uuid, meute_id uuid, meute_name text, invited_by_name text, invited_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.meute_id, t.name, public.public_display_name(m.invited_by), m.invited_at
  FROM public.meute_members m JOIN public.meutes t ON t.id = m.meute_id
  WHERE m.user_id = auth.uid() AND m.status = 'pending'
  ORDER BY m.invited_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.invite_team_member(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_team_members(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_team_activities(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_team_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_team_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_activities(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team_invitations() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_team_activity_on_workout() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NOT EXISTS (SELECT 1 FROM public.meute_activities WHERE workout_id = NEW.id AND activity_type = 'workout_completed')
     AND (SELECT count(*) FROM public.meute_activities WHERE user_id = NEW.user_id AND activity_type = 'workout_completed' AND created_at > now() - interval '1 day') < 30 THEN
    INSERT INTO public.meute_activities (meute_id, user_id, activity_type, description, workout_id)
    SELECT m.meute_id, NEW.user_id, 'workout_completed', COALESCE(public.public_display_name(NEW.user_id), 'Un membre') || ' a terminé une ' || public.session_type_label(NEW.session_type), NEW.id
    FROM public.meute_members m WHERE m.user_id = NEW.user_id AND m.status = 'accepted';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_workout_completed_team ON public.workouts;
CREATE TRIGGER on_workout_completed_team AFTER UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.create_team_activity_on_workout();
CREATE OR REPLACE FUNCTION public.create_team_activity_on_join() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.role <> 'owner' THEN
    INSERT INTO public.meute_activities (meute_id, user_id, activity_type, description)
    VALUES (NEW.meute_id, NEW.user_id, 'joined', COALESCE(public.public_display_name(NEW.user_id), 'Un membre') || ' a rejoint la team');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_team_member_joined ON public.meute_members;
CREATE TRIGGER on_team_member_joined AFTER UPDATE ON public.meute_members FOR EACH ROW EXECUTE FUNCTION public.create_team_activity_on_join();
DROP POLICY IF EXISTS "Create meute activities" ON public.meute_activities;
REVOKE EXECUTE ON FUNCTION public.create_team_activity_on_workout() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_team_activity_on_join() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_daily_feature_cap(text) FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN RETURN; END IF;
  FOREACH t IN ARRAY ARRAY['notifications'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END; $$;

DROP POLICY IF EXISTS "Authenticated users can view community activities" ON public.community_activities;
DROP POLICY IF EXISTS "Everyone can view community activities" ON public.community_activities;
DROP POLICY IF EXISTS "Users view their own community activities" ON public.community_activities;
CREATE POLICY "Users view their own community activities" ON public.community_activities FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners and admins invite members" ON public.meute_members;
DROP POLICY IF EXISTS "View meute members" ON public.meute_members;
CREATE POLICY "View meute members" ON public.meute_members FOR SELECT
USING (user_id = auth.uid() OR (status = 'accepted' AND (korev_private.is_meute_member(meute_id, auth.uid()) OR korev_private.is_meute_owner(meute_id, auth.uid()))));
DROP POLICY IF EXISTS "Owners delete members" ON public.meute_members;
CREATE POLICY "Owners delete members" ON public.meute_members FOR DELETE USING (korev_private.is_meute_owner(meute_id, auth.uid()) AND user_id <> auth.uid());
DROP POLICY IF EXISTS "Members leave their team" ON public.meute_members;
CREATE POLICY "Members leave their team" ON public.meute_members FOR DELETE USING (user_id = auth.uid() AND role <> 'owner');
CREATE OR REPLACE FUNCTION public.guard_membership_status() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.is_trusted_caller() OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.joined_at := CASE WHEN public.is_trusted_caller() THEN NEW.joined_at ELSE OLD.joined_at END;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Cette invitation a déjà reçu une réponse' USING ERRCODE = '42501';
  END IF;
  NEW.joined_at := CASE WHEN NEW.status = 'accepted' THEN now() END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_membership_status ON public.meute_members;
CREATE TRIGGER guard_membership_status BEFORE UPDATE ON public.meute_members FOR EACH ROW EXECUTE FUNCTION public.guard_membership_status();

CREATE TABLE IF NOT EXISTS public.checkout_attempts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_token uuid, locked_until timestamptz, request_id uuid, params jsonb, session_id text,
  CHECK ((request_id IS NULL) = (params IS NULL))
);
GRANT ALL ON public.checkout_attempts TO service_role;
ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_attempts FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.acquire_checkout_lock(p_user_id uuid, p_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.checkout_attempts(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  UPDATE public.checkout_attempts SET lock_token = p_token, locked_until = clock_timestamp() + interval '10 minutes'
   WHERE user_id = p_user_id AND (locked_until IS NULL OR locked_until < clock_timestamp());
  RETURN FOUND;
END; $$;
CREATE OR REPLACE FUNCTION public.release_checkout_lock(p_user_id uuid, p_token uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.checkout_attempts SET lock_token = NULL, locked_until = NULL WHERE user_id = p_user_id AND lock_token = p_token;
$$;
REVOKE ALL ON FUNCTION public.acquire_checkout_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_checkout_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_checkout_lock(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_checkout_lock(uuid, uuid) TO service_role;