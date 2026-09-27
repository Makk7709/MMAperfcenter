-- Échoue vite au lieu de bloquer connexions et requêtes derrière un verrou :
-- en cas d'échec, relancer la migration un peu plus tard.
SET lock_timeout = '5s';

-- Bornes de valeurs sur le journal alimentaire, les objectifs et le carnet.
--
-- Les formulaires limitent déjà la saisie ; ces contraintes empêchent un appel
-- direct à l'API d'enregistrer des valeurs absurdes (calories négatives, nom
-- de 1 Mo…) qui fausseraient statistiques et Coach IA.
--
-- Les lignes existantes hors bornes sont d'abord ramenées dans les bornes :
-- une contrainte non validée rendrait ces lignes impossibles à modifier depuis
-- l'app (toute mise à jour échouerait).

-- ---- Nettoyage ------------------------------------------------------------------
UPDATE public.workout_journal SET mood = CASE lower(btrim(mood))
    WHEN 'excellent' THEN 'excellent' WHEN 'great' THEN 'excellent'
    WHEN 'good' THEN 'good' WHEN 'happy' THEN 'good'
    WHEN 'tired' THEN 'tired' WHEN 'bad' THEN 'bad'
    ELSE 'neutral' END
WHERE mood <> ALL (ARRAY['excellent', 'good', 'neutral', 'tired', 'bad']);

UPDATE public.workout_journal
SET title = CASE WHEN btrim(coalesce(title, '')) = '' THEN 'Sans titre' ELSE left(btrim(title), 200) END
WHERE title IS NULL OR NOT (char_length(btrim(title)) BETWEEN 1 AND 200);

UPDATE public.workout_journal SET notes = left(notes, 5000) WHERE char_length(notes) > 5000;
UPDATE public.workout_journal SET weight_kg = NULL WHERE NOT (weight_kg BETWEEN 20 AND 400);

UPDATE public.nutrition_logs
SET food_name = CASE WHEN btrim(coalesce(food_name, '')) = '' THEN 'Aliment' ELSE left(btrim(food_name), 200) END
WHERE food_name IS NULL OR NOT (char_length(btrim(food_name)) BETWEEN 1 AND 200);

UPDATE public.nutrition_logs
SET calories  = least(greatest(coalesce(calories, 0), 0), 20000),
    protein_g = least(greatest(coalesce(protein_g, 0), 0), 2000),
    carbs_g   = least(greatest(coalesce(carbs_g, 0), 0), 2000),
    fat_g     = least(greatest(coalesce(fat_g, 0), 0), 2000)
WHERE calories IS NULL OR protein_g IS NULL OR carbs_g IS NULL OR fat_g IS NULL
   OR NOT (calories BETWEEN 0 AND 20000)
   OR NOT (protein_g BETWEEN 0 AND 2000 AND carbs_g BETWEEN 0 AND 2000 AND fat_g BETWEEN 0 AND 2000);

-- Hors bornes : valeur par défaut de l'app.
UPDATE public.nutrition_goals SET
  daily_calories  = CASE WHEN daily_calories  BETWEEN 500 AND 10000 THEN daily_calories  ELSE 2000 END,
  daily_protein_g = CASE WHEN daily_protein_g BETWEEN 0 AND 1000    THEN daily_protein_g ELSE 150 END,
  daily_carbs_g   = CASE WHEN daily_carbs_g   BETWEEN 0 AND 2000    THEN daily_carbs_g   ELSE 250 END,
  daily_fat_g     = CASE WHEN daily_fat_g     BETWEEN 0 AND 1000    THEN daily_fat_g     ELSE 70 END
WHERE NOT (daily_calories BETWEEN 500 AND 10000)
   OR NOT (daily_protein_g BETWEEN 0 AND 1000 AND daily_carbs_g BETWEEN 0 AND 2000 AND daily_fat_g BETWEEN 0 AND 1000);

-- ---- Contraintes -------------------------------------------------------------------
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('nutrition_logs',  'nutrition_logs_food_name_length', 'char_length(btrim(food_name)) BETWEEN 1 AND 200'),
      ('nutrition_logs',  'nutrition_logs_calories_range',   'calories BETWEEN 0 AND 20000'),
      ('nutrition_logs',  'nutrition_logs_macros_range',     'protein_g BETWEEN 0 AND 2000 AND carbs_g BETWEEN 0 AND 2000 AND fat_g BETWEEN 0 AND 2000'),
      ('nutrition_goals', 'nutrition_goals_calories_range',  'daily_calories BETWEEN 500 AND 10000'),
      ('nutrition_goals', 'nutrition_goals_macros_range',    'daily_protein_g BETWEEN 0 AND 1000 AND daily_carbs_g BETWEEN 0 AND 2000 AND daily_fat_g BETWEEN 0 AND 1000'),
      ('workout_journal', 'workout_journal_title_length',    'char_length(btrim(title)) BETWEEN 1 AND 200'),
      ('workout_journal', 'workout_journal_notes_length',    'notes IS NULL OR char_length(notes) <= 5000'),
      ('workout_journal', 'workout_journal_weight_range',    'weight_kg IS NULL OR weight_kg BETWEEN 20 AND 400'),
      ('workout_journal', 'workout_journal_mood_values',     'mood IN (''excellent'', ''good'', ''neutral'', ''tired'', ''bad'')')
    ) AS t(tbl, name, expr)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = c.name AND conrelid = format('public.%I', c.tbl)::regclass
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s)', c.tbl, c.name, c.expr);
    ELSIF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = c.name AND conrelid = format('public.%I', c.tbl)::regclass AND NOT convalidated
    ) THEN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', c.tbl, c.name);
    END IF;
  END LOOP;
END;
$$;
