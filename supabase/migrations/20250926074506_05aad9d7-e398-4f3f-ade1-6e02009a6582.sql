-- Create workouts table to track workout sessions
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER,
  total_volume_kg NUMERIC DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercises table for exercise definitions
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  muscle_groups TEXT[] DEFAULT '{}',
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_exercises table to link exercises to workouts
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  rest_seconds INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workout_id, exercise_id, order_index)
);

-- Create sets table to track individual sets
CREATE TABLE public.sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_exercise_id UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC DEFAULT 0,
  reps INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workout_exercise_id, set_number)
);

-- Enable Row Level Security
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workouts
CREATE POLICY "Users can view their own workouts" 
ON public.workouts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts" 
ON public.workouts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" 
ON public.workouts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" 
ON public.workouts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for exercises (read-only for users)
CREATE POLICY "Users can view all exercises" 
ON public.exercises 
FOR SELECT 
USING (true);

-- Create RLS policies for workout_exercises
CREATE POLICY "Users can view their workout exercises" 
ON public.workout_exercises 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = workout_exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

CREATE POLICY "Users can create workout exercises for their workouts" 
ON public.workout_exercises 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = workout_exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

CREATE POLICY "Users can update their workout exercises" 
ON public.workout_exercises 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = workout_exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their workout exercises" 
ON public.workout_exercises 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.workouts 
  WHERE workouts.id = workout_exercises.workout_id 
  AND workouts.user_id = auth.uid()
));

-- Create RLS policies for sets
CREATE POLICY "Users can view their sets" 
ON public.sets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workout_exercises we
  JOIN public.workouts w ON w.id = we.workout_id
  WHERE we.id = sets.workout_exercise_id 
  AND w.user_id = auth.uid()
));

CREATE POLICY "Users can create sets for their workouts" 
ON public.sets 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workout_exercises we
  JOIN public.workouts w ON w.id = we.workout_id
  WHERE we.id = sets.workout_exercise_id 
  AND w.user_id = auth.uid()
));

CREATE POLICY "Users can update their sets" 
ON public.sets 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.workout_exercises we
  JOIN public.workouts w ON w.id = we.workout_id
  WHERE we.id = sets.workout_exercise_id 
  AND w.user_id = auth.uid()
));

CREATE POLICY "Users can delete their sets" 
ON public.sets 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.workout_exercises we
  JOIN public.workouts w ON w.id = we.workout_id
  WHERE we.id = sets.workout_exercise_id 
  AND w.user_id = auth.uid()
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_workouts_updated_at
BEFORE UPDATE ON public.workouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_exercises_updated_at
BEFORE UPDATE ON public.workout_exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sets_updated_at
BEFORE UPDATE ON public.sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some basic exercises
INSERT INTO public.exercises (name, category, muscle_groups, instructions) VALUES
('Développé couché', 'Force', '{"Pectoraux", "Triceps", "Épaules"}', 'Allongé sur un banc, descendre la barre jusqu''à la poitrine puis pousser vers le haut.'),
('Tractions', 'Force', '{"Dorsaux", "Biceps"}', 'Suspendre à une barre, tirer le corps vers le haut jusqu''à ce que le menton dépasse la barre.'),
('Squat', 'Force', '{"Quadriceps", "Fessiers", "Ischio-jambiers"}', 'Debout, descendre en fléchissant les genoux et hanches, puis remonter.'),
('Soulevé de terre', 'Force', '{"Dorsaux", "Fessiers", "Ischio-jambiers", "Trapèzes"}', 'Soulever une barre du sol en gardant le dos droit.'),
('Développé militaire', 'Force', '{"Épaules", "Triceps"}', 'Debout, pousser une barre au-dessus de la tête.'),
('Rowing barre', 'Force', '{"Dorsaux", "Biceps", "Rhomboïdes"}', 'Penché vers l''avant, tirer une barre vers l''abdomen.'),
('Dips', 'Force', '{"Pectoraux", "Triceps", "Épaules"}', 'Suspendre entre deux barres parallèles, descendre et remonter le corps.'),
('Curl biceps', 'Force', '{"Biceps"}', 'Fléchir les avant-bras pour amener les haltères vers les épaules.');