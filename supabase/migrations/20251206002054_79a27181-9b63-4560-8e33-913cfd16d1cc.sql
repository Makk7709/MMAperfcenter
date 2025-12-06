-- Create storage bucket for sparring videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sparring-videos', 'sparring-videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'])
ON CONFLICT (id) DO NOTHING;

-- Create policies for sparring videos bucket
CREATE POLICY "Users can upload their own sparring videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sparring-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own sparring videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'sparring-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own sparring videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'sparring-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for sparring analyses
CREATE TABLE public.sparring_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  video_name TEXT NOT NULL,
  analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sparring_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own analyses"
ON public.sparring_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
ON public.sparring_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
ON public.sparring_analyses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
ON public.sparring_analyses FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_sparring_analyses_updated_at
BEFORE UPDATE ON public.sparring_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();