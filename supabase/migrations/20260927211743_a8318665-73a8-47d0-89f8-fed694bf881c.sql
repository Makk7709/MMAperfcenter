SET lock_timeout = '5s';
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS planned_minutes INTEGER;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workouts_planned_minutes_range' AND conrelid = 'public.workouts'::regclass) THEN
    ALTER TABLE public.workouts ADD CONSTRAINT workouts_planned_minutes_range CHECK (planned_minutes BETWEEN 1 AND 240);
  END IF;
END $$;
DO $$ DECLARE fk record; BEGIN
  FOR fk IN SELECT c.conname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.workout_exercises'::regclass AND c.contype = 'f' AND a.attname = 'exercise_id'
  LOOP EXECUTE format('ALTER TABLE public.workout_exercises DROP CONSTRAINT %I', fk.conname); END LOOP;
END $$;
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT;
DROP POLICY IF EXISTS "Team activities link only own workouts" ON public.meute_activities;
CREATE POLICY "Team activities link only own workouts" ON public.meute_activities AS RESTRICTIVE FOR INSERT
WITH CHECK (workout_id IS NULL OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));
CREATE OR REPLACE FUNCTION public.public_display_name(_user_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT left(nullif(btrim(full_name), ''), 60) FROM public.profiles WHERE id = _user_id AND position('@' IN coalesce(full_name, '')) = 0;
$$;
CREATE OR REPLACE FUNCTION public.session_type_label(_session_type text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _session_type WHEN 'boxing' THEN 'séance de boxe' WHEN 'mma' THEN 'séance de MMA' WHEN 'strength' THEN 'séance de musculation' WHEN 'cardio' THEN 'séance de cardio' ELSE 'séance d''entraînement' END;
$$;
REVOKE EXECUTE ON FUNCTION public.public_display_name(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.session_type_label(text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.create_community_activity_on_workout() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NOT EXISTS (SELECT 1 FROM public.community_activities WHERE workout_id = NEW.id AND activity_type = 'workout_completed')
     AND (SELECT count(*) FROM public.community_activities WHERE user_id = NEW.user_id AND activity_type = 'workout_completed' AND created_at > now() - interval '1 day') < 10 THEN
    INSERT INTO public.community_activities (user_id, activity_type, description, workout_id)
    VALUES (NEW.user_id, 'workout_completed', COALESCE(public.public_display_name(NEW.user_id), 'Un athlète') || ' a terminé une ' || public.session_type_label(NEW.session_type), NEW.id);
    PERFORM public.create_notification(NEW.user_id, 'Séance terminée 💪', 'Bravo, vous avez terminé votre séance : ' || left(NEW.name, 80), 'success');
  END IF;
  RETURN NEW;
END; $$;
UPDATE public.community_activities ca
SET description = COALESCE(public.public_display_name(ca.user_id), 'Un athlète') || ' a terminé une ' || public.session_type_label((SELECT w.session_type FROM public.workouts w WHERE w.id = ca.workout_id))
WHERE ca.activity_type = 'workout_completed';
UPDATE public.community_activities SET description = regexp_replace(description, '[^[:space:]]+@[^[:space:]]+', 'Un athlète', 'g') WHERE description ~ '[^[:space:]]+@[^[:space:]]+';
CREATE INDEX IF NOT EXISTS workout_exercises_exercise_id_idx ON public.workout_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS community_activities_workout_id_idx ON public.community_activities (workout_id);
CREATE INDEX IF NOT EXISTS community_activities_user_id_idx ON public.community_activities (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meute_activities_meute_created_idx ON public.meute_activities (meute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meute_activities_workout_id_idx ON public.meute_activities (workout_id);
CREATE INDEX IF NOT EXISTS sparring_analyses_user_created_idx ON public.sparring_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meute_members_user_status_idx ON public.meute_members (user_id, status);