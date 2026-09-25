import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PublicError } from "./http.ts";

export type ServiceClient = SupabaseClient;

export function createServiceClient(): ServiceClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Resolves the caller from the `Authorization: Bearer <jwt>` header.
// Throws a 401 PublicError when the token is missing or invalid.
export async function requireUser(supabase: ServiceClient, req: Request): Promise<User> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new PublicError("Authentification requise", 401);

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data?.user) throw new PublicError("Session invalide ou expirée", 401);
  return data.user;
}
