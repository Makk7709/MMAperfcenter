import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PublicError } from "./http.ts";

export type ServiceClient = SupabaseClient;
export type { User };

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
  // A suspension (Auth ban) blocks new sessions; access tokens already issued
  // stay valid until they expire, so it is enforced here too.
  if (isBanned(data.user)) throw new PublicError("Compte suspendu", 403, "ACCOUNT_SUSPENDED");
  return data.user;
}

export function isBanned(user: User): boolean {
  const bannedUntil = (user as User & { banned_until?: string | null }).banned_until;
  return !!bannedUntil && Date.parse(bannedUntil) > Date.now();
}

export async function requireAdmin(supabase: ServiceClient, req: Request): Promise<User> {
  const user = await requireUser(supabase, req);
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`user_roles lookup failed: ${error.message}`);
  if (!data) throw new PublicError("Accès réservé aux administrateurs", 403);
  return user;
}
