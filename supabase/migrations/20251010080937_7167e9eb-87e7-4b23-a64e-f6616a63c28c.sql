-- Create workout_journal table for tracking workout notes and feelings
CREATE TABLE public.workout_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  notes TEXT,
  mood TEXT NOT NULL DEFAULT 'neutral',
  energy_level INTEGER NOT NULL DEFAULT 5 CHECK (energy_level >= 1 AND energy_level <= 10),
  weight_kg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workout_journal ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own journal entries"
ON public.workout_journal
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries"
ON public.workout_journal
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
ON public.workout_journal
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
ON public.workout_journal
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_workout_journal_user_date ON public.workout_journal(user_id, date DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workout_journal_updated_at
BEFORE UPDATE ON public.workout_journal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();