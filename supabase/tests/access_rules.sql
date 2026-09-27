-- Access rules, run on a database built by run.sh (stubs + every migration).
-- Any failed expectation raises and stops the script.
\set ON_ERROR_STOP 1

CREATE FUNCTION pg_temp.expect(label text, actual anyelement, expected anyelement)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'FAIL %: got %, expected %', label, actual, expected;
  END IF;
  RAISE NOTICE 'ok  %', label;
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.expect(text, anyelement, anyelement) TO authenticated;

INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-0000-0000-00000000000a', 'owner@test.fr'),
 ('00000000-0000-0000-0000-00000000000b', 'Member@Test.fr'),
 ('00000000-0000-0000-0000-00000000000c', 'stranger@test.fr');
INSERT INTO public.profiles (id, full_name, email) VALUES
 ('00000000-0000-0000-0000-00000000000a', 'Olive Owner', 'owner@test.fr'),
 ('00000000-0000-0000-0000-00000000000b', 'member@test.fr', 'member@test.fr'),
 ('00000000-0000-0000-0000-00000000000c', 'Stan', 'stranger@test.fr')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-00000000000a', 'admin');

-- Checkout locking and service-only access.
SELECT pg_temp.expect('authenticated cannot acquire checkout locks',
  has_function_privilege('authenticated', 'public.acquire_checkout_lock(uuid,uuid)', 'EXECUTE'), false);
SELECT pg_temp.expect('anonymous cannot read checkout state',
  has_table_privilege('anon', 'public.checkout_attempts', 'SELECT'), false);
SELECT pg_temp.expect('authenticated cannot write checkout state',
  has_table_privilege('authenticated', 'public.checkout_attempts', 'UPDATE'), false);
SELECT pg_temp.expect('first checkout acquires lock', public.acquire_checkout_lock(
  '00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000001'), true);
SELECT pg_temp.expect('parallel checkout is refused', public.acquire_checkout_lock(
  '00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000002'), false);
SELECT public.release_checkout_lock('00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000002');
SELECT pg_temp.expect('wrong owner cannot unlock checkout', public.acquire_checkout_lock(
  '00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000002'), false);
SELECT public.release_checkout_lock('00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect('checkout can resume after release', public.acquire_checkout_lock(
  '00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000002'), true);
UPDATE public.checkout_attempts SET locked_until = now() - interval '1 minute';
SELECT pg_temp.expect('crashed worker lock expires', public.acquire_checkout_lock(
  '00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000003'), true);
DELETE FROM public.checkout_attempts;

-- ---- Authorization helpers --------------------------------------------------------
SET request.jwt.claims = '{"role":"service_role"}';
SELECT pg_temp.expect('service reads any role', public.has_role('00000000-0000-0000-0000-00000000000a', 'admin'), true);

SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
SELECT pg_temp.expect('user cannot probe another role', public.has_role('00000000-0000-0000-0000-00000000000a', 'admin'), false);
SELECT pg_temp.expect('user cannot probe another plan', public.has_feature_access('00000000-0000-0000-0000-00000000000a', 'ai_coach'), false);
SELECT pg_temp.expect('user reads own plan', public.has_feature_access('00000000-0000-0000-0000-00000000000c', 'basic_training'), true);

-- ---- Team invitations ---------------------------------------------------------------
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
INSERT INTO public.meutes (id, name, owner_id)
VALUES ('10000000-0000-0000-0000-000000000001', 'Team Alpha', '00000000-0000-0000-0000-00000000000a');
SELECT pg_temp.expect('unknown e-mail looks sent', public.invite_team_member('10000000-0000-0000-0000-000000000001', 'nobody@x.fr'), 'sent');
SELECT pg_temp.expect('e-mail is case-insensitive', public.invite_team_member('10000000-0000-0000-0000-000000000001', ' member@test.FR '), 'sent');
SELECT pg_temp.expect('second invite looks like the first', public.invite_team_member('10000000-0000-0000-0000-000000000001', 'member@test.fr'), 'sent');
SELECT pg_temp.expect('owner cannot see who is pending',
  (SELECT count(*) FROM public.meute_members WHERE meute_id = '10000000-0000-0000-0000-000000000001' AND status = 'pending'), 0::bigint);
DO $$ BEGIN
  INSERT INTO public.meute_members (meute_id, user_id, invited_by, role, status)
  VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'member', 'pending');
  RAISE EXCEPTION 'FAIL direct invitation insert';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  invitations go through invite_team_member';
END $$;
SELECT pg_temp.expect('owner invites self', public.invite_team_member('10000000-0000-0000-0000-000000000001', 'owner@test.fr'), 'already_member');

SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
DO $$ BEGIN
  PERFORM public.invite_team_member('10000000-0000-0000-0000-000000000001', 'stranger@test.fr');
  RAISE EXCEPTION 'FAIL non-member could invite';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  non-member cannot invite';
END $$;
SELECT pg_temp.expect('non-member sees no members',
  (SELECT count(*) FROM public.get_team_members('10000000-0000-0000-0000-000000000001')), 0::bigint);

SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
SELECT pg_temp.expect('invitee sees the invitation',
  (SELECT meute_name || ' / ' || invited_by_name FROM public.get_my_team_invitations()), 'Team Alpha / Olive Owner');
SELECT pg_temp.expect('invitee is notified once, without the team name',
  (SELECT string_agg(message, '|') FROM public.notifications WHERE user_id = '00000000-0000-0000-0000-00000000000b'),
  'Tu as reçu une invitation à rejoindre une team. Ouvre l''onglet Team pour répondre.');
UPDATE public.meute_members SET status = 'accepted', joined_at = now()
WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND meute_id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect('member names never show an e-mail',
  (SELECT count(*) FROM public.get_team_members('10000000-0000-0000-0000-000000000001') WHERE display_name LIKE '%@%'), 0::bigint);
DO $$ BEGIN
  INSERT INTO public.meute_activities (meute_id, user_id, activity_type, description)
  VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'custom', 'phishing');
  RAISE EXCEPTION 'FAIL member could write a team activity';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  team activities are server-written';
END $$;

DO $$ BEGIN
  UPDATE public.meute_members SET status = 'pending'
  WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND meute_id = '10000000-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FAIL answered invitation reopened';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  an invitation is answered once';
END $$;

-- ---- Feed and team activity ------------------------------------------------------------
DO $$
DECLARE i int; w uuid;
BEGIN
  FOR i IN 1..12 LOOP
    INSERT INTO public.workouts (user_id, name, status, session_type, started_at)
    VALUES ('00000000-0000-0000-0000-00000000000b', 'Rééducation genou ' || i, 'active', 'boxing', now())
    RETURNING id INTO w;
    UPDATE public.workouts SET status = 'completed', completed_at = now() WHERE id = w;
  END LOOP;
END $$;
SELECT pg_temp.expect('feed capped at 10 a day',
  (SELECT count(*) FROM public.community_activities WHERE user_id = '00000000-0000-0000-0000-00000000000b'), 10::bigint);
SELECT pg_temp.expect('feed hides e-mail and workout name',
  (SELECT string_agg(DISTINCT description, ',') FROM public.community_activities WHERE user_id = '00000000-0000-0000-0000-00000000000b'),
  'Un athlète a terminé une séance de boxe');
SELECT pg_temp.expect('team sees the sessions',
  (SELECT count(*) FROM public.get_team_activities('10000000-0000-0000-0000-000000000001', 3)), 3::bigint);

SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
SELECT pg_temp.expect('others cannot read my feed',
  (SELECT count(*) FROM public.community_activities WHERE user_id = '00000000-0000-0000-0000-00000000000b'), 0::bigint);

-- A third member joins then leaves; a declined invitation cannot be accepted later.
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
SELECT pg_temp.expect('invite stranger', public.invite_team_member('10000000-0000-0000-0000-000000000001', 'stranger@test.fr'), 'sent');
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
UPDATE public.meute_members SET status = 'declined'
WHERE user_id = '00000000-0000-0000-0000-00000000000c' AND meute_id = '10000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  UPDATE public.meute_members SET status = 'accepted'
  WHERE user_id = '00000000-0000-0000-0000-00000000000c' AND meute_id = '10000000-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'FAIL declined invitation accepted later';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  declined invitation stays declined';
END $$;
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
DELETE FROM public.meute_members
WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND meute_id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect('member can leave',
  (SELECT count(*) FROM public.meute_members WHERE user_id = '00000000-0000-0000-0000-00000000000b'), 0::bigint);
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
DELETE FROM public.meute_members
WHERE user_id = '00000000-0000-0000-0000-00000000000a' AND meute_id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect('owner cannot leave (deletes the team instead)',
  (SELECT count(*) FROM public.meute_members WHERE user_id = '00000000-0000-0000-0000-00000000000a'), 1::bigint);

-- Invitation rate limit: 20 real invitations a day per inviter.
RESET ROLE;
INSERT INTO auth.users (id, email)
SELECT ('20000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 'bulk' || i || '@test.fr'
FROM generate_series(1, 21) i;
SET ROLE authenticated;
DO $$
DECLARE i int; r text;
BEGIN
  FOR i IN 1..20 LOOP
    r := public.invite_team_member('10000000-0000-0000-0000-000000000001', 'bulk' || i || '@test.fr');
  END LOOP;
  PERFORM pg_temp.expect('21st invitation of the day', public.invite_team_member('10000000-0000-0000-0000-000000000001', 'bulk21@test.fr'), 'rate_limited');
END $$;

-- ---- Integrity -------------------------------------------------------------------------
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
INSERT INTO public.workouts (user_id, name, status) VALUES ('00000000-0000-0000-0000-00000000000b', 'x', 'active');
DO $$ BEGIN
  INSERT INTO public.workouts (user_id, name, status) VALUES ('00000000-0000-0000-0000-00000000000b', 'y', 'active');
  RAISE EXCEPTION 'FAIL two active sessions';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'ok  one active session per user';
END $$;
DO $$ BEGIN
  UPDATE public.profiles SET full_name = repeat('x', 101) WHERE id = '00000000-0000-0000-0000-00000000000b';
  RAISE EXCEPTION 'FAIL 101-character name accepted';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok  name length enforced';
END $$;

RESET ROLE;
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-0000000000d1', 'long@test.fr', jsonb_build_object('full_name', repeat('n', 150)));
SELECT pg_temp.expect('sign-up with a long name is truncated, not refused',
  (SELECT char_length(full_name) FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000d1'), 100);

-- ---- AI fair use -----------------------------------------------------------------------
RESET ROLE;
SET request.jwt.claims = '{"role":"service_role"}';
INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-00000000000c', 'coach');
DO $$
DECLARE i int; r text; counts text := '';
BEGIN
  FOR i IN 1..201 LOOP
    r := public.consume_feature_quota('00000000-0000-0000-0000-00000000000c', 'ai_coach');
  END LOOP;
  PERFORM pg_temp.expect('coach stopped at call 201', r, 'rate_limited');
  PERFORM public.refund_feature_quota('00000000-0000-0000-0000-00000000000c', 'ai_coach', false);
  PERFORM pg_temp.expect('refund frees one call',
    public.consume_feature_quota('00000000-0000-0000-0000-00000000000c', 'ai_coach'), 'unlimited');
  FOR i IN 1..4 LOOP
    counts := counts || public.consume_feature_quota('00000000-0000-0000-0000-00000000000b', 'ai_coach') || ' ';
  END LOOP;
  PERFORM pg_temp.expect('free plan monthly limit', counts, 'counted counted counted denied ');
  PERFORM pg_temp.expect('denied call is not counted for the day',
    (SELECT usage_count FROM public.feature_daily_usage WHERE user_id = '00000000-0000-0000-0000-00000000000b'), 3);
  PERFORM pg_temp.expect('admin is unlimited',
    public.consume_feature_quota('00000000-0000-0000-0000-00000000000a', 'ai_coach'), 'unlimited');
END $$;

-- ---- Server-only objects ---------------------------------------------------------------
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
DO $$ BEGIN
  PERFORM 1 FROM public.feature_daily_usage;
  RAISE EXCEPTION 'FAIL daily usage readable';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  daily usage is server-only';
END $$;
DO $$ BEGIN
  PERFORM 1 FROM public.documents;
  RAISE EXCEPTION 'FAIL legacy documents readable';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  legacy tables closed';
END $$;
DO $$ BEGIN
  PERFORM public.consume_feature_quota('00000000-0000-0000-0000-00000000000b', 'ai_coach');
  RAISE EXCEPTION 'FAIL client can consume quota';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok  quota functions are server-only';
END $$;
RESET ROLE;
