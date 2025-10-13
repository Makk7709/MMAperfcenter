-- Create training_videos table
CREATE TABLE public.training_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL CHECK (video_type IN ('upload', 'youtube')),
  video_url TEXT,
  youtube_url TEXT,
  duration_seconds INTEGER,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'combat', 'strength', 'cardio', 'flexibility', 'technique')),
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all training videos"
ON public.training_videos
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own training videos"
ON public.training_videos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training videos"
ON public.training_videos
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training videos"
ON public.training_videos
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_training_videos_updated_at
BEFORE UPDATE ON public.training_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for training videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', true);

-- Storage policies for training videos
CREATE POLICY "Users can upload their own training videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'training-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view training videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'training-videos');

CREATE POLICY "Users can update their own training videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'training-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own training videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'training-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);