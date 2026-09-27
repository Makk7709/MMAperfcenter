import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { BYTES_PER_FRAME, LANDMARK_SET, encodeTrack, toBase64, type Pose } from "./landmarks";

// Keep in sync with public.movement_consent_version(): changing the consent
// text means changing this date in both places.
export const MOVEMENT_CONSENT_VERSION = "2026-09-28";
export const RETENTION_YEARS = 3;
export const INVITE_DAYS = 14;
export const INVITE_PATH = "/contribution";

export type Verdict = "correct" | "incorrect" | "unsure";
export type LabelKind = "moment" | "technique";
export interface LabelVerdict {
  kind: LabelKind;
  index: number;
  verdict: Verdict;
}

export interface ContributionInput {
  analysisId: string;
  contributorFighter: 1 | 2;
  fps: number;
  contributorTrack: Array<Pose | null>;
  /** Only when the partner is invited to consent; deleted if they do not. */
  partnerTrack: Array<Pose | null> | null;
  verdicts: LabelVerdict[];
}

export interface MyContribution {
  id: string;
  role: "contributor" | "partner";
  created_at: string;
  expires_at: string;
  discipline: string | null;
  fps: number;
  frame_count: number;
  partner_status: "none" | "pending" | "consented" | "withdrawn" | "expired";
  invite_expires_at: string | null;
  label_count: number | null;
  correction_count: number | null;
}

export interface MovementInvite {
  status: "pending" | "own" | "unavailable";
  contributor_name: string | null;
  discipline: string | null;
  created_at: string | null;
  expires_at: string | null;
}

const MESSAGES: Record<string, string> = {
  CONSENT_OUTDATED: "Le texte de consentement a changé : recharge la page pour lire la nouvelle version.",
  ADULT_REQUIRED: "Les contributions sont réservées aux personnes majeures.",
  RATE_LIMITED: "Tu as atteint la limite de 10 contributions par jour. Réessaie demain.",
};

export class ContributionError extends Error {}

function fail(error: { hint?: string | null; code?: string; message?: string }, fallback: string): never {
  if (error.hint && MESSAGES[error.hint]) throw new ContributionError(MESSAGES[error.hint]);
  if (error.code === "P0002") throw new ContributionError(fallback);
  throw new ContributionError("Envoi impossible pour le moment. Réessaie plus tard.");
}

export const inviteUrl = (token: string) => `${window.location.origin}${INVITE_PATH}/${token}`;

export async function contributeMovement(input: ContributionInput): Promise<{ id: string; inviteToken: string | null }> {
  const frameCount = input.contributorTrack.length;
  const contributor = encodeTrack(input.contributorTrack);
  if (contributor.length !== frameCount * BYTES_PER_FRAME) throw new ContributionError("Mouvement incomplet.");
  const { data, error } = await supabase.rpc("contribute_movement", {
    p_analysis_id: input.analysisId,
    p_consent_version: MOVEMENT_CONSENT_VERSION,
    p_attests_adult: true,
    p_contributor_fighter: input.contributorFighter,
    p_landmark_set: LANDMARK_SET,
    p_fps: input.fps,
    p_frame_count: frameCount,
    p_contributor_track: toBase64(contributor),
    p_partner_track: input.partnerTrack ? toBase64(encodeTrack(input.partnerTrack)) : undefined,
    p_user_labels: input.verdicts as unknown as Json,
  });
  if (error) fail(error, "Cette analyse n'est plus disponible.");
  const result = data as { id: string; invite_token?: string };
  return { id: result.id, inviteToken: result.invite_token ?? null };
}

export async function getMovementInvite(token: string): Promise<MovementInvite> {
  const { data, error } = await supabase.rpc("get_movement_invite", { p_token: token });
  if (error) fail(error, "Invitation introuvable.");
  return ((data as MovementInvite[] | null)?.[0] ?? { status: "unavailable" }) as MovementInvite;
}

export async function acceptMovementInvite(token: string): Promise<void> {
  const { error } = await supabase.rpc("accept_movement_invite", {
    p_token: token,
    p_consent_version: MOVEMENT_CONSENT_VERSION,
    p_attests_adult: true,
  });
  if (error) fail(error, "Cette invitation a expiré ou a déjà été utilisée.");
}

export async function declineMovementInvite(token: string): Promise<void> {
  const { error } = await supabase.rpc("decline_movement_invite", { p_token: token });
  if (error) fail(error, "Invitation introuvable.");
}

export async function withdrawContribution(id: string): Promise<void> {
  const { error } = await supabase.rpc("withdraw_movement_contribution", { p_id: id });
  if (error) fail(error, "Contribution déjà retirée.");
}

export async function listMyContributions(): Promise<MyContribution[]> {
  const { data, error } = await supabase.rpc("my_movement_contributions");
  if (error) throw error;
  return (data ?? []) as MyContribution[];
}
