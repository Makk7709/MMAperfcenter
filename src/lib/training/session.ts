import { calculateRank, getNextRank, getRankProgress, XP_REWARDS, type WolfRank } from "@/utils/gamification/wolfPack";

export const SESSION_PATH = "/seance";

export type SessionType = "boxing" | "mma" | "strength" | "cardio" | "custom";
export type Intensity = "light" | "moderate" | "intense";

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  boxing: "Boxe",
  mma: "MMA",
  strength: "Force",
  cardio: "Cardio",
  custom: "Libre",
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: "Légère",
  moderate: "Modérée",
  intense: "Intense",
};

export const asSessionType = (v: string | null | undefined): SessionType =>
  v && v in SESSION_TYPE_LABELS ? (v as SessionType) : "custom";

export const asIntensity = (v: string | null | undefined): Intensity =>
  v && v in INTENSITY_LABELS ? (v as Intensity) : "moderate";

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

export interface SetLike {
  weight_kg: number | string | null;
  reps: number | null;
  completed: boolean | null;
}

export interface SetsSummary {
  setsCompleted: number;
  setsTotal: number;
  reps: number;
  volumeKg: number;
  exercisesWorked: number;
}

/** Only validated sets count: a planned set that was never done is not training. */
export function summarizeSets(exercises: ReadonlyArray<{ sets: ReadonlyArray<SetLike> }>): SetsSummary {
  let setsCompleted = 0;
  let setsTotal = 0;
  let reps = 0;
  let volumeKg = 0;
  let exercisesWorked = 0;
  for (const ex of exercises) {
    let done = 0;
    for (const s of ex.sets) {
      setsTotal++;
      if (!s.completed) continue;
      done++;
      const r = Math.max(0, Number(s.reps) || 0);
      reps += r;
      volumeKg += Math.max(0, Number(s.weight_kg) || 0) * r;
    }
    setsCompleted += done;
    if (done > 0) exercisesWorked++;
  }
  return { setsCompleted, setsTotal, reps, volumeKg: Math.round(volumeKg), exercisesWorked };
}

// ---------------------------------------------------------------------------
// Calories (MET, Compendium of Physical Activities)
// ---------------------------------------------------------------------------

const MET: Record<SessionType, Record<Intensity, number>> = {
  boxing: { light: 5.5, moderate: 7.8, intense: 10 },
  mma: { light: 5.3, moderate: 7.5, intense: 10.3 },
  strength: { light: 3.5, moderate: 5, intense: 6 },
  cardio: { light: 5, moderate: 7, intense: 8 },
  custom: { light: 4, moderate: 6, intense: 8 },
};

export const DEFAULT_BODY_WEIGHT_KG = 75;

export function estimateCalories(type: SessionType, intensity: Intensity, minutes: number, weightKg?: number | null): number {
  const weight = weightKg && weightKg >= 35 && weightKg <= 200 ? weightKg : DEFAULT_BODY_WEIGHT_KG;
  return Math.round((MET[type][intensity] * weight * Math.max(0, minutes)) / 60);
}

/** A session left open overnight must not count as a 14-hour workout. */
export const MAX_SESSION_MINUTES = 240;

export function sessionMinutes(startedAt: string | null, endedAt: Date = new Date()): number {
  if (!startedAt) return 0;
  const minutes = Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 60000);
  return Math.min(MAX_SESSION_MINUTES, Math.max(0, minutes));
}

// ---------------------------------------------------------------------------
// XP and rank, derived from stored sessions only
// ---------------------------------------------------------------------------

const INTENSITY_MULTIPLIER: Record<Intensity, number> = { light: 0.8, moderate: 1, intense: 1.3 };
const MAX_SESSION_XP = 400;

export interface XpInput {
  intensity: string | null;
  duration_minutes: number | null;
  rounds_completed: number | null;
  setsCompleted: number;
}

/** A session with no set, no round and under 5 minutes earns nothing. */
export function workoutXP(w: XpInput): number {
  const minutes = Math.min(MAX_SESSION_MINUTES, Math.max(0, w.duration_minutes ?? 0));
  const rounds = Math.max(0, w.rounds_completed ?? 0);
  const sets = Math.max(0, w.setsCompleted);
  if (minutes < 5 && rounds === 0 && sets === 0) return 0;
  const raw = (XP_REWARDS.workout_completed + Math.min(minutes, 120) + 10 * rounds + XP_REWARDS.set_completed * sets)
    * INTENSITY_MULTIPLIER[asIntensity(w.intensity)];
  return Math.min(MAX_SESSION_XP, Math.round(raw));
}

export interface Progress {
  totalXP: number;
  rank: WolfRank;
  nextRank: WolfRank | null;
  rankProgress: number;
}

export function progressFromXP(totalXP: number): Progress {
  const rank = calculateRank(totalXP);
  return { totalXP, rank, nextRank: getNextRank(rank), rankProgress: getRankProgress(totalXP) };
}

export function totalXP(workouts: ReadonlyArray<XpInput>, sparringAnalyses: number): number {
  return workouts.reduce((sum, w) => sum + workoutXP(w), 0) + XP_REWARDS.sparring_analyzed * Math.max(0, sparringAnalyses);
}

// ---------------------------------------------------------------------------
// Round clock
// ---------------------------------------------------------------------------

export interface RoundPlan {
  rounds: number;
  workSeconds: number;
  restSeconds: number;
}

export interface RoundState {
  phase: "work" | "rest" | "done";
  /** 1-based round being fought (or just fought, during rest). */
  round: number;
  remaining: number;
  roundsCompleted: number;
}

/**
 * State of a round timer after `elapsed` seconds of running time. Pure, so the
 * timer stays exact when the phone throttles or suspends the page.
 */
export function roundClock(elapsed: number, plan: RoundPlan): RoundState {
  const rounds = Math.max(1, plan.rounds);
  const work = Math.max(1, plan.workSeconds);
  const rest = Math.max(0, plan.restSeconds);
  const cycle = work + rest;
  const total = rounds * work + (rounds - 1) * rest;
  const t = Math.max(0, elapsed);
  if (t >= total) return { phase: "done", round: rounds, remaining: 0, roundsCompleted: rounds };
  const index = Math.floor(t / cycle);
  const within = t - index * cycle;
  if (within < work) return { phase: "work", round: index + 1, remaining: work - within, roundsCompleted: index };
  return { phase: "rest", round: index + 1, remaining: cycle - within, roundsCompleted: index + 1 };
}

export const roundPlanSeconds = (plan: RoundPlan): number =>
  Math.max(1, plan.rounds) * plan.workSeconds + Math.max(0, plan.rounds - 1) * plan.restSeconds;

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
