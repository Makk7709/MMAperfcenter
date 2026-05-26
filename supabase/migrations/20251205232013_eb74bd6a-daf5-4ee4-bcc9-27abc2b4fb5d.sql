-- NOTE: This migration historically re-asserted the founder admin role via
-- a hard-coded UUID (idempotent INSERT). For transmission/audit purposes the
-- nominative INSERT has been removed from the migration pipeline and moved
-- to `supabase/seed/seed-admin.example.sql`. The production database already
-- contains the original row from migration 20251013093610.
--
-- This file is intentionally left as a no-op marker to preserve the migration
-- history ordering. To grant admin access in a fresh environment, copy the
-- seed file, fill in the target UUID and execute it manually.
SELECT 1;
