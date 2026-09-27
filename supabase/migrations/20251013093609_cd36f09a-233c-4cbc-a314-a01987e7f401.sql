-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- NOTE: This migration historically inserted a hard-coded admin UUID for the
-- founder account. For transmission/audit purposes this nominative INSERT
-- has been moved to `supabase/seed/seed-admin.example.sql` (not run by the
-- migration pipeline). The production database already contains the original
-- row; this change does not affect existing data.
-- To bootstrap a fresh environment, copy the seed file, fill in the target
-- UUID and execute it manually via the Supabase SQL editor or CLI.

-- Update RLS policies for training_videos to restrict to admins
DROP POLICY IF EXISTS "Users can create their own training videos" ON public.training_videos;
DROP POLICY IF EXISTS "Users can update their own training videos" ON public.training_videos;
DROP POLICY IF EXISTS "Users can delete their own training videos" ON public.training_videos;

CREATE POLICY "Only admins can create training videos"
ON public.training_videos
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update training videos"
ON public.training_videos
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete training videos"
ON public.training_videos
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update storage policies for training videos
DROP POLICY IF EXISTS "Users can upload their own training videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own training videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own training videos" ON storage.objects;

CREATE POLICY "Only admins can upload training videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'training-videos' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only admins can update training videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'training-videos' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only admins can delete training videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'training-videos' AND
  public.has_role(auth.uid(), 'admin')
);