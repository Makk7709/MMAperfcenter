import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Single source of truth for the Supabase client configuration.
// Values come from Vite environment variables (VITE_* are public by design).
// Fallback constants are kept ONLY to avoid breaking local dev if .env is absent;
// they are publishable values (URL + anon JWT) and never include service-role keys.
const ENV_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ENV_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const FALLBACK_URL = "https://vpvfkazmfvxbpffymodg.supabase.co";
const FALLBACK_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdmZrYXptZnZ4YnBmZnltb2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzgwOTksImV4cCI6MjA3Mzk1NDA5OX0.v8tiUP7AptK5bjG4f16gRxSfyObJnEjJKXVpthSCbKg";

export const SUPABASE_URL = ENV_URL ?? FALLBACK_URL;
export const SUPABASE_PUBLISHABLE_KEY = ENV_KEY ?? FALLBACK_PUBLISHABLE_KEY;

// Usage:
//   import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
