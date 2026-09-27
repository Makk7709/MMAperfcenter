-- =============================================================================
-- KOREV — PRE-FLIGHT before applying migrations 20260925220000 … 20260926080000
-- READ-ONLY: every statement below is a SELECT. Safe on production.
--
-- PART A = one summary query (the Supabase SQL editor only shows the LAST
--          result set, so run PART A alone first). One row per check.
--          BLOCKER rows must be 0 before migrating. INFO rows are fixed by the
--          migrations themselves: export their details (PART B) as rollback material.
-- PART B = detail queries: run them ONE AT A TIME to list offending rows and to
--          SAVE rollback material (function bodies, rows that will be rewritten).
-- =============================================================================

-- =============================== PART A ======================================
WITH
seed(name) AS (VALUES ('Squat avant'),('Soulevé de terre roumain'),('Fentes marchées'),('Hip thrust'),
  ('Développé incliné haltères'),('Rowing haltère'),('Tirage Vertical'),('Pompes'),('Tractions australiennes'),
  ('Face pull'),('Kettlebell swing'),('Box Jumps'),('Squat sauté'),('Pompes claquées'),('Lancer rotatif médecine-ball'),
  ('Épaulé en puissance'),('Burpees'),('Sprawl'),('Mountain Climbers'),('Thrusters'),('Relevés de jambes suspendu'),
  ('Russian Twist'),('Roue abdominale'),('Pallof press')),
active_ranked AS (
  SELECT w.*, row_number() OVER (PARTITION BY user_id ORDER BY COALESCE(started_at, created_at) DESC, id DESC) AS rk,
         count(*) OVER (PARTITION BY user_id) AS n
  FROM public.workouts w WHERE status = 'active'),
video_paths AS (
  SELECT v.id, v.user_id, v.video_url,
         substring(v.video_url FROM '/training-videos/(.+)$') AS new_path
  FROM public.training_videos v WHERE v.video_type = 'upload'),
expected_update_policies(tbl, pol) AS (VALUES
  ('profiles','Users can update their own profile'), ('workouts','Users can update their own workouts'),
  ('nutrition_logs','Users can update their own nutrition logs'), ('nutrition_goals','Users can update their own nutrition goals'),
  ('workout_journal','Users can update their own journal entries'), ('notifications','Users can update their own notifications'),
  ('sparring_analyses','Users can update their own analyses'), ('meutes','Owners can update their meutes'),
  ('meute_members','Users update their own membership')),
checks(id, severity, check_name, result, fix) AS (
-- ---------------------------------------------------------------- BLOCKERS ---
SELECT 'B01','BLOCKER','exercises has no UNIQUE(name): 20260926030000 fails on ON CONFLICT (name)',
  (NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
               WHERE i.indrelid='public.exercises'::regclass AND i.indisunique AND i.indnkeyatts=1 AND a.attname='name'))::int,
  'Dedupe exercises by name, then: ALTER TABLE public.exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);'
UNION ALL
SELECT 'B02','BLOCKER','meute_members.invited_by orphans (no auth.users row): FK re-add in 20260926020000 fails',
  (SELECT count(*) FROM public.meute_members m WHERE m.invited_by IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.invited_by)),
  'UPDATE public.meute_members SET invited_by = NULL WHERE invited_by NOT IN (SELECT id FROM auth.users);'
UNION ALL
SELECT 'B03','BLOCKER','workout_exercises.exercise_id orphans: FK re-add in 20260926070000 fails',
  (SELECT count(*) FROM public.workout_exercises we WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = we.exercise_id)),
  'Delete or remap the orphan rows (see B03 detail) before migrating.'
UNION ALL
SELECT 'B04','BLOCKER','Sessions with a transaction open > 30 s (migrations will queue ALL traffic behind them, incl. auth.users and storage.objects)',
  (SELECT count(*) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND xact_start < now() - interval '30 seconds'
     AND state <> 'idle' AND backend_type = 'client backend'),
  'Wait / pg_terminate_backend them; run the migrations with SET lock_timeout = ''3s'' and retry on failure.'
UNION ALL
SELECT 'B05','BLOCKER','Pending migration versions already recorded (partial / manual apply)',
  CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL THEN -1 ELSE
    (xpath('/row/c/text()', query_to_xml(
      'SELECT count(*) AS c FROM supabase_migrations.schema_migrations WHERE version >= ''20260925220000''', false, true, '')))[1]::text::bigint END,
  '-1 = history table not found. >0: compare live objects with each file before re-running; do not re-run an older file alone (it downgrades functions).'
UNION ALL
SELECT 'B06','BLOCKER','Invalid (half-built) indexes on affected tables: CREATE INDEX IF NOT EXISTS would silently keep them',
  (SELECT count(*) FROM pg_index i WHERE NOT i.indisvalid
     AND i.indrelid IN ('public.workouts'::regclass,'public.workout_journal'::regclass)),
  'DROP INDEX the invalid index, then migrate.'
UNION ALL
SELECT 'B07','BLOCKER','New columns ALREADY exist (schema drift): ADD COLUMN IF NOT EXISTS skips their CHECK constraints',
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND (
     (table_name='workouts' AND column_name IN ('session_type','intensity','planned_rounds','round_seconds','rest_seconds',
                                               'rounds_completed','perceived_effort','planned_minutes'))
     OR (table_name='workout_journal' AND column_name='workout_id'))),
  'Compare with the migration and add the missing CHECK/FK constraints by hand.'
UNION ALL
SELECT 'B08','BLOCKER','Migration role cannot own storage.objects (CREATE POLICY in 20260926010000 fails)',
  (NOT pg_has_role(current_user, (SELECT tableowner FROM pg_tables WHERE schemaname='storage' AND tablename='objects'), 'MEMBER'))::int,
  'Run the migration as a role that owns / is member of the owner of storage.objects (postgres on Supabase).'
UNION ALL
SELECT 'B09','BLOCKER','Expected buckets missing (UPDATE storage.buckets hits 0 rows silently, real bucket stays PUBLIC)',
  (SELECT 2 - count(*) FROM storage.buckets WHERE id IN ('training-videos','sparring-videos')),
  'Check SELECT id, public FROM storage.buckets; adapt the bucket ids in the migrations.'
-- ------------------------------------------------------------------- HIGH ---
UNION ALL
SELECT 'H01','INFO','Users with >1 active workout (20260926060000 pauses all but one; UNIQUE index build)',
  (SELECT count(DISTINCT user_id) FROM active_ranked WHERE n > 1),
  'Informational: rows become status=paused and disappear from the app. Save their ids (PART B, B-H01). Stop writes (maintenance) during this migration.'
UNION ALL
SELECT 'H02','INFO','Active workouts with started_at NULL or in the future',
  (SELECT count(*) FROM active_ranked WHERE n > 1 AND rk = 1 AND (started_at IS NULL OR started_at > now() + interval '5 minutes')),
  '20260926060000 ranks them by created_at. Save B-SAVE-4.'
UNION ALL
SELECT 'H03','INFO','workout_journal rows out of the new ranges',
  (SELECT count(*) FROM public.workout_journal WHERE
     NOT (char_length(btrim(title)) BETWEEN 1 AND 200)
     OR NOT (notes IS NULL OR char_length(notes) <= 5000)
     OR NOT (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 400)
     OR (mood IS NULL OR mood <> ALL (ARRAY['excellent','good','neutral','tired','bad']))),
  '20260926040000 cleans them (mood, title, notes, weight) before adding the checks. Save B-H03.'
UNION ALL
SELECT 'H04','INFO','nutrition_logs rows out of the new ranges',
  (SELECT count(*) FROM public.nutrition_logs WHERE
     NOT (char_length(btrim(food_name)) BETWEEN 1 AND 200)
     OR NOT (calories BETWEEN 0 AND 20000)
     OR NOT (protein_g BETWEEN 0 AND 2000 AND carbs_g BETWEEN 0 AND 2000 AND fat_g BETWEEN 0 AND 2000)),
  '20260926040000 clamps them before adding the checks. Save B-H04.'
UNION ALL
SELECT 'H05','INFO','nutrition_goals rows out of the new ranges',
  (SELECT count(*) FROM public.nutrition_goals WHERE
     NOT (daily_calories BETWEEN 500 AND 10000)
     OR NOT (daily_protein_g BETWEEN 0 AND 1000 AND daily_carbs_g BETWEEN 0 AND 2000 AND daily_fat_g BETWEEN 0 AND 1000)),
  '20260926040000 resets them to 2000/150/250/70. Save B-H05.'
UNION ALL
SELECT 'H06','HIGH','Uploaded training videos that will be UNPLAYABLE for athletes after 20260926010000',
  (SELECT count(*) FROM video_paths p WHERE
     (p.video_url IS NULL)
     OR (p.new_path IS NULL AND p.video_url !~ '^[0-9a-f-]{36}/')
     OR COALESCE(p.new_path, p.video_url) ~ '[?%#]'
     OR split_part(COALESCE(p.new_path, p.video_url), '/', 1) <> p.user_id::text
     OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='training-videos' AND o.name = COALESCE(p.new_path, p.video_url))),
  'See detail B-H06: strip ?query, URL-decode, move file into <owner uuid>/ or reassign row user_id to the folder owner.'
UNION ALL
SELECT 'H07','INFO','Feed rows containing an e-mail',
  (SELECT count(*) FROM public.community_activities
   WHERE regexp_replace(description, '^\S+@\S+ a terminé: ', 'Un athlète a terminé: ')
         ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'),
  '20260926070000 replaces e-mails with "Un athlète".'
UNION ALL
SELECT 'H08','INFO','Feed rows exposing the free-text workout name',
  (SELECT count(*) FROM public.community_activities WHERE activity_type='workout_completed' AND description ~ ' a terminé: '),
  '20260926070000 rewrites every workout_completed description.'
UNION ALL
SELECT 'H09','INFO','Profiles whose full_name contains "@"',
  (SELECT count(*) FROM public.profiles WHERE full_name LIKE '%@%'),
  'public_display_name() never publishes them; ask users to fix their name.'
UNION ALL
SELECT 'H10','HIGH','UPDATE policies expected by 20260925220000 that do not exist (WITH CHECK silently NOT applied)',
  (SELECT count(*) FROM expected_update_policies e WHERE NOT EXISTS
     (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=e.tbl AND p.policyname=e.pol)),
  'Detail B-H10: rename the live policy or add WITH CHECK manually.'
UNION ALL
SELECT 'H11','HIGH','Extra storage.objects policies on training-videos (or bucket-agnostic) that the migration will NOT drop: premium files stay readable',
  (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
     AND policyname NOT IN ('Anyone can view training videos','Only admins can upload training videos','Only admins can update training videos',
                            'Only admins can delete training videos','Users can view their own sparring videos',
                            'Users can upload their own sparring videos','Users can delete their own sparring videos')
     AND (coalesce(qual,'') || coalesce(with_check,'')) !~ 'sparring-videos'),
  'Review detail B-H11 and drop policies that grant read on training-videos.'
UNION ALL
SELECT 'H12','HIGH','Extra INSERT policies on community_activities / meute_members that survive (forgery / permissive OR)',
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND cmd IN ('INSERT','ALL')
     AND ((tablename='community_activities' AND policyname <> 'Users can create their own activities')
       OR (tablename='meute_members' AND policyname <> 'Owners and admins invite members'))),
  'Drop them in the same maintenance window.'
UNION ALL
SELECT 'H13','HIGH','Trigger function owner differs from create_notification owner (after REVOKE, every workout completion fails)',
  (SELECT (a.proowner <> b.proowner)::int FROM pg_proc a, pg_proc b
   WHERE a.oid='public.create_community_activity_on_workout()'::regprocedure
     AND b.oid='public.create_notification(uuid,text,text,text)'::regprocedure),
  'ALTER FUNCTION … OWNER TO the same role, or GRANT EXECUTE on create_notification to the trigger owner.'
UNION ALL
SELECT 'B10','BLOCKER','korev_private already holds one of the moved functions (20260926080000 would keep the old body)',
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'korev_private'
     AND p.proname IN ('has_role','has_feature_access','is_meute_member','is_meute_owner','get_meute_member_role')),
  'Compare the bodies with public.*; drop the korev_private copies if they are stale.'
UNION ALL
SELECT 'H14','HIGH','Functions outside the migrations calling the guarded helpers (they now get false for another user unless run by service_role)',
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosrc ~ '(has_role|has_feature_access|is_meute_member|is_meute_owner|get_meute_member_role)\s*\('
     AND p.proname NOT IN ('has_role','has_feature_access','is_meute_member','is_meute_owner','get_meute_member_role',
                           'consume_feature_quota','prevent_role_escalation')),
  'Detail B-H14: switch them to korev_private.<fn> if they check another user on purpose.'
UNION ALL
SELECT 'M05','MEDIUM','Legacy tables readable by the client (20260926080000 closes them)',
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND c.relname IN ('organizations','organization_members','organization_invitations','render_usage','documents')),
  'Informational: export them first if anything still reads them.'
-- ----------------------------------------------------------------- MEDIUM ---
UNION ALL
SELECT 'M01','INFO','workouts with status NULL',
  (SELECT count(*) FROM public.workouts WHERE status IS NULL),
  '20260926060000 sets them to completed or paused.'
UNION ALL
SELECT 'M02','MEDIUM','Suspicious meute memberships (self-invited, forced "accepted" at insert, fake owner role, pending with joined_at)',
  (SELECT count(*) FROM public.meute_members m JOIN public.meutes t ON t.id = m.meute_id WHERE
     m.invited_by = m.user_id
     OR (m.invited_by IS NOT NULL AND m.status='accepted' AND m.joined_at = m.invited_at)
     OR (m.role='owner' AND m.user_id <> t.owner_id)
     OR (m.status='pending' AND m.joined_at IS NOT NULL)),
  'Review detail B-M02 (legacy of the old permissive INSERT policy); downgrade roles / reset to pending.'
UNION ALL
SELECT 'M03','MEDIUM','Catalog near-duplicates the seed will create (case/plural variants)',
  (SELECT count(*) FROM seed s WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.name = s.name)
     AND EXISTS (SELECT 1 FROM public.exercises e WHERE lower(rtrim(e.name,'s')) = lower(rtrim(s.name,'s')))),
  'Remove those names from the seed or rename existing rows first (after 20260926070000 used exercises can no longer be deleted).'
UNION ALL
SELECT 'M04','INFO','feature_usage rows above the free limit this month',
  (SELECT count(*) FROM public.feature_usage WHERE month = date_trunc('month', current_date)::date
     AND feature_name IN ('ai_coach','barcode_scan','sparring_analysis') AND usage_count > 3),
  'Paid users are unaffected (monthly limit -1).'
)
SELECT id, severity, check_name, result, fix FROM checks ORDER BY id;

-- ============================ PART B (details) ===============================
-- Run ONE statement at a time. Export the "SAVE" results before migrating.

-- B-VOL: sizes, to size the maintenance window (0.6 s total measured for 60k workouts / 120k workout_exercises / 60k feed rows).
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables
WHERE schemaname='public' ORDER BY n_live_tup DESC;

-- B-SAVE-1 (rollback material): current bodies of the functions the migrations replace.
SELECT p.oid::regprocedure AS fn, pg_get_functiondef(p.oid) AS definition, p.proacl
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN
  ('get_feature_usage','increment_feature_usage','prevent_role_escalation','create_community_activity_on_workout',
   'consume_feature_quota','refund_feature_quota','is_trusted_caller','create_notification','check_subscription_access',
   'sync_stripe_subscription','mark_webhook_processed','is_webhook_processed','get_user_id_by_stripe_customer','increment_video_views');

-- B-SAVE-2 (rollback material): policies and FKs that will be altered/dropped.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies
WHERE (schemaname='storage' AND tablename='objects') OR (schemaname='public' AND tablename IN
  ('profiles','workouts','nutrition_logs','nutrition_goals','workout_journal','notifications','sparring_analyses',
   'meutes','meute_members','community_activities','training_videos','meute_activities'))
ORDER BY 1,2,3;
SELECT conrelid::regclass, conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid IN ('public.meute_members'::regclass,'public.workout_exercises'::regclass) AND contype='f';
SELECT id, public, allowed_mime_types FROM storage.buckets;

-- B-SAVE-3 / B-H06: every uploaded training video, current value and what 20260926010000 will write.
SELECT v.id, v.user_id, v.visibility, v.video_url AS current_value,
       substring(v.video_url FROM '/training-videos/(.+)$') AS will_become,
       EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='training-videos'
               AND o.name = COALESCE(substring(v.video_url FROM '/training-videos/(.+)$'), v.video_url)) AS object_found,
       split_part(COALESCE(substring(v.video_url FROM '/training-videos/(.+)$'), v.video_url),'/',1) = v.user_id::text AS folder_is_owner
FROM public.training_videos v WHERE v.video_type='upload' ORDER BY object_found, folder_is_owner;

-- B-SAVE-4 / B-H01: active workouts that 20260926060000 will set to 'paused' (rk > 1) and the one kept (rk = 1).
SELECT user_id, id, name, status, started_at, created_at,
       row_number() OVER (PARTITION BY user_id ORDER BY COALESCE(started_at, created_at) DESC, id DESC) AS rk
FROM public.workouts WHERE status='active'
  AND user_id IN (SELECT user_id FROM public.workouts WHERE status='active' GROUP BY user_id HAVING count(*) > 1)
ORDER BY user_id, rk;

-- B-H03: journal rows that will reject edits, with the violated rule.
SELECT id, user_id, date, left(title,40) AS title, mood, weight_kg, char_length(notes) AS notes_len,
       NOT (char_length(btrim(title)) BETWEEN 1 AND 200) AS bad_title,
       NOT (notes IS NULL OR char_length(notes) <= 5000) AS bad_notes,
       NOT (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 400) AS bad_weight,
       (mood IS NULL OR mood <> ALL (ARRAY['excellent','good','neutral','tired','bad'])) AS bad_mood
FROM public.workout_journal
WHERE NOT (char_length(btrim(title)) BETWEEN 1 AND 200) OR NOT (notes IS NULL OR char_length(notes) <= 5000)
   OR NOT (weight_kg IS NULL OR weight_kg BETWEEN 20 AND 400)
   OR (mood IS NULL OR mood <> ALL (ARRAY['excellent','good','neutral','tired','bad']));
SELECT mood, count(*) FROM public.workout_journal
WHERE (mood IS NULL OR mood <> ALL (ARRAY['excellent','good','neutral','tired','bad'])) GROUP BY mood ORDER BY 2 DESC;

-- B-H04 / B-H05: nutrition rows out of range.
SELECT id, user_id, date, left(food_name,40) AS food_name, char_length(food_name) AS len, calories, protein_g, carbs_g, fat_g
FROM public.nutrition_logs WHERE NOT (char_length(btrim(food_name)) BETWEEN 1 AND 200) OR NOT (calories BETWEEN 0 AND 20000)
   OR NOT (protein_g BETWEEN 0 AND 2000 AND carbs_g BETWEEN 0 AND 2000 AND fat_g BETWEEN 0 AND 2000);
SELECT * FROM public.nutrition_goals WHERE NOT (daily_calories BETWEEN 500 AND 10000)
   OR NOT (daily_protein_g BETWEEN 0 AND 1000 AND daily_carbs_g BETWEEN 0 AND 2000 AND daily_fat_g BETWEEN 0 AND 1000);

-- B-H07 / B-H08: feed rows that stay sensitive after the migrations.
SELECT id, user_id, activity_type, description FROM public.community_activities
WHERE description ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
   OR (activity_type='workout_completed' AND description ~ ' a terminé: ')
ORDER BY created_at DESC LIMIT 500;

-- B-H10 / B-H11 / B-H12: live policy names to compare with what the migrations expect.
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check FROM pg_policies
WHERE (schemaname='storage' AND tablename='objects')
   OR (schemaname='public' AND (cmd IN ('UPDATE','ALL') OR tablename IN ('community_activities','meute_members')))
ORDER BY 1,2,3;

-- B-M02: suspicious memberships.
SELECT m.*, t.owner_id FROM public.meute_members m JOIN public.meutes t ON t.id = m.meute_id
WHERE m.invited_by = m.user_id OR (m.invited_by IS NOT NULL AND m.status='accepted' AND m.joined_at = m.invited_at)
   OR (m.role='owner' AND m.user_id <> t.owner_id) OR (m.status='pending' AND m.joined_at IS NOT NULL) OR m.role='admin';

-- B03: orphan workout_exercises (only possible with schema drift).
SELECT we.* FROM public.workout_exercises we WHERE NOT EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = we.exercise_id);

-- B04: who holds long transactions right now.
SELECT pid, usename, application_name, state, xact_start, now() - xact_start AS age, left(query, 120) AS query
FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND xact_start < now() - interval '30 seconds' ORDER BY xact_start;

-- B-H14: functions that call the guarded helpers (review each body).
SELECT p.oid::regprocedure AS function, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosrc ~ '(has_role|has_feature_access|is_meute_member|is_meute_owner|get_meute_member_role)\s*\('
ORDER BY 1;
