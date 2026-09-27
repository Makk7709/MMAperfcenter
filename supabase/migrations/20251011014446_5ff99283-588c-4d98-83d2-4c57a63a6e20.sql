-- Drop trigger first, then functions
DROP TRIGGER IF EXISTS on_workout_completed ON public.workouts;
DROP FUNCTION IF EXISTS public.create_community_activity_on_workout() CASCADE;
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT) CASCADE;

-- Recreate create_notification function with search_path
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Recreate create_community_activity_on_workout function with search_path
CREATE OR REPLACE FUNCTION public.create_community_activity_on_workout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- Only create activity when workout is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get user name from profiles
    SELECT COALESCE(full_name, email) INTO v_user_name
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Create community activity
    INSERT INTO public.community_activities (user_id, activity_type, description, workout_id)
    VALUES (
      NEW.user_id,
      'workout_completed',
      COALESCE(v_user_name, 'Un utilisateur') || ' a terminé: ' || NEW.name,
      NEW.id
    );
    
    -- Create notification for the user
    PERFORM public.create_notification(
      NEW.user_id,
      'Workout terminé! 💪',
      'Félicitations! Vous avez terminé votre séance: ' || NEW.name,
      'success'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_workout_completed
AFTER UPDATE ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.create_community_activity_on_workout();