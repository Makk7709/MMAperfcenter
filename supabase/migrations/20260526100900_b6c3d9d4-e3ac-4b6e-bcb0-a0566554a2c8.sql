-- Helpers SECURITY DEFINER pour éviter récursion RLS
CREATE OR REPLACE FUNCTION public.is_meute_member(_meute_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meute_members
    WHERE meute_id = _meute_id AND user_id = _user_id AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_meute_owner(_meute_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meutes WHERE id = _meute_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_meute_member_role(_meute_id uuid, _user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.meute_members
  WHERE meute_id = _meute_id AND user_id = _user_id AND status = 'accepted'
  LIMIT 1;
$$;

-- meute_members : drop & recreate sans auto-référence
DROP POLICY IF EXISTS "Members can view meute members" ON public.meute_members;
DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.meute_members;
DROP POLICY IF EXISTS "Owners can manage all members" ON public.meute_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.meute_members;

CREATE POLICY "View meute members"
ON public.meute_members FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_meute_member(meute_id, auth.uid())
  OR public.is_meute_owner(meute_id, auth.uid())
);

CREATE POLICY "Owners and admins invite members"
ON public.meute_members FOR INSERT
WITH CHECK (
  public.is_meute_owner(meute_id, auth.uid())
  OR public.get_meute_member_role(meute_id, auth.uid()) IN ('owner','admin')
);

CREATE POLICY "Users update their own membership"
ON public.meute_members FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owners delete members"
ON public.meute_members FOR DELETE
USING (public.is_meute_owner(meute_id, auth.uid()));

-- meutes : utilise helper
DROP POLICY IF EXISTS "Users can view meutes they belong to" ON public.meutes;
CREATE POLICY "View own meutes"
ON public.meutes FOR SELECT
USING (owner_id = auth.uid() OR public.is_meute_member(id, auth.uid()));

-- meute_activities : utilise helpers
DROP POLICY IF EXISTS "Members can view meute activities" ON public.meute_activities;
DROP POLICY IF EXISTS "Members can create activities" ON public.meute_activities;

CREATE POLICY "View meute activities"
ON public.meute_activities FOR SELECT
USING (
  public.is_meute_member(meute_id, auth.uid())
  OR public.is_meute_owner(meute_id, auth.uid())
);

CREATE POLICY "Create meute activities"
ON public.meute_activities FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    public.is_meute_member(meute_id, auth.uid())
    OR public.is_meute_owner(meute_id, auth.uid())
  )
);