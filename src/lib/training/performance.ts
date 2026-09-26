import { differenceInCalendarDays, startOfWeek } from "date-fns";
import { fromDateKey, shiftDateKey, timestampToDateKey, toDateKey } from "@/lib/dateKey";
import { MAX_SESSION_MINUTES, asIntensity, type Intensity } from "./session";

// ---------------------------------------------------------------------------
// Session load (session-RPE, Foster): perceived effort × minutes
// ---------------------------------------------------------------------------

/** Sessions saved before the effort question existed fall back on their intensity. */
export const EFFORT_BY_INTENSITY: Record<Intensity, number> = { light: 3, moderate: 5, intense: 8 };

const EFFORT_LABELS = ["Très facile", "Facile", "Modéré", "Un peu dur", "Dur", "Dur", "Très dur", "Très dur", "Extrêmement dur", "Maximal"];

/** CR-10 (Borg) wording of a 1–10 effort. */
export const effortLabel = (effort: number): string =>
  EFFORT_LABELS[Math.min(10, Math.max(1, Math.round(effort))) - 1];

export interface LoadInput {
  duration_minutes: number | null;
  intensity: string | null;
  perceived_effort: number | null;
}

export function sessionEffort(s: Pick<LoadInput, "intensity" | "perceived_effort">): number {
  const effort = Number(s.perceived_effort);
  if (Number.isInteger(effort) && effort >= 1 && effort <= 10) return effort;
  return EFFORT_BY_INTENSITY[asIntensity(s.intensity)];
}

export function sessionLoad(s: LoadInput): number {
  const minutes = Math.min(MAX_SESSION_MINUTES, Math.max(0, Number(s.duration_minutes) || 0));
  return Math.round(sessionEffort(s) * minutes);
}

// ---------------------------------------------------------------------------
// Acute:chronic workload ratio
// ---------------------------------------------------------------------------

export type LoadZone = "calibrating" | "low" | "optimal" | "high" | "danger";

export interface TrainingLoad {
  /** Load of the last 7 days, today included. */
  acute: number;
  /** Average weekly load over the last 28 days (or the whole history if shorter). */
  chronic: number;
  ratio: number | null;
  zone: LoadZone;
  calibrationDaysLeft: number;
}

const ACUTE_DAYS = 7;
const CHRONIC_DAYS = 28;
/** Below three weeks of history the chronic average means nothing. */
export const MIN_HISTORY_DAYS = 21;

export const LOAD_ZONE_BOUNDS = { low: 0.8, optimal: 1.3, high: 1.5 } as const;

export function zoneForRatio(ratio: number): Exclude<LoadZone, "calibrating"> {
  if (ratio < LOAD_ZONE_BOUNDS.low) return "low";
  if (ratio <= LOAD_ZONE_BOUNDS.optimal) return "optimal";
  if (ratio <= LOAD_ZONE_BOUNDS.high) return "high";
  return "danger";
}

export function trainingLoad(sessions: ReadonlyArray<{ dateKey: string; load: number }>, today: string): TrainingLoad {
  if (sessions.length === 0) {
    return { acute: 0, chronic: 0, ratio: null, zone: "calibrating", calibrationDaysLeft: MIN_HISTORY_DAYS };
  }
  const todayDate = fromDateKey(today);
  const age = (key: string) => differenceInCalendarDays(todayDate, fromDateKey(key));
  const first = sessions.reduce((min, s) => (s.dateKey < min ? s.dateKey : min), sessions[0].dateKey);
  const historyDays = age(first) + 1;
  const window = Math.min(CHRONIC_DAYS, historyDays);

  let acute = 0;
  let chronicSum = 0;
  for (const s of sessions) {
    const a = age(s.dateKey);
    if (a < 0) continue;
    if (a < ACUTE_DAYS) acute += s.load;
    if (a < window) chronicSum += s.load;
  }
  const chronic = Math.round(chronicSum / (window / 7));

  if (historyDays < MIN_HISTORY_DAYS) {
    return { acute, chronic, ratio: null, zone: "calibrating", calibrationDaysLeft: MIN_HISTORY_DAYS - historyDays };
  }
  // Nothing in the last four weeks: the athlete is coming back from a break.
  if (chronic === 0) return { acute, chronic, ratio: null, zone: "low", calibrationDaysLeft: 0 };
  const ratio = Math.round((acute / chronic) * 100) / 100;
  return { acute, chronic, ratio, zone: zoneForRatio(ratio), calibrationDaysLeft: 0 };
}

// ---------------------------------------------------------------------------
// Consistency: sessions per calendar week (Monday first) against the target
// ---------------------------------------------------------------------------

export const DEFAULT_WEEKLY_TARGET = 3;
const MAX_WEEKLY_TARGET = 14;

export const weekStartKey = (key: string): string => toDateKey(startOfWeek(fromDateKey(key), { weekStartsOn: 1 }));

export interface WeekCount {
  start: string;
  count: number;
}

export interface Consistency {
  target: number;
  /** False when the profile has no weekly availability and the default applies. */
  targetFromProfile: boolean;
  thisWeek: number;
  /** Oldest first; the last one is the current week. */
  weeks: WeekCount[];
  /** Finished weeks, since the first session, that reached the target. */
  weeksOnTarget: number;
  finishedWeeks: number;
}

export function consistency(
  dateKeys: ReadonlyArray<string>,
  weeklyTarget: number | null | undefined,
  today: string,
  weekCount = 4,
): Consistency {
  const fromProfile = Number.isInteger(weeklyTarget) && weeklyTarget! >= 1 && weeklyTarget! <= MAX_WEEKLY_TARGET;
  const target = fromProfile ? weeklyTarget! : DEFAULT_WEEKLY_TARGET;
  const current = weekStartKey(today);
  const weeks = Array.from({ length: weekCount }, (_, i) => ({ start: shiftDateKey(current, -7 * (weekCount - 1 - i)), count: 0 }));
  const byStart = new Map(weeks.map((w) => [w.start, w]));
  let first: string | null = null;
  for (const key of dateKeys) {
    if (key > today) continue;
    if (!first || key < first) first = key;
    const week = byStart.get(weekStartKey(key));
    if (week) week.count++;
  }
  const firstWeek = first ? weekStartKey(first) : current;
  const finished = weeks.slice(0, -1).filter((w) => w.start >= firstWeek);
  return {
    target,
    targetFromProfile: fromProfile,
    thisWeek: weeks[weeks.length - 1].count,
    weeks,
    weeksOnTarget: finished.filter((w) => w.count >= target).length,
    finishedWeeks: finished.length,
  };
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

/** Consecutive training days ending today, or yesterday if today is not trained yet. */
export function currentStreak(dateKeys: ReadonlyArray<string>, today: string): number {
  const days = new Set(dateKeys);
  let cursor = days.has(today) ? today : shiftDateKey(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function longestStreak(dateKeys: ReadonlyArray<string>): number {
  const days = [...new Set(dateKeys)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && shiftDateKey(days[i - 1], 1) === days[i] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

// ---------------------------------------------------------------------------
// Personal records
// ---------------------------------------------------------------------------

export interface PerfSet {
  weight_kg: number | string | null;
  reps: number | null;
  completed: boolean | null;
}

export interface PerfSession extends LoadInput {
  id: string;
  completed_at: string;
  rounds_completed: number | null;
  total_volume_kg: number | string | null;
  exercises: ReadonlyArray<{ exercise_id: string; name: string; sets: ReadonlyArray<PerfSet> }>;
}

export interface ExerciseRecord {
  exerciseId: string;
  name: string;
  weightKg: number;
  reps: number;
  dateKey: string;
}

export interface SessionRecord {
  value: number;
  dateKey: string;
}

export interface Records {
  /** Heaviest validated set per exercise, most recently set first. */
  exercises: ExerciseRecord[];
  volume: SessionRecord | null;
  rounds: SessionRecord | null;
  longestStreak: number;
}

const byCompletion = (a: PerfSession, b: PerfSession) => a.completed_at.localeCompare(b.completed_at);

/** Heaviest validated set of each exercise in one session (more reps breaks a tie). */
function bestSets(session: PerfSession): Map<string, { name: string; weightKg: number; reps: number }> {
  const best = new Map<string, { name: string; weightKg: number; reps: number }>();
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      const weightKg = Number(s.weight_kg) || 0;
      const reps = Number(s.reps) || 0;
      if (!s.completed || weightKg <= 0 || reps < 1) continue;
      const current = best.get(ex.exercise_id);
      if (!current || weightKg > current.weightKg || (weightKg === current.weightKg && reps > current.reps)) {
        best.set(ex.exercise_id, { name: ex.name, weightKg, reps });
      }
    }
  }
  return best;
}

export function personalRecords(sessions: ReadonlyArray<PerfSession>): Records {
  const ordered = [...sessions].sort(byCompletion);
  const exercises = new Map<string, ExerciseRecord>();
  let volume: SessionRecord | null = null;
  let rounds: SessionRecord | null = null;

  for (const session of ordered) {
    const dateKey = timestampToDateKey(session.completed_at);
    for (const [exerciseId, set] of bestSets(session)) {
      const current = exercises.get(exerciseId);
      if (!current || set.weightKg > current.weightKg || (set.weightKg === current.weightKg && set.reps > current.reps)) {
        exercises.set(exerciseId, { exerciseId, ...set, dateKey });
      }
    }
    const v = Math.round(Number(session.total_volume_kg) || 0);
    if (v > 0 && (!volume || v > volume.value)) volume = { value: v, dateKey };
    const r = session.rounds_completed ?? 0;
    if (r > 0 && (!rounds || r > rounds.value)) rounds = { value: r, dateKey };
  }

  return {
    exercises: [...exercises.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.weightKg - a.weightKg),
    volume,
    rounds,
    longestStreak: longestStreak(ordered.map((s) => timestampToDateKey(s.completed_at))),
  };
}

export type NewRecord =
  | { kind: "weight"; name: string; value: number; previous: number }
  | { kind: "volume"; value: number; previous: number }
  | { kind: "rounds"; value: number; previous: number };

/**
 * Records a session beat, compared with every session completed before it. A
 * first attempt is not a record: there must be a previous mark to beat.
 */
export function recordsBeaten(sessions: ReadonlyArray<PerfSession>, sessionId: string): NewRecord[] {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return [];
  const before = sessions.filter((s) => s.id !== sessionId && s.completed_at < session.completed_at);

  const previousWeight = new Map<string, number>();
  let previousVolume = 0;
  let previousRounds = 0;
  for (const s of before) {
    for (const [exerciseId, set] of bestSets(s)) {
      previousWeight.set(exerciseId, Math.max(previousWeight.get(exerciseId) ?? 0, set.weightKg));
    }
    previousVolume = Math.max(previousVolume, Math.round(Number(s.total_volume_kg) || 0));
    previousRounds = Math.max(previousRounds, s.rounds_completed ?? 0);
  }

  const beaten: NewRecord[] = [];
  for (const [exerciseId, set] of bestSets(session)) {
    const previous = previousWeight.get(exerciseId) ?? 0;
    if (previous > 0 && set.weightKg > previous) beaten.push({ kind: "weight", name: set.name, value: set.weightKg, previous });
  }
  const volume = Math.round(Number(session.total_volume_kg) || 0);
  if (previousVolume > 0 && volume > previousVolume) beaten.push({ kind: "volume", value: volume, previous: previousVolume });
  const rounds = session.rounds_completed ?? 0;
  if (previousRounds > 0 && rounds > previousRounds) beaten.push({ kind: "rounds", value: rounds, previous: previousRounds });
  return beaten;
}

// ---------------------------------------------------------------------------
// Fight camp: the eight weeks before the goal date set in the profile
// ---------------------------------------------------------------------------

export const CAMP_WEEKS = 8;

export interface FightCamp {
  event: string | null;
  deadline: string;
  daysLeft: number;
  /** 1 to CAMP_WEEKS inside the camp, null before it starts. */
  week: number | null;
  startKey: string;
  sessionsInCamp: number;
}

export function fightCamp(
  deadline: string | null | undefined,
  event: string | null | undefined,
  today: string,
  dateKeys: ReadonlyArray<string>,
): FightCamp | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const daysLeft = differenceInCalendarDays(fromDateKey(deadline), fromDateKey(today));
  if (!Number.isFinite(daysLeft) || daysLeft < 0) return null;
  // Week 1 begins when daysLeft drops to CAMP_WEEKS * 7 - 1.
  const startKey = shiftDateKey(deadline, -(CAMP_WEEKS * 7 - 1));
  const week = daysLeft < CAMP_WEEKS * 7 ? CAMP_WEEKS - Math.floor(daysLeft / 7) : null;
  const name = event?.trim().slice(0, 80);
  return {
    event: name || null,
    deadline,
    daysLeft,
    week,
    startKey,
    sessionsInCamp: week === null ? 0 : dateKeys.filter((k) => k >= startKey && k <= today).length,
  };
}

// ---------------------------------------------------------------------------
// Everything the dashboard shows
// ---------------------------------------------------------------------------

export interface PerformanceProfile {
  weekly_availability: number | null;
  goal_deadline: string | null;
  target_event: string | null;
}

export interface Performance {
  totalSessions: number;
  streakDays: number;
  consistency: Consistency;
  load: TrainingLoad;
  records: Records;
  camp: FightCamp | null;
}

export function buildPerformance(
  sessions: ReadonlyArray<PerfSession>,
  profile: PerformanceProfile | null,
  today: string = toDateKey(),
): Performance {
  const dated = sessions.map((s) => ({ dateKey: timestampToDateKey(s.completed_at), load: sessionLoad(s) }));
  const keys = dated.map((d) => d.dateKey);
  return {
    totalSessions: sessions.length,
    streakDays: currentStreak(keys, today),
    consistency: consistency(keys, profile?.weekly_availability, today),
    load: trainingLoad(dated, today),
    records: personalRecords(sessions),
    camp: fightCamp(profile?.goal_deadline, profile?.target_event, today, keys),
  };
}
