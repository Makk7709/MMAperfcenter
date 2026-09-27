-- Ajouter les colonnes aux vidéos d'entraînement
ALTER TABLE public.training_videos 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'premium';

ALTER TABLE public.training_videos 
ADD COLUMN IF NOT EXISTS coach_name text;

ALTER TABLE public.training_videos 
ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- Mettre à jour les politiques RLS pour les vidéos
DROP POLICY IF EXISTS "Users can view all training videos" ON public.training_videos;

-- Les utilisateurs peuvent voir les vidéos publiques ou premium selon leur abonnement
CREATE POLICY "Users can view training videos based on visibility"
ON public.training_videos
FOR SELECT
USING (
  visibility = 'public' 
  OR (
    visibility = 'premium' 
    AND EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = auth.uid() 
      AND plan IN ('pro', 'elite', 'sensei') 
      AND status = 'active'
    )
  )
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'coach')
);

-- Mettre à jour la politique d'insertion pour inclure les coachs
DROP POLICY IF EXISTS "Only admins can create training videos" ON public.training_videos;

CREATE POLICY "Admins and coaches can create training videos"
ON public.training_videos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coach')
);

-- Mettre à jour la politique de mise à jour pour inclure les coachs
DROP POLICY IF EXISTS "Only admins can update training videos" ON public.training_videos;

CREATE POLICY "Admins and coaches can update training videos"
ON public.training_videos
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coach')
);

-- Mettre à jour la politique de suppression pour inclure les coachs
DROP POLICY IF EXISTS "Only admins can delete training videos" ON public.training_videos;

CREATE POLICY "Admins and coaches can delete training videos"
ON public.training_videos
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coach')
);

-- Créer une fonction pour incrémenter les vues
CREATE OR REPLACE FUNCTION public.increment_video_views(video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE training_videos
  SET views_count = views_count + 1
  WHERE id = video_id;
END;
$$;