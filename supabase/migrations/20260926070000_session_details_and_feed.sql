-- Détails de séance et fil communautaire.

-- ---- 1. Durée visée ------------------------------------------------------------
-- Choisie au démarrage (« Express 5 min », curseur « Durée visée ») et affichée
-- pendant la séance.
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS planned_minutes INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workouts_planned_minutes_range'
      AND conrelid = 'public.workouts'::regclass
  ) THEN
    ALTER TABLE public.workouts
      ADD CONSTRAINT workouts_planned_minutes_range CHECK (planned_minutes BETWEEN 1 AND 240);
  END IF;
END $$;

-- ---- 2. Un exercice du catalogue utilisé ne peut plus effacer l'historique -----
-- ON DELETE CASCADE supprimait l'exercice de toutes les séances passées de tous
-- les utilisateurs (et laissait total_volume_kg incohérent).
DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.workout_exercises'::regclass
      AND c.contype = 'f'
      AND a.attname = 'exercise_id'
  LOOP
    EXECUTE format('ALTER TABLE public.workout_exercises DROP CONSTRAINT %I', fk.conname);
  END LOOP;
END $$;

ALTER TABLE public.workout_exercises
  ADD CONSTRAINT workout_exercises_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT;

-- ---- 3. Activité de team : seulement ses propres séances -------------------------
DROP POLICY IF EXISTS "Team activities link only own workouts" ON public.meute_activities;
CREATE POLICY "Team activities link only own workouts"
ON public.meute_activities
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  workout_id IS NULL
  OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
);

-- ---- 4. Fil communautaire : type de séance, jamais le nom saisi -----------------
-- Le fil est lu par tous les membres connectés : le nom libre d'une séance
-- (« rééducation genou », etc.) reste privé, seul son type est publié.
CREATE OR REPLACE FUNCTION public.create_community_activity_on_workout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_label TEXT;
BEGIN
  -- Une séance n'est publiée qu'une fois, même si son statut bascule en boucle.
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NOT EXISTS (
       SELECT 1 FROM public.community_activities
       WHERE workout_id = NEW.id AND activity_type = 'workout_completed'
     ) THEN
    SELECT left(nullif(btrim(full_name), ''), 60) INTO v_user_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    v_label := CASE NEW.session_type
      WHEN 'boxing' THEN 'séance de boxe'
      WHEN 'mma' THEN 'séance de MMA'
      WHEN 'strength' THEN 'séance de musculation'
      WHEN 'cardio' THEN 'séance de cardio'
      ELSE 'séance d''entraînement'
    END;

    INSERT INTO public.community_activities (user_id, activity_type, description, workout_id)
    VALUES (
      NEW.user_id,
      'workout_completed',
      COALESCE(v_user_name, 'Un athlète') || ' a terminé une ' || v_label,
      NEW.id
    );

    PERFORM public.create_notification(
      NEW.user_id,
      'Séance terminée 💪',
      'Bravo, vous avez terminé votre séance : ' || left(NEW.name, 80),
      'success'
    );
  END IF;

  RETURN NEW;
END;
$$;
