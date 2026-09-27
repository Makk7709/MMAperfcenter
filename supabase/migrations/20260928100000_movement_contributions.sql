-- Contributions volontaires au jeu d'entraînement de l'analyse du mouvement.
--
-- Seuls des squelettes sont stockés : 23 points articulaires par personne et
-- par image (le nez, sans yeux, oreilles ni bouche), calculés sur l'appareil ;
-- aucune image ni vidéo. Chaque contribution porte le consentement horodaté du
-- contributeur. Le mouvement du partenaire n'entre dans le jeu qu'avec son
-- propre accord, donné depuis son compte via un lien ; sans réponse, il est
-- effacé à l'échéance de l'invitation. Tout passe par les fonctions ci-dessous :
-- les tables sont fermées au client.

SET lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.movement_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.sparring_analyses(id) ON DELETE SET NULL,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  discipline text CHECK (char_length(discipline) <= 60),
  landmark_set text NOT NULL,
  fps smallint NOT NULL CHECK (fps BETWEEN 1 AND 15),
  frame_count integer NOT NULL CHECK (frame_count BETWEEN 1 AND 3000),
  -- Numéro PRISM (fighter_1 / fighter_2) du contributeur, pour rattacher les étiquettes.
  contributor_fighter smallint NOT NULL CHECK (contributor_fighter IN (1, 2)),
  prism_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  partner_status text NOT NULL DEFAULT 'none'
    CHECK (partner_status IN ('none', 'pending', 'consented', 'withdrawn', 'expired')),
  partner_consent_version text,
  partner_consented_at timestamptz,
  invite_token_hash bytea UNIQUE,
  invite_expires_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '3 years',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((partner_status = 'pending') = (invite_token_hash IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS movement_contributions_user_idx ON public.movement_contributions (user_id, created_at);

-- One track per filmed person. subject_user_id is the person the movement
-- belongs to: deleting that account deletes the track.
CREATE TABLE IF NOT EXISTS public.movement_tracks (
  contribution_id uuid NOT NULL REFERENCES public.movement_contributions(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (subject IN ('contributor', 'partner')),
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  data bytea NOT NULL,
  PRIMARY KEY (contribution_id, subject),
  CHECK (subject = 'partner' OR subject_user_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS movement_tracks_subject_idx ON public.movement_tracks (subject_user_id);

ALTER TABLE public.movement_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_tracks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.movement_contributions, public.movement_tracks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.movement_contributions, public.movement_tracks TO service_role;

-- ---- Constantes -----------------------------------------------------------------------
-- Keep in sync with src/lib/movement/contribution.ts.
CREATE OR REPLACE FUNCTION public.movement_consent_version()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT '2026-09-28'::text $$;

-- ---- Fin de l'accord du partenaire ---------------------------------------------------------
-- Partner track gone (withdrawal, account deletion, expired invitation): the
-- contribution keeps only the contributor's movement.
CREATE OR REPLACE FUNCTION public.movement_partner_track_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.movement_contributions
     SET partner_status = CASE WHEN partner_status = 'pending' THEN 'expired' ELSE 'withdrawn' END,
         invite_token_hash = NULL,
         invite_expires_at = NULL
   WHERE id = OLD.contribution_id AND partner_status IN ('pending', 'consented');
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS movement_partner_track_deleted ON public.movement_tracks;
CREATE TRIGGER movement_partner_track_deleted
AFTER DELETE ON public.movement_tracks
FOR EACH ROW WHEN (OLD.subject = 'partner')
EXECUTE FUNCTION public.movement_partner_track_deleted();

-- ---- Contribution --------------------------------------------------------------------------
-- Tracks are base64 Int16 little-endian: frame_count x 23 points x (x, y, z, visibility).
-- Labels are taken from the stored analysis, never from the client; the
-- client only sends its verdict on each of them.
CREATE OR REPLACE FUNCTION public.contribute_movement(
  p_analysis_id uuid,
  p_consent_version text,
  p_attests_adult boolean,
  p_contributor_fighter smallint,
  p_landmark_set text,
  p_fps smallint,
  p_frame_count integer,
  p_contributor_track text,
  p_partner_track text DEFAULT NULL,
  p_user_labels jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_analysis jsonb;
  v_age integer;
  v_contributor bytea;
  v_partner bytea;
  v_labels jsonb;
  v_user_labels jsonb;
  v_moments integer;
  v_techniques integer;
  v_token text;
  v_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_consent_version IS DISTINCT FROM public.movement_consent_version() THEN
    RAISE EXCEPTION 'consent text changed' USING ERRCODE = '22023', HINT = 'CONSENT_OUTDATED';
  END IF;
  IF p_attests_adult IS NOT TRUE THEN
    RAISE EXCEPTION 'adult attestation required' USING ERRCODE = '22023', HINT = 'ADULT_REQUIRED';
  END IF;
  SELECT age INTO v_age FROM public.profiles WHERE id = uid;
  IF v_age < 18 THEN
    RAISE EXCEPTION 'contributors must be adults' USING ERRCODE = '42501', HINT = 'ADULT_REQUIRED';
  END IF;
  IF p_landmark_set IS DISTINCT FROM 'mediapipe-pose-23-v1' THEN
    RAISE EXCEPTION 'unknown landmark set' USING ERRCODE = '22023';
  END IF;
  IF p_contributor_fighter NOT IN (1, 2) OR p_fps NOT BETWEEN 1 AND 15 OR p_frame_count NOT BETWEEN 1 AND 3000 THEN
    RAISE EXCEPTION 'invalid track dimensions' USING ERRCODE = '22023';
  END IF;

  SELECT analysis INTO v_analysis FROM public.sparring_analyses
   WHERE id = p_analysis_id AND user_id = uid AND status = 'completed' AND analysis IS NOT NULL;
  IF v_analysis IS NULL THEN RAISE EXCEPTION 'analysis not found' USING ERRCODE = 'P0002'; END IF;

  IF (SELECT count(*) FROM public.movement_contributions
       WHERE user_id = uid AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'daily contribution limit reached' USING ERRCODE = '54000', HINT = 'RATE_LIMITED';
  END IF;

  BEGIN
    v_contributor := decode(p_contributor_track, 'base64');
    v_partner := decode(p_partner_track, 'base64');
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'track is not base64' USING ERRCODE = '22023';
  END;
  IF octet_length(v_contributor) IS DISTINCT FROM p_frame_count * 184
     OR (v_partner IS NOT NULL AND octet_length(v_partner) <> p_frame_count * 184) THEN
    RAISE EXCEPTION 'track size does not match its dimensions' USING ERRCODE = '22023';
  END IF;

  -- PRISM labels, re-attached to the contributor or the partner.
  SELECT coalesce(jsonb_agg(l ORDER BY l->>'kind', (l->>'index')::int), '[]'::jsonb) INTO v_labels
  FROM (
    SELECT jsonb_strip_nulls(jsonb_build_object(
             'kind', 'moment', 'index', i - 1,
             't', CASE WHEN jsonb_typeof(m->'timestamp_seconds') = 'number' THEN m->'timestamp_seconds' END,
             'type', left(m->>'type', 60),
             'subject', CASE m->>'fighter'
               WHEN 'fighter_' || p_contributor_fighter THEN 'contributor'
               WHEN 'fighter_1' THEN 'partner' WHEN 'fighter_2' THEN 'partner' END)) AS l
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_analysis->'key_moments') = 'array' THEN v_analysis->'key_moments' ELSE '[]' END)
           WITH ORDINALITY AS t(m, i)
    UNION ALL
    SELECT jsonb_strip_nulls(jsonb_build_object(
             'kind', 'technique', 'index', i - 1,
             't', CASE WHEN jsonb_typeof(m->'timestamp_seconds') = 'number' THEN m->'timestamp_seconds' END,
             'technique', left(m->>'technique', 60),
             'quality', CASE WHEN m->>'quality' IN ('good', 'average', 'poor') THEN m->>'quality' END,
             'subject', CASE m->>'fighter'
               WHEN 'fighter_' || p_contributor_fighter THEN 'contributor'
               WHEN 'fighter_1' THEN 'partner' WHEN 'fighter_2' THEN 'partner' END))
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_analysis->'techniques_observed') = 'array' THEN v_analysis->'techniques_observed' ELSE '[]' END)
           WITH ORDINALITY AS t(m, i)
  ) s;
  v_moments := (SELECT count(*) FROM jsonb_array_elements(v_labels) e WHERE e->>'kind' = 'moment');
  v_techniques := (SELECT count(*) FROM jsonb_array_elements(v_labels) e WHERE e->>'kind' = 'technique');

  IF jsonb_typeof(coalesce(p_user_labels, '[]'::jsonb)) <> 'array' OR jsonb_array_length(coalesce(p_user_labels, '[]'::jsonb)) > 400 THEN
    RAISE EXCEPTION 'invalid corrections' USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object('kind', e->>'kind', 'index', (e->>'index')::int, 'verdict', e->>'verdict')), '[]'::jsonb)
    INTO v_user_labels
    FROM jsonb_array_elements(coalesce(p_user_labels, '[]'::jsonb)) e;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_user_labels) e
     WHERE e->>'verdict' IS NULL OR e->>'verdict' NOT IN ('correct', 'incorrect', 'unsure')
        OR e->>'index' IS NULL OR (e->>'index')::int < 0
        OR NOT ((e->>'kind' = 'moment' AND (e->>'index')::int < v_moments)
             OR (e->>'kind' = 'technique' AND (e->>'index')::int < v_techniques))
  ) OR (SELECT count(DISTINCT (e->>'kind', e->>'index')) FROM jsonb_array_elements(v_user_labels) e) <> jsonb_array_length(v_user_labels) THEN
    RAISE EXCEPTION 'invalid corrections' USING ERRCODE = '22023';
  END IF;

  IF v_partner IS NOT NULL THEN
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END IF;

  INSERT INTO public.movement_contributions (
    user_id, analysis_id, consent_version, discipline, landmark_set, fps, frame_count,
    contributor_fighter, prism_labels, user_labels, partner_status, invite_token_hash, invite_expires_at)
  VALUES (
    uid, p_analysis_id, p_consent_version, left(v_analysis->>'discipline', 60), p_landmark_set, p_fps, p_frame_count,
    p_contributor_fighter, v_labels, v_user_labels,
    CASE WHEN v_token IS NULL THEN 'none' ELSE 'pending' END,
    CASE WHEN v_token IS NULL THEN NULL ELSE sha256(convert_to(v_token, 'UTF8')) END,
    CASE WHEN v_token IS NULL THEN NULL ELSE now() + interval '14 days' END)
  RETURNING id INTO v_id;

  INSERT INTO public.movement_tracks (contribution_id, subject, subject_user_id, data)
  VALUES (v_id, 'contributor', uid, v_contributor);
  IF v_partner IS NOT NULL THEN
    INSERT INTO public.movement_tracks (contribution_id, subject, subject_user_id, data)
    VALUES (v_id, 'partner', NULL, v_partner);
  END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object('id', v_id, 'invite_token', v_token));
END;
$$;

-- ---- Invitation du partenaire -----------------------------------------------------------
-- What the invited person needs to decide, and nothing about the analysis itself.
CREATE OR REPLACE FUNCTION public.get_movement_invite(p_token text)
RETURNS TABLE (status text, contributor_name text, discipline text, created_at timestamptz, expires_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.movement_contributions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.movement_contributions
   WHERE invite_token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
  IF NOT FOUND OR c.invite_expires_at < now() THEN
    RETURN QUERY SELECT 'unavailable'::text, NULL::text, NULL::text, NULL::timestamptz, NULL::timestamptz;
    RETURN;
  END IF;
  RETURN QUERY
  SELECT CASE WHEN c.user_id = auth.uid() THEN 'own' ELSE 'pending' END,
         CASE WHEN p.full_name LIKE '%@%' THEN NULL ELSE nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '') END,
         c.discipline, c.created_at, c.invite_expires_at
    FROM public.profiles p WHERE p.id = c.user_id
  UNION ALL
  SELECT CASE WHEN c.user_id = auth.uid() THEN 'own' ELSE 'pending' END, NULL, c.discipline, c.created_at, c.invite_expires_at
   WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_movement_invite(p_token text, p_consent_version text, p_attests_adult boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_age integer;
  v_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_consent_version IS DISTINCT FROM public.movement_consent_version() THEN
    RAISE EXCEPTION 'consent text changed' USING ERRCODE = '22023', HINT = 'CONSENT_OUTDATED';
  END IF;
  IF p_attests_adult IS NOT TRUE THEN
    RAISE EXCEPTION 'adult attestation required' USING ERRCODE = '22023', HINT = 'ADULT_REQUIRED';
  END IF;
  SELECT age INTO v_age FROM public.profiles WHERE id = uid;
  IF v_age < 18 THEN
    RAISE EXCEPTION 'partners must be adults' USING ERRCODE = '42501', HINT = 'ADULT_REQUIRED';
  END IF;

  UPDATE public.movement_contributions
     SET partner_status = 'consented',
         partner_consent_version = p_consent_version, partner_consented_at = now(),
         invite_token_hash = NULL, invite_expires_at = NULL
   WHERE invite_token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
     AND partner_status = 'pending' AND invite_expires_at >= now() AND user_id <> uid
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'invitation unavailable' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.movement_tracks SET subject_user_id = uid WHERE contribution_id = v_id AND subject = 'partner';
  RETURN v_id;
END;
$$;

-- Declining erases the partner's movement at once instead of at expiry.
CREATE OR REPLACE FUNCTION public.decline_movement_invite(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.movement_tracks t
   USING public.movement_contributions c
   WHERE c.id = t.contribution_id AND t.subject = 'partner' AND c.partner_status = 'pending'
     AND c.user_id <> auth.uid()
     AND c.invite_token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
END;
$$;

-- ---- Retrait et consultation ----------------------------------------------------------------
-- The contributor withdraws the whole contribution; the partner only their own movement.
CREATE OR REPLACE FUNCTION public.withdraw_movement_contribution(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.movement_contributions WHERE id = p_id AND user_id = uid;
  IF FOUND THEN RETURN; END IF;
  DELETE FROM public.movement_tracks WHERE contribution_id = p_id AND subject = 'partner' AND subject_user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'contribution not found' USING ERRCODE = 'P0002'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_movement_contributions()
RETURNS TABLE (
  id uuid,
  role text,
  created_at timestamptz,
  expires_at timestamptz,
  discipline text,
  fps smallint,
  frame_count integer,
  partner_status text,
  invite_expires_at timestamptz,
  label_count integer,
  correction_count integer,
  consent_version text,
  consented_at timestamptz,
  prism_labels jsonb,
  user_labels jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, 'contributor', c.created_at, c.expires_at, c.discipline, c.fps, c.frame_count,
         c.partner_status, c.invite_expires_at,
         jsonb_array_length(c.prism_labels), jsonb_array_length(c.user_labels),
         c.consent_version, c.consented_at, c.prism_labels, c.user_labels
    FROM public.movement_contributions c WHERE c.user_id = auth.uid()
  UNION ALL
  SELECT c.id, 'partner', c.created_at, c.expires_at, c.discipline, c.fps, c.frame_count,
         c.partner_status, NULL, NULL, NULL, c.partner_consent_version, c.partner_consented_at, NULL, NULL
    FROM public.movement_contributions c
    JOIN public.movement_tracks t ON t.contribution_id = c.id AND t.subject = 'partner'
   WHERE t.subject_user_id = auth.uid()
  ORDER BY 3 DESC;
$$;

-- Portability: every track that belongs to the caller, as sent.
CREATE OR REPLACE FUNCTION public.my_movement_tracks()
RETURNS TABLE (contribution_id uuid, subject text, landmark_set text, fps smallint, frame_count integer, data_base64 text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.contribution_id, t.subject, c.landmark_set, c.fps, c.frame_count, encode(t.data, 'base64')
    FROM public.movement_tracks t
    JOIN public.movement_contributions c ON c.id = t.contribution_id
   WHERE t.subject_user_id = auth.uid();
$$;

-- ---- Purge ----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_movement_contributions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
  m integer;
BEGIN
  DELETE FROM public.movement_contributions WHERE expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.movement_tracks t
   USING public.movement_contributions c
   WHERE c.id = t.contribution_id AND t.subject = 'partner'
     AND c.partner_status = 'pending' AND c.invite_expires_at < now();
  GET DIAGNOSTICS m = ROW_COUNT;
  RETURN n + m;
END;
$$;

REVOKE ALL ON FUNCTION public.movement_partner_track_deleted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contribute_movement(uuid, text, boolean, smallint, text, smallint, integer, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_movement_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_movement_invite(text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_movement_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_movement_contribution(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_movement_contributions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_movement_tracks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.purge_movement_contributions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contribute_movement(uuid, text, boolean, smallint, text, smallint, integer, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_movement_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_movement_invite(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_movement_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_movement_contribution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_movement_contributions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_movement_tracks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_movement_contributions() TO service_role;

-- Daily purge when pg_cron is enabled (Database > Extensions); otherwise see
-- docs/development/DEPLOYMENT.md.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('purge-movement-contributions', '17 3 * * *', 'SELECT public.purge_movement_contributions()');
  END IF;
END;
$$;
