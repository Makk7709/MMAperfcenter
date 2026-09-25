// Deletes the caller's account (RGPD right to erasure).
//
// Order matters:
// - billing is stopped first, so a failure never leaves a deleted account
//   that keeps being charged;
// - feature_usage is erased only once the account is gone, otherwise a run
//   aborted halfway would reset the caller's quota.
// Tables referencing auth.users with ON DELETE CASCADE / SET NULL are purged
// by auth.admin.deleteUser; training_videos has no FK and is handled here.
// Stripe invoices are kept (accounting obligation).
import { createServiceClient, requireUser, type ServiceClient } from "../_shared/auth.ts";
import { errorResponse, jsonResponse, preflight, PublicError, readJsonBody } from "../_shared/http.ts";
import { createStripe, Stripe, USER_ID_METADATA_KEY } from "../_shared/stripe.ts";

const CONFIRMATION_WORD = "SUPPRIMER";
const USER_FILE_BUCKETS = ["sparring-videos", "training-videos"];
const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);
const LIST_PAGE = 1000;
const MAX_STORAGE_ENTRIES = 20_000;

async function customerIdsOf(supabase: ServiceClient, stripe: Stripe, userId: string, email?: string): Promise<string[]> {
  const ids = new Set<string>();
  const { data: row, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`subscriptions lookup failed: ${error.message}`);
  if (row?.stripe_customer_id) ids.add(row.stripe_customer_id as string);

  if (email) {
    for await (const customer of stripe.customers.list({ email, limit: 100 })) {
      if (customer.metadata?.[USER_ID_METADATA_KEY] === userId) ids.add(customer.id);
    }
  }
  return [...ids];
}

async function stopBilling(stripe: Stripe, customerId: string): Promise<void> {
  for await (const session of stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 })) {
    await stripe.checkout.sessions.expire(session.id);
  }
  for await (const sub of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    if (!TERMINAL_STATUSES.has(sub.status)) await stripe.subscriptions.cancel(sub.id);
  }
}

// Storage lists one level at a time: folders come back without an id.
async function listFilesRecursively(supabase: ServiceClient, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  const folders = [prefix];
  let seen = 0;
  while (folders.length > 0) {
    const folder = folders.pop()!;
    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: LIST_PAGE, offset });
      if (error) throw new Error(`${bucket} list failed: ${error.message}`);
      for (const entry of data ?? []) {
        if (++seen > MAX_STORAGE_ENTRIES) throw new Error(`${bucket}: too many objects to delete in one run`);
        (entry.id ? files : folders).push(`${folder}/${entry.name}`);
      }
      if (!data || data.length < LIST_PAGE) break;
    }
  }
  return files;
}

async function removeUserFiles(supabase: ServiceClient, bucket: string, userId: string): Promise<void> {
  const files = await listFilesRecursively(supabase, bucket, userId);
  for (let i = 0; i < files.length; i += LIST_PAGE) {
    const { error } = await supabase.storage.from(bucket).remove(files.slice(i, i + LIST_PAGE));
    if (error) throw new Error(`${bucket} remove failed: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const user = await requireUser(supabase, req);
    const body = (await readJsonBody(req, 1024)) as { confirm?: unknown };
    if (body?.confirm !== CONFIRMATION_WORD) {
      throw new PublicError(`Tapez ${CONFIRMATION_WORD} pour confirmer la suppression`);
    }

    // 1. Stop billing on every Stripe customer of the account.
    const stripe = createStripe();
    for (const customerId of await customerIdsOf(supabase, stripe, user.id, user.email)) {
      await stopBilling(stripe, customerId);
    }

    // 2. Files and rows that do not cascade.
    for (const bucket of USER_FILE_BUCKETS) await removeUserFiles(supabase, bucket, user.id);
    const { error: videosError } = await supabase.from("training_videos").delete().eq("user_id", user.id);
    if (videosError) throw new Error(`training_videos cleanup failed: ${videosError.message}`);

    // 3. Account and every cascading row.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error(`auth deleteUser failed: ${deleteError.message}`);

    // 4. Usage counters (no FK), only once the account can no longer use them.
    const { error: usageError } = await supabase.from("feature_usage").delete().eq("user_id", user.id);
    if (usageError) console.error("[delete-account] feature_usage cleanup failed", { userId: user.id, error: usageError.message });

    console.log("[delete-account] account deleted", { userId: user.id });
    return jsonResponse(req, { deleted: true });
  } catch (error) {
    return errorResponse(req, error, "delete-account");
  }
});
