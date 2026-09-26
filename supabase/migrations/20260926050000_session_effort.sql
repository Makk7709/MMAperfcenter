-- Effort perçu de la séance (échelle CR-10 de Borg, 1 à 10), saisi au bilan.
--
-- Charge d'entraînement d'une séance = effort perçu × durée en minutes
-- (méthode session-RPE de Foster). Les séances antérieures n'ont pas
-- d'effort : l'application le déduit de l'intensité choisie au démarrage.

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS perceived_effort SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workouts_perceived_effort_range' AND conrelid = 'public.workouts'::regclass
  ) THEN
    ALTER TABLE public.workouts
      ADD CONSTRAINT workouts_perceived_effort_range CHECK (perceived_effort BETWEEN 1 AND 10);
  END IF;
END;
$$;
