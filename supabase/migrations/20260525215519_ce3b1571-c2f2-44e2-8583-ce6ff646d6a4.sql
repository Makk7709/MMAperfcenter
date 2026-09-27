
-- 1) Subscriptions: remove user-facing INSERT/UPDATE (handled by webhook + service role)
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- 2) Documents: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Allow public read access" ON public.documents;
CREATE POLICY "Authenticated users can read documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

-- 3) Community activities: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Everyone can view community activities" ON public.community_activities;
CREATE POLICY "Authenticated users can view community activities"
  ON public.community_activities FOR SELECT
  TO authenticated
  USING (true);

-- 4) Render usage: restrict INSERT to authenticated user inserting their own row
DROP POLICY IF EXISTS "System can insert usage" ON public.render_usage;
CREATE POLICY "Users can insert their own render usage"
  ON public.render_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
