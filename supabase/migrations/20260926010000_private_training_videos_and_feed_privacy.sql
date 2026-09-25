-- ============================================================================
-- Bloquants du second audit (2026-09-26)
--
-- 1. Vidéos d'entraînement : le bucket devient privé et la lecture d'un
--    fichier suit la visibilité de la ligne training_videos (premium compris).
-- 2. Fil communautaire : plus aucune adresse e-mail dans les descriptions.
--
-- Idempotent : peut être rejoué sans effet de bord.
-- ============================================================================

-- ---- 1. Vidéos d'entraînement privées --------------------------------------
-- video_url contient désormais le chemin de l'objet dans le bucket (et non
-- plus une URL publique) : on convertit les lignes existantes.
UPDATE public.training_videos
SET video_url = substring(video_url FROM '/training-videos/(.+)$')
WHERE video_type = 'upload'
  AND video_url ~ '/training-videos/.+$';

UPDATE storage.buckets SET public = false WHERE id = 'training-videos';

DROP POLICY IF EXISTS "Anyone can view training videos" ON storage.objects;
DROP POLICY IF EXISTS "Training video files follow table visibility" ON storage.objects;

-- La sous-requête est soumise au RLS de training_videos : un fichier n'est
-- lisible que si l'appelant peut voir la vidéo qui le référence. La ligne doit
-- appartenir au propriétaire du dossier : sans cela, une ligne publique créée
-- par un coach et pointant vers le fichier premium d'un autre le rendrait public.
CREATE POLICY "Training video files follow table visibility"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-videos'
  AND EXISTS (
    SELECT 1
    FROM public.training_videos v
    WHERE v.video_type = 'upload'
      AND v.video_url = objects.name
      AND v.user_id::text = (storage.foldername(objects.name))[1]
  )
);

-- Supprimer un objet exige de pouvoir le lire : sans cette politique, un
-- fichier orphelin (sans ligne) ne pourrait plus être effacé.
DROP POLICY IF EXISTS "Admins and coaches read their training video files" ON storage.objects;

CREATE POLICY "Admins and coaches read their training video files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-videos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);

-- Table : un coach ne crée et ne gère que ses propres vidéos, l'admin gère tout.
DROP POLICY IF EXISTS "Admins and coaches can create training videos" ON public.training_videos;
DROP POLICY IF EXISTS "Admins and coaches can update training videos" ON public.training_videos;
DROP POLICY IF EXISTS "Admins and coaches can delete training videos" ON public.training_videos;

CREATE POLICY "Admins and coaches can create training videos"
ON public.training_videos
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'))
);

CREATE POLICY "Admins and coaches can update training videos"
ON public.training_videos
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'coach') AND user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'coach') AND user_id = auth.uid())
);

CREATE POLICY "Admins and coaches can delete training videos"
ON public.training_videos
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'coach') AND user_id = auth.uid())
);

-- Stockage : dépôt dans son propre dossier ; un coach ne touche qu'à ses
-- fichiers, l'admin à tous.
DROP POLICY IF EXISTS "Only admins can upload training videos" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update training videos" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete training videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coaches upload training videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coaches update training videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coaches delete training videos" ON storage.objects;

CREATE POLICY "Admins and coaches upload training videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'))
);

CREATE POLICY "Admins and coaches update training videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-videos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)
  )
)
WITH CHECK (
  bucket_id = 'training-videos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);

CREATE POLICY "Admins and coaches delete training videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-videos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)
  )
);

-- ---- 2. Fil communautaire sans e-mail ---------------------------------------
CREATE OR REPLACE FUNCTION public.create_community_activity_on_workout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- Une séance n'est publiée qu'une fois, même si son statut bascule en boucle.
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NOT EXISTS (
       SELECT 1 FROM public.community_activities
       WHERE workout_id = NEW.id AND activity_type = 'workout_completed'
     ) THEN
    -- Le fil est lu par tous les membres : seul le nom affiché y figure,
    -- jamais l'adresse e-mail.
    SELECT nullif(btrim(full_name), '') INTO v_user_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    INSERT INTO public.community_activities (user_id, activity_type, description, workout_id)
    VALUES (
      NEW.user_id,
      'workout_completed',
      COALESCE(v_user_name, 'Un athlète') || ' a terminé: ' || NEW.name,
      NEW.id
    );

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

-- Nettoyage des activités déjà publiées avec une adresse e-mail.
UPDATE public.community_activities
SET description = regexp_replace(description, '^\S+@\S+ a terminé: ', 'Un athlète a terminé: ')
WHERE description ~ '^\S+@\S+ a terminé: ';
