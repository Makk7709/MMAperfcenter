-- ============================================================================
-- SECURITY FIX: documents INSERT policy (data poisoning risk)
-- ============================================================================

-- Remove overly permissive INSERT policy on documents
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.documents;

-- Restrict INSERT to admins only (documents are server-side populated)
CREATE POLICY "Only admins can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- SECURITY FIX: meute_members privilege escalation (role self-assignment)
-- ============================================================================

-- Trigger that prevents a member from modifying their own role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If role hasn't changed, allow the update
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;
  
  -- If role is changing, verify current user is owner or admin
  IF public.is_meute_owner(NEW.meute_id, auth.uid()) OR 
     public.get_meute_member_role(NEW.meute_id, auth.uid()) = 'admin' THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Seuls les propriétaires et administrateurs peuvent modifier les rôles des membres';
END;
$$;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.meute_members;

-- Create the trigger
CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE ON public.meute_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();