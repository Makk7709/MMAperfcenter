-- Create meutes (packs) table
CREATE TABLE public.meutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meute members table
CREATE TABLE public.meute_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meute_id UUID NOT NULL REFERENCES public.meutes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meute_id, user_id)
);

-- Create meute activities table
CREATE TABLE public.meute_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meute_id UUID NOT NULL REFERENCES public.meutes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meute_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meute_activities ENABLE ROW LEVEL SECURITY;

-- Meutes policies
CREATE POLICY "Users can view meutes they belong to"
ON public.meutes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meute_members
    WHERE meute_members.meute_id = meutes.id
    AND meute_members.user_id = auth.uid()
    AND meute_members.status = 'accepted'
  )
  OR owner_id = auth.uid()
);

CREATE POLICY "Users can create meutes"
ON public.meutes FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their meutes"
ON public.meutes FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their meutes"
ON public.meutes FOR DELETE
USING (auth.uid() = owner_id);

-- Meute members policies
CREATE POLICY "Members can view meute members"
ON public.meute_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meute_members mm
    WHERE mm.meute_id = meute_members.meute_id
    AND mm.user_id = auth.uid()
    AND (mm.status = 'accepted' OR meute_members.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.meutes
    WHERE meutes.id = meute_members.meute_id
    AND meutes.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners and admins can invite members"
ON public.meute_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meutes
    WHERE meutes.id = meute_members.meute_id
    AND meutes.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.meute_members mm
    WHERE mm.meute_id = meute_members.meute_id
    AND mm.user_id = auth.uid()
    AND mm.role IN ('owner', 'admin')
    AND mm.status = 'accepted'
  )
);

CREATE POLICY "Users can update their own membership"
ON public.meute_members FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all members"
ON public.meute_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.meutes
    WHERE meutes.id = meute_members.meute_id
    AND meutes.owner_id = auth.uid()
  )
);

-- Meute activities policies
CREATE POLICY "Members can view meute activities"
ON public.meute_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meute_members
    WHERE meute_members.meute_id = meute_activities.meute_id
    AND meute_members.user_id = auth.uid()
    AND meute_members.status = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM public.meutes
    WHERE meutes.id = meute_activities.meute_id
    AND meutes.owner_id = auth.uid()
  )
);

CREATE POLICY "Members can create activities"
ON public.meute_activities FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.meute_members
      WHERE meute_members.meute_id = meute_activities.meute_id
      AND meute_members.user_id = auth.uid()
      AND meute_members.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM public.meutes
      WHERE meutes.id = meute_activities.meute_id
      AND meutes.owner_id = auth.uid()
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_meutes_updated_at
BEFORE UPDATE ON public.meutes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-add owner as member when meute is created
CREATE OR REPLACE FUNCTION public.handle_new_meute()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.meute_members (meute_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'accepted', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_meute_created
AFTER INSERT ON public.meutes
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_meute();