import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Single source of truth for the Supabase client configuration.
// Values come from Vite environment variables (VITE_* are public by design).
// There is deliberately no hard-coded fallback: a missing variable must fail
// loudly instead of silently pointing the app at another project.
const ENV_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ENV_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!ENV_URL || !ENV_KEY) {
  throw new Error(
    'Configuration manquante : VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définies (voir .env.example).',
  );
}

export const SUPABASE_URL = ENV_URL;
export const SUPABASE_PUBLISHABLE_KEY = ENV_KEY;

// Usage:
//   import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
