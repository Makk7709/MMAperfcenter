-- Create nutrition_logs table
CREATE TABLE public.nutrition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own nutrition logs"
ON public.nutrition_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition logs"
ON public.nutrition_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition logs"
ON public.nutrition_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition logs"
ON public.nutrition_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_nutrition_logs_updated_at
BEFORE UPDATE ON public.nutrition_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create nutrition_goals table
CREATE TABLE public.nutrition_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calories INTEGER NOT NULL DEFAULT 2000,
  daily_protein_g INTEGER NOT NULL DEFAULT 150,
  daily_carbs_g INTEGER NOT NULL DEFAULT 250,
  daily_fat_g INTEGER NOT NULL DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own nutrition goals"
ON public.nutrition_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition goals"
ON public.nutrition_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition goals"
ON public.nutrition_goals
FOR UPDATE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_nutrition_goals_updated_at
BEFORE UPDATE ON public.nutrition_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();