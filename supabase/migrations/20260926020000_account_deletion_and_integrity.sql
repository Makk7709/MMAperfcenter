-- ============================================================================
-- Audit hostile pré-déploiement (2026-09-26)
--
-- 1. La suppression d'un compte ne doit jamais échouer à cause d'une
--    invitation de meute : invited_by passe à NULL, et le trigger anti-
--    escalade laisse passer les appels serveur (FK, service_role).
-- 2. Une invitation de meute ne peut créer qu'une adhésion « pending/member »
--    signée par l'appelant.
-- 3. Le fil communautaire n'est alimenté que par le trigger des séances.
-- 4. increment_video_views n'est plus appelable via l'API publique.
-- 5. Le bucket training-videos n'accepte que des vidéos.
--
-- Idempotent : peut être rejoué sans effet de bord.
-- ============================================================================

-- ---- 1. Suppression de compte ----------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Le serveur (Edge Functions, ON DELETE SET NULL lors d'une suppression de
  -- compte) n'est pas soumis aux règles des membres.
  IF public.is_trusted_caller() THEN
    RETURN NEW;
  END IF;

  IF NEW.meute_id IS DISTINCT FROM OLD.meute_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
    RAISE EXCEPTION 'Une adhésion ne peut pas être déplacée vers une autre meute ou un autre membre';
  END IF;

  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  IF public.is_meute_owner(NEW.meute_id, auth.uid())
     OR public.get_meute_member_role(NEW.meute_id, auth.uid()) = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Seuls les propriétaires et administrateurs peuvent modifier les rôles des membres';
END;
$$;

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.meute_members'::regclass
      AND c.contype = 'f'
      AND a.attname = 'invited_by'
  LOOP
    EXECUTE format('ALTER TABLE public.meute_members DROP CONSTRAINT %I', fk.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.meute_members
  ADD CONSTRAINT meute_members_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---- 2. Invitations de meute -----------------------------------------------
DROP POLICY IF EXISTS "Owners and admins invite members" ON public.meute_members;

CREATE POLICY "Owners and admins invite members"
ON public.meute_members FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_meute_owner(meute_id, auth.uid())
   OR public.get_meute_member_role(meute_id, auth.uid()) IN ('owner', 'admin'))
  AND status = 'pending'
  AND role = 'member'
  AND invited_by = auth.uid()
  AND joined_at IS NULL
);

-- ---- 3. Fil communautaire --------------------------------------------------
-- Le front n'y écrit jamais : une politique d'insertion ne sert qu'à forger
-- des activités au nom d'autrui.
DROP POLICY IF EXISTS "Users can create their own activities" ON public.community_activities;

-- ---- 4. Compteur de vues ---------------------------------------------------
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'increment_video_views'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
  END LOOP;
END;
$$;

-- ---- 5. Types de fichiers --------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/*']
WHERE id = 'training-videos';
