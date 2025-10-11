-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_activities table
CREATE TABLE public.community_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_activities ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Community activities policies (everyone can see activities)
CREATE POLICY "Everyone can view community activities"
ON public.community_activities
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own activities"
ON public.community_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_community_activities_created ON public.community_activities(created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to create community activity when workout is completed
CREATE OR REPLACE FUNCTION public.create_community_activity_on_workout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for workout completion
CREATE TRIGGER on_workout_completed
AFTER UPDATE ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.create_community_activity_on_workout();