-- ============================================================================
-- Seed: grant `admin` role to a Supabase auth user
-- ----------------------------------------------------------------------------
-- This file is NOT applied automatically by the migration pipeline.
-- Use it to bootstrap a fresh environment with a known admin account.
--
-- Steps:
--   1. Create the user via Supabase Auth (sign-up flow or dashboard).
--   2. Copy the user's UUID (`auth.users.id`).
--   3. Replace `<ADMIN_USER_UUID>` below.
--   4. Run this script in the Supabase SQL editor (or via `supabase db remote
--      execute`) ONCE.
--
-- The role-based access model is defined in migration
-- `20251013093610_*.sql` and uses the `has_role()` security-definer function.
-- ============================================================================

-- Optional safety: refuse to run if the user does not already exist.
DO $$
DECLARE
  target_uuid uuid := '<ADMIN_USER_UUID>'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_uuid) THEN
    RAISE EXCEPTION 'User % does not exist in auth.users. Create the account first.', target_uuid;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_uuid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END
$$;
