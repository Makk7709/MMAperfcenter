SET lock_timeout = '5s';
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('boxing', 'mma', 'strength', 'cardio', 'custom')),
  ADD COLUMN IF NOT EXISTS intensity TEXT CHECK (intensity IN ('light', 'moderate', 'intense')),
  ADD COLUMN IF NOT EXISTS planned_rounds INTEGER CHECK (planned_rounds BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS round_seconds INTEGER CHECK (round_seconds BETWEEN 10 AND 1800),
  ADD COLUMN IF NOT EXISTS rest_seconds INTEGER CHECK (rest_seconds BETWEEN 0 AND 600),
  ADD COLUMN IF NOT EXISTS rounds_completed INTEGER NOT NULL DEFAULT 0 CHECK (rounds_completed BETWEEN 0 AND 30);
CREATE INDEX IF NOT EXISTS idx_workouts_user_status_completed ON public.workouts (user_id, status, completed_at DESC);
ALTER TABLE public.workout_journal ADD COLUMN IF NOT EXISTS workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_workout_journal_workout_id ON public.workout_journal (workout_id) WHERE workout_id IS NOT NULL;
DROP POLICY IF EXISTS "Journal entries link only own workouts (insert)" ON public.workout_journal;
CREATE POLICY "Journal entries link only own workouts (insert)" ON public.workout_journal AS RESTRICTIVE FOR INSERT
WITH CHECK (workout_id IS NULL OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
DROP POLICY IF EXISTS "Journal entries link only own workouts (update)" ON public.workout_journal;
CREATE POLICY "Journal entries link only own workouts (update)" ON public.workout_journal AS RESTRICTIVE FOR UPDATE
WITH CHECK (workout_id IS NULL OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
INSERT INTO public.exercises (name, category, muscle_groups, instructions) VALUES
('Squat avant', 'Force', '{"Quadriceps", "Fessiers", "Gainage"}', 'Barre posée sur l''avant des épaules, descendre buste droit puis remonter.'),
('Soulevé de terre roumain', 'Force', '{"Ischio-jambiers", "Fessiers", "Lombaires"}', 'Jambes presque tendues, descendre la barre le long des cuisses en reculant les hanches.'),
('Fentes marchées', 'Force', '{"Quadriceps", "Fessiers"}', 'Avancer en fente, genou arrière proche du sol, alterner les jambes.'),
('Hip thrust', 'Force', '{"Fessiers", "Ischio-jambiers"}', 'Dos appuyé sur un banc, pousser les hanches vers le haut avec une charge sur le bassin.'),
('Développé incliné haltères', 'Force', '{"Pectoraux", "Épaules", "Triceps"}', 'Banc incliné, pousser les haltères au-dessus de la poitrine.'),
('Rowing haltère', 'Force', '{"Dorsaux", "Biceps"}', 'Un genou sur le banc, tirer l''haltère vers la hanche.'),
('Tirage Vertical', 'Force', '{"Dorsaux", "Biceps"}', 'Tirer la barre vers le haut de la poitrine, coudes vers le bas.'),
('Pompes', 'Force', '{"Pectoraux", "Triceps", "Gainage"}', 'Corps gainé, descendre la poitrine près du sol puis pousser.'),
('Tractions australiennes', 'Force', '{"Dorsaux", "Biceps"}', 'Sous une barre basse, corps droit, tirer la poitrine vers la barre.'),
('Face pull', 'Force', '{"Épaules", "Trapèzes"}', 'Tirer la corde vers le visage, coudes hauts.'),
('Kettlebell swing', 'Puissance', '{"Fessiers", "Ischio-jambiers", "Lombaires"}', 'Balancer la kettlebell jusqu''à hauteur d''épaules par une extension explosive des hanches.'),
('Box Jumps', 'Puissance', '{"Quadriceps", "Fessiers", "Mollets"}', 'Sauter sur une box en réception amortie, redescendre en marchant.'),
('Squat sauté', 'Puissance', '{"Quadriceps", "Fessiers"}', 'Descendre en squat puis sauter le plus haut possible.'),
('Pompes claquées', 'Puissance', '{"Pectoraux", "Triceps"}', 'Pousser assez fort pour décoller les mains et frapper dans les mains.'),
('Lancer rotatif médecine-ball', 'Puissance', '{"Obliques", "Épaules", "Hanches"}', 'De profil face au mur, lancer le médecine-ball par une rotation des hanches.'),
('Épaulé en puissance', 'Puissance', '{"Fessiers", "Trapèzes", "Quadriceps"}', 'Monter la barre du sol aux épaules en une extension explosive.'),
('Burpees', 'Conditionnement', '{"Corps entier"}', 'Planche, pompe, retour pieds sous les hanches, saut.'),
('Sprawl', 'Conditionnement', '{"Corps entier"}', 'Lancer les jambes en arrière hanches basses comme pour défendre une amenée au sol, puis revenir en garde.'),
('Mountain Climbers', 'Conditionnement', '{"Gainage", "Épaules"}', 'En planche, ramener les genoux vers la poitrine en alternance rapide.'),
('Thrusters', 'Conditionnement', '{"Quadriceps", "Épaules"}', 'Squat avant enchaîné avec un développé au-dessus de la tête.'),
('Relevés de jambes suspendu', 'Gainage', '{"Abdominaux", "Fléchisseurs de hanche"}', 'Suspendu à une barre, monter les jambes sans balancer.'),
('Russian Twist', 'Gainage', '{"Obliques", "Abdominaux"}', 'Assis buste incliné, pieds décollés, tourner le buste de chaque côté.'),
('Roue abdominale', 'Gainage', '{"Abdominaux", "Dorsaux"}', 'À genoux, rouler vers l''avant dos plat puis revenir.'),
('Pallof press', 'Gainage', '{"Obliques", "Gainage"}', 'De profil à l''élastique, pousser les mains devant soi sans laisser le buste tourner.')
ON CONFLICT (name) DO NOTHING;

UPDATE public.workout_journal SET mood = CASE lower(btrim(mood)) WHEN 'excellent' THEN 'excellent' WHEN 'great' THEN 'excellent' WHEN 'good' THEN 'good' WHEN 'happy' THEN 'good' WHEN 'tired' THEN 'tired' WHEN 'bad' THEN 'bad' ELSE 'neutral' END
WHERE mood <> ALL (ARRAY['excellent', 'good', 'neutral', 'tired', 'bad']);
UPDATE public.workout_journal SET title = CASE WHEN btrim(coalesce(title, '')) = '' THEN 'Sans titre' ELSE left(btrim(title), 200) END
WHERE title IS NULL OR NOT (char_length(btrim(title)) BETWEEN 1 AND 200);
UPDATE public.workout_journal SET notes = left(notes, 5000) WHERE char_length(notes) > 5000;
UPDATE public.workout_journal SET weight_kg = NULL WHERE NOT (weight_kg BETWEEN 20 AND 400);
UPDATE public.nutrition_logs SET food_name = CASE WHEN btrim(coalesce(food_name, '')) = '' THEN 'Aliment' ELSE left(btrim(food_name), 200) END
WHERE food_name IS NULL OR NOT (char_length(btrim(food_name)) BETWEEN 1 AND 200);
UPDATE public.nutrition_logs SET calories = least(greatest(coalesce(calories, 0), 0), 20000), protein_g = least(greatest(coalesce(protein_g, 0), 0), 2000), carbs_g = least(greatest(coalesce(carbs_g, 0), 0), 2000), fat_g = least(greatest(coalesce(fat_g, 0), 0), 2000)
WHERE calories IS NULL OR protein_g IS NULL OR carbs_g IS NULL OR fat_g IS NULL OR NOT (calories BETWEEN 0 AND 20000) OR NOT (protein_g BETWEEN 0 AND 2000 AND carbs_g BETWEEN 0 AND 2000 AND fat_g BETWEEN 0 AND 2000);
UPDATE public.nutrition_goals SET
  daily_calories = CASE WHEN daily_calories BETWEEN 500 AND 10000 THEN daily_calories ELSE 2000 END,
  daily_protein_g = CASE WHEN daily_protein_g BETWEEN 0 AND 1000 THEN daily_protein_g ELSE 150 END,
  daily_carbs_g = CASE WHEN daily_carbs_g BETWEEN 0 AND 2000 THEN daily_carbs_g ELSE 250 END,
  daily_fat_g = CASE WHEN daily_fat_g BETWEEN 0 AND 1000 THEN daily_fat_g ELSE 70 END
WHERE NOT (daily_calories BETWEEN 500 AND 10000) OR NOT (daily_protein_g BETWEEN 0 AND 1000 AND daily_carbs_g BETWEEN 0 AND 2000 AND daily_fat_g BETWEEN 0 AND 1000);
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT * FROM (VALUES
      ('nutrition_logs','nutrition_logs_food_name_length','char_length(btrim(food_name)) BETWEEN 1 AND 200'),
      ('nutrition_logs','nutrition_logs_calories_range','calories BETWEEN 0 AND 20000'),
      ('nutrition_logs','nutrition_logs_macros_range','protein_g BETWEEN 0 AND 2000 AND carbs_g BETWEEN 0 AND 2000 AND fat_g BETWEEN 0 AND 2000'),
      ('nutrition_goals','nutrition_goals_calories_range','daily_calories BETWEEN 500 AND 10000'),
      ('nutrition_goals','nutrition_goals_macros_range','daily_protein_g BETWEEN 0 AND 1000 AND daily_carbs_g BETWEEN 0 AND 2000 AND daily_fat_g BETWEEN 0 AND 1000'),
      ('workout_journal','workout_journal_title_length','char_length(btrim(title)) BETWEEN 1 AND 200'),
      ('workout_journal','workout_journal_notes_length','notes IS NULL OR char_length(notes) <= 5000'),
      ('workout_journal','workout_journal_weight_range','weight_kg IS NULL OR weight_kg BETWEEN 20 AND 400'),
      ('workout_journal','workout_journal_mood_values','mood IN (''excellent'', ''good'', ''neutral'', ''tired'', ''bad'')')
    ) AS t(tbl, name, expr)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name AND conrelid = format('public.%I', c.tbl)::regclass) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s)', c.tbl, c.name, c.expr);
    ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name AND conrelid = format('public.%I', c.tbl)::regclass AND NOT convalidated) THEN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', c.tbl, c.name);
    END IF;
  END LOOP;
END; $$;

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS perceived_effort SMALLINT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workouts_perceived_effort_range' AND conrelid = 'public.workouts'::regclass) THEN
    ALTER TABLE public.workouts ADD CONSTRAINT workouts_perceived_effort_range CHECK (perceived_effort BETWEEN 1 AND 10);
  END IF;
END; $$;

DO $$ BEGIN LOCK TABLE public.workouts IN SHARE ROW EXCLUSIVE MODE; END; $$;
UPDATE public.workouts SET status = CASE WHEN completed_at IS NOT NULL THEN 'completed' ELSE 'paused' END WHERE status IS NULL;
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY CASE WHEN started_at IS NULL OR started_at > now() + interval '5 minutes' THEN created_at ELSE started_at END DESC, id DESC) AS rank
  FROM public.workouts WHERE status = 'active')
UPDATE public.workouts w SET status = 'paused' FROM ranked r WHERE w.id = r.id AND r.rank > 1;
CREATE UNIQUE INDEX IF NOT EXISTS workouts_one_active_per_user ON public.workouts (user_id) WHERE status = 'active';