// Admin back-office: user list, statistics and account actions.
//
// RLS only lets a user read their own profile and subscription, so the admin
// screens go through this function (service role, admin role checked here).
// Suspension uses the Auth ban: it survives Stripe syncs, blocks sign-in and
// token refresh, and requireUser rejects tokens issued before it.
import { createServiceClient, isBanned, requireAdmin, type ServiceClient, type User } from "../_shared/auth.ts";
import { errorResponse, jsonResponse, preflight, PublicError, readJsonBody } from "../_shared/http.ts";

const PAGE = 1000;
const PLANS = new Set(["free", "pro", "elite", "sensei"]);
const FITNESS_LEVELS = new Set(["beginner", "intermediate", "advanced", "expert"]);
const SUSPENSION = "876000h"; // 100 years: until an admin lifts it.

type Row = Record<string, unknown>;

async function fetchAll(supabase: ServiceClient, table: string, columns: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} read failed: ${error.message}`);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function listAuthUsers(supabase: ServiceClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE) return users;
  }
}

async function listUsers(supabase: ServiceClient) {
  const [profiles, subscriptions, roles, authUsers] = await Promise.all([
    fetchAll(supabase, "profiles", "id, email, full_name, fitness_level, created_at"),
    fetchAll(supabase, "subscriptions", "user_id, plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id"),
    fetchAll(supabase, "user_roles", "user_id, role"),
    listAuthUsers(supabase),
  ]);
  const subByUser = new Map(subscriptions.map((s) => [s.user_id, s]));
  const authById = new Map(authUsers.map((u) => [u.id, u]));

  return profiles
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((p) => {
      const sub = subByUser.get(p.id);
      const auth = authById.get(p.id as string);
      return {
        id: p.id,
        email: auth?.email ?? p.email,
        full_name: p.full_name,
        fitness_level: p.fitness_level,
        created_at: p.created_at,
        subscription: sub
          ? {
            plan: sub.plan,
            status: sub.status,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
            stripe_managed: !!sub.stripe_subscription_id,
          }
          : undefined,
        roles: roles.filter((r) => r.user_id === p.id).map((r) => r.role),
        is_suspended: auth ? isBanned(auth) : false,
      };
    });
}

async function stats(supabase: ServiceClient) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [subscriptions, videos, authUsers, totalUsers, recentSignups, recentWorkouts] = await Promise.all([
    fetchAll(supabase, "subscriptions", "plan, status"),
    fetchAll(supabase, "training_videos", "views_count"),
    listAuthUsers(supabase),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("workouts").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
  ]);

  const subscriptionsByPlan: Record<string, number> = {};
  for (const s of subscriptions) subscriptionsByPlan[s.plan as string] = (subscriptionsByPlan[s.plan as string] ?? 0) + 1;

  return {
    totalUsers: totalUsers.count ?? 0,
    activeUsers: subscriptions.filter((s) => s.status === "active").length,
    suspendedUsers: authUsers.filter(isBanned).length,
    trialUsers: subscriptions.filter((s) => s.status === "trialing").length,
    subscriptionsByPlan,
    totalVideos: videos.length,
    totalVideoViews: videos.reduce((sum, v) => sum + (Number(v.views_count) || 0), 0),
    recentSignups: recentSignups.count ?? 0,
    recentWorkouts: recentWorkouts.count ?? 0,
  };
}

function requireUserId(body: Row): string {
  const id = body.userId;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new PublicError("userId invalide");
  return id;
}

async function updateProfile(supabase: ServiceClient, body: Row) {
  const userId = requireUserId(body);
  const updates: Row = {};
  if (typeof body.full_name === "string") updates.full_name = body.full_name.trim().slice(0, 120);
  if (typeof body.fitness_level === "string") {
    if (!FITNESS_LEVELS.has(body.fitness_level)) throw new PublicError("Niveau invalide");
    updates.fitness_level = body.fitness_level;
  }
  if (Object.keys(updates).length === 0) throw new PublicError("Aucune modification");
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select("id");
  if (error) throw new Error(`profiles update failed: ${error.message}`);
  if (!data?.length) throw new PublicError("Utilisateur introuvable", 404);
}

async function suspend(supabase: ServiceClient, admin: User, body: Row) {
  const userId = requireUserId(body);
  if (userId === admin.id) throw new PublicError("Vous ne pouvez pas suspendre votre propre compte");
  if (body.suspend === true) {
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw new Error(`user_roles lookup failed: ${roleError.message}`);
    if (role) throw new PublicError("Retirez d'abord le rôle administrateur de ce compte", 409);
  }
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: body.suspend === true ? SUSPENSION : "none",
  });
  if (error) throw new Error(`ban update failed: ${error.message}`);
}

async function setPlan(supabase: ServiceClient, body: Row) {
  const userId = requireUserId(body);
  if (typeof body.plan !== "string" || !PLANS.has(body.plan)) throw new PublicError("Plan invalide");
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`subscriptions read failed: ${error.message}`);
  if (!sub) throw new PublicError("Abonnement introuvable", 404);
  // The next Stripe event would overwrite a manual change on a paid subscription.
  if (sub.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status as string)) {
    throw new PublicError("Abonnement payé via Stripe : modifiez-le depuis le dashboard Stripe", 409);
  }
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ plan: body.plan, status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (updateError) throw new Error(`subscriptions update failed: ${updateError.message}`);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const admin = await requireAdmin(supabase, req);
    const body = ((await readJsonBody(req, 4 * 1024)) ?? {}) as Row;

    switch (body.action) {
      case "list":
        return jsonResponse(req, { users: await listUsers(supabase) });
      case "stats":
        return jsonResponse(req, { stats: await stats(supabase) });
      case "update_profile":
        await updateProfile(supabase, body);
        break;
      case "suspend":
        await suspend(supabase, admin, body);
        break;
      case "set_plan":
        await setPlan(supabase, body);
        break;
      default:
        throw new PublicError("Action inconnue");
    }
    console.log("[admin-users]", { action: body.action, adminId: admin.id, userId: body.userId });
    return jsonResponse(req, { ok: true });
  } catch (error) {
    return errorResponse(req, error, "admin-users");
  }
});
