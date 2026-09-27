SET lock_timeout = '5s';
CREATE OR REPLACE FUNCTION pg_temp.korev_url_decode(input text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result bytea := ''; i int := 1;
BEGIN
  WHILE i <= length(input) LOOP
    IF substr(input, i, 1) = '%' AND substr(input, i + 1, 2) ~ '^[0-9A-Fa-f]{2}$' THEN
      result := result || decode(substr(input, i + 1, 2), 'hex'); i := i + 3;
    ELSE
      result := result || convert_to(substr(input, i, 1), 'UTF8'); i := i + 1;
    END IF;
  END LOOP;
  RETURN convert_from(result, 'UTF8');
EXCEPTION WHEN others THEN RETURN input;
END; $$;
UPDATE public.training_videos
SET video_url = pg_temp.korev_url_decode(split_part(split_part(substring(video_url FROM '/training-videos/(.+)$'), '?', 1), '#', 1))
WHERE video_type = 'upload' AND video_url ~ '/training-videos/.+$';

DROP POLICY IF EXISTS "Anyone can view training videos" ON storage.objects;
DROP POLICY IF EXISTS "Training video files follow table visibility" ON storage.objects;
CREATE POLICY "Training video files follow table visibility" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'training-videos' AND EXISTS (SELECT 1 FROM public.training_videos v WHERE v.video_type = 'upload' AND v.video_url = objects.name AND (v.user_id::text = (storage.foldername(objects.name))[1] OR v.user_id = objects.owner)));
DROP POLICY IF EXISTS "Admins and coaches read their training video files" ON storage.objects;
CREATE POLICY "Admins and coaches read their training video files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'training-videos' AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)));

DROP POLICY IF EXISTS "Admins and coaches can create training videos" ON public.training_videos;
DROP POLICY IF EXISTS "Admins and coaches can update training videos" ON public.training_videos;
DROP POLICY IF EXISTS "Admins and coaches can delete training videos" ON public.training_videos;
CREATE POLICY "Admins and coaches can create training videos" ON public.training_videos FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach')));
CREATE POLICY "Admins and coaches can update training videos" ON public.training_videos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'coach') AND user_id = auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'coach') AND user_id = auth.uid()));
CREATE POLICY "Admins and coaches can delete training videos" ON public.training_videos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'coach') AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Only admins can upload training videos" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update training videos" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete training videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coaches upload training videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coaches update training videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coaches delete training videos" ON storage.objects;
CREATE POLICY "Admins and coaches upload training videos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'training-videos' AND (storage.foldername(name))[1] = auth.uid()::text AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach')));
CREATE POLICY "Admins and coaches update training videos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'training-videos' AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)))
WITH CHECK (bucket_id = 'training-videos' AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)));
CREATE POLICY "Admins and coaches delete training videos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'training-videos' AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'coach') AND (storage.foldername(name))[1] = auth.uid()::text)));

CREATE OR REPLACE FUNCTION public.create_community_activity_on_workout() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NOT EXISTS (SELECT 1 FROM public.community_activities WHERE workout_id = NEW.id AND activity_type = 'workout_completed') THEN
    SELECT nullif(btrim(full_name), '') INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.community_activities (user_id, activity_type, description, workout_id)
    VALUES (NEW.user_id, 'workout_completed', COALESCE(v_user_name, 'Un athlète') || ' a terminé: ' || NEW.name, NEW.id);
    PERFORM public.create_notification(NEW.user_id, 'Workout terminé! 💪', 'Félicitations! Vous avez terminé votre séance: ' || NEW.name, 'success');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_trusted_caller() THEN RETURN NEW; END IF;
  IF NEW.meute_id IS DISTINCT FROM OLD.meute_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
    RAISE EXCEPTION 'Une adhésion ne peut pas être déplacée vers une autre meute ou un autre membre';
  END IF;
  IF OLD.role = NEW.role THEN RETURN NEW; END IF;
  IF public.is_meute_owner(NEW.meute_id, auth.uid()) OR public.get_meute_member_role(NEW.meute_id, auth.uid()) = 'admin' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Seuls les propriétaires et administrateurs peuvent modifier les rôles des membres';
END; $$;
DO $$ DECLARE fk record; BEGIN
  FOR fk IN SELECT c.conname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.meute_members'::regclass AND c.contype = 'f' AND a.attname = 'invited_by'
  LOOP EXECUTE format('ALTER TABLE public.meute_members DROP CONSTRAINT %I', fk.conname); END LOOP;
END; $$;
ALTER TABLE public.meute_members ADD CONSTRAINT meute_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
DROP POLICY IF EXISTS "Owners and admins invite members" ON public.meute_members;
CREATE POLICY "Owners and admins invite members" ON public.meute_members FOR INSERT TO authenticated
WITH CHECK ((public.is_meute_owner(meute_id, auth.uid()) OR public.get_meute_member_role(meute_id, auth.uid()) IN ('owner', 'admin')) AND status = 'pending' AND role = 'member' AND invited_by = auth.uid() AND joined_at IS NULL);
DROP POLICY IF EXISTS "Users can create their own activities" ON public.community_activities;
DO $$ DECLARE fn record; BEGIN
  FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'increment_video_views'
  LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature); END LOOP;
END; $$;