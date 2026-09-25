// Deletes the caller's account (RGPD right to erasure).
//
// Order matters: billing is stopped first, so a failure can never leave a
// deleted account that keeps being charged. Tables referencing auth.users
// with ON DELETE CASCADE are purged by auth.admin.deleteUser; the others are
// handled explicitly below. Stripe invoices are kept (accounting obligation).
import { createServiceClient, requireUser, type ServiceClient } from "../_shared/auth.ts";
import { errorResponse, jsonResponse, preflight, PublicError, readJsonBody } from "../_shared/http.ts";
import { createStripe, findCustomerId } from "../_shared/stripe.ts";

const CONFIRMATION_WORD = "SUPPRIMER";
const USER_FILE_BUCKETS = ["sparring-videos"];
const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

async function removeUserFiles(supabase: ServiceClient, bucket: string, userId: string): Promise<void> {
  for (;;) {
    const { data: files, error } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (error) throw new Error(`${bucket} list failed: ${error.message}`);
    if (!files || files.length === 0) return;
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) throw new Error(`${bucket} remove failed: ${removeError.message}`);
    if (files.length < 1000) return;
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

    // 1. Stop billing.
    const stripe = createStripe();
    const customerId = await findCustomerId(supabase, stripe, user);
    if (customerId) {
      const { data: subs } = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
      for (const sub of subs) {
        if (!TERMINAL_STATUSES.has(sub.status)) await stripe.subscriptions.cancel(sub.id);
      }
    }

    // 2. References to the user that do not cascade.
    const { error: inviterError } = await supabase
      .from("meute_members")
      .update({ invited_by: null })
      .eq("invited_by", user.id);
    if (inviterError) throw new Error(`meute_members cleanup failed: ${inviterError.message}`);

    const { error: usageError } = await supabase.from("feature_usage").delete().eq("user_id", user.id);
    if (usageError) throw new Error(`feature_usage cleanup failed: ${usageError.message}`);

    // 3. Files.
    for (const bucket of USER_FILE_BUCKETS) await removeUserFiles(supabase, bucket, user.id);

    // 4. Account and every cascading row.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error(`auth deleteUser failed: ${deleteError.message}`);

    console.log("[delete-account] account deleted", { userId: user.id });
    return jsonResponse(req, { deleted: true });
  } catch (error) {
    return errorResponse(req, error, "delete-account");
  }
});
