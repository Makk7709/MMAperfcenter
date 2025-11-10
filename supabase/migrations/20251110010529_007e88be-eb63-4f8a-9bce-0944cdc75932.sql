-- Add enums for technique type and difficulty level
CREATE TYPE public.technique_type AS ENUM ('pied', 'poings', 'combo');
CREATE TYPE public.difficulty_level AS ENUM ('debutant', 'intermediaire', 'avance', 'expert');

-- Add new columns to training_videos table
ALTER TABLE public.training_videos 
ADD COLUMN technique_type public.technique_type,
ADD COLUMN difficulty_level public.difficulty_level;

-- Create indexes for better filtering performance
CREATE INDEX idx_training_videos_technique ON public.training_videos(technique_type);
CREATE INDEX idx_training_videos_difficulty ON public.training_videos(difficulty_level);
CREATE INDEX idx_training_videos_category ON public.training_videos(category);