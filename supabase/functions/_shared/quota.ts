import type { ServiceClient } from "./auth.ts";
import { PublicError } from "./http.ts";

// Quota features counted server-side. Must match get_feature_limit() in SQL.
export type QuotaFeature = "ai_coach" | "sparring_analysis";

const LIMIT_MESSAGES: Record<QuotaFeature, string> = {
  ai_coach: "Limite mensuelle atteinte pour le Coach IA. Passe au plan Pro pour un accès illimité.",
  sparring_analysis: "Limite mensuelle atteinte pour l'analyse PRISM. Passe au plan Pro pour un accès illimité.",
};

// Proof of consumption, to be handed back to refundQuota on failure.
export interface QuotaTicket {
  userId: string;
  feature: QuotaFeature;
  counted: boolean;
}

// Atomically checks and consumes one unit of quota (see consume_feature_quota).
// Throws a 402 PublicError when the user has no remaining quota.
export async function consumeQuota(supabase: ServiceClient, userId: string, feature: QuotaFeature): Promise<QuotaTicket> {
  const { data, error } = await supabase.rpc("consume_feature_quota", { _user_id: userId, _feature: feature });
  if (error) throw new Error(`consume_feature_quota failed: ${error.message}`);
  if (data === "counted") return { userId, feature, counted: true };
  if (data === "unlimited") return { userId, feature, counted: false };
  throw new PublicError(LIMIT_MESSAGES[feature], 402, "FEATURE_LIMIT_REACHED");
}

// Gives back the unit taken by consumeQuota after a failed AI call. Only
// refunds what was actually counted. Never throws: a failed refund must not
// mask the original error.
export async function refundQuota(supabase: ServiceClient, ticket: QuotaTicket | null): Promise<void> {
  if (!ticket?.counted) return;
  const { error } = await supabase.rpc("refund_feature_quota", { _user_id: ticket.userId, _feature: ticket.feature });
  if (error) console.error("refund_feature_quota failed", error.message);
}
