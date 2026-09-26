-- Bornes de valeurs sur le journal alimentaire, les objectifs et le carnet.
--
-- Les formulaires limitent déjà la saisie ; ces contraintes empêchent un appel
-- direct à l'API d'enregistrer des valeurs absurdes (calories négatives, nom
-- de 1 Mo…) qui fausseraient statistiques et Coach IA.
--
-- NOT VALID : seules les nouvelles lignes et les modifications sont
-- contrôlées, pour ne pas bloquer la migration sur des données existantes.
-- Après nettoyage éventuel : ALTER TABLE … VALIDATE CONSTRAINT ….

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
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID', c.tbl, c.name, c.expr);
    END IF;
  END LOOP;
END;
$$;
