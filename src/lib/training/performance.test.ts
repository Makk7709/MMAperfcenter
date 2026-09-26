import { describe, expect, it } from "vitest";
import { shiftDateKey } from "@/lib/dateKey";
import {
  buildPerformance,
  consistency,
  currentStreak,
  effortLabel,
  fightCamp,
  longestStreak,
  personalRecords,
  recordsBeaten,
  sessionEffort,
  sessionLoad,
  trainingLoad,
  weekStartKey,
  zoneForRatio,
  type PerfSession,
} from "./performance";

const TODAY = "2026-09-26"; // a Saturday

/** Local timestamp at 18:00 on a day key, like a stored `completed_at`. */
const at = (key: string, hour = 18) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};

let seq = 0;
const session = (key: string, patch: Partial<PerfSession> = {}): PerfSession => ({
  id: `s${++seq}`,
  completed_at: at(key),
  duration_minutes: 60,
  intensity: "moderate",
  perceived_effort: null,
  rounds_completed: 0,
  total_volume_kg: 0,
  exercises: [],
  ...patch,
});

const lift = (exercise_id: string, name: string, sets: Array<[number, number, boolean?]>) => ({
  exercise_id,
  name,
  sets: sets.map(([weight_kg, reps, completed = true]) => ({ weight_kg, reps, completed })),
});

describe("session load", () => {
  it("multiplies perceived effort by minutes", () => {
    expect(sessionLoad({ duration_minutes: 60, intensity: "light", perceived_effort: 7 })).toBe(420);
  });
  it("falls back on the intensity for sessions without effort", () => {
    expect(sessionEffort({ intensity: "intense", perceived_effort: null })).toBe(8);
    expect(sessionEffort({ intensity: null, perceived_effort: 0 })).toBe(5);
    expect(sessionEffort({ intensity: "light", perceived_effort: 11 })).toBe(3);
  });
  it("caps a session left open", () => {
    expect(sessionLoad({ duration_minutes: 900, intensity: "moderate", perceived_effort: 5 })).toBe(1200);
  });
  it("labels the CR-10 scale", () => {
    expect(effortLabel(1)).toBe("Très facile");
    expect(effortLabel(10)).toBe("Maximal");
    expect(effortLabel(42)).toBe("Maximal");
  });
});

describe("trainingLoad", () => {
  const daily = (days: number, load: number, from = TODAY) =>
    Array.from({ length: days }, (_, i) => ({ dateKey: shiftDateKey(from, -i), load }));

  it("calibrates during the first three weeks", () => {
    const l = trainingLoad(daily(10, 300), TODAY);
    expect(l.zone).toBe("calibrating");
    expect(l.ratio).toBeNull();
    expect(l.calibrationDaysLeft).toBe(11);
  });

  it("is optimal on a steady routine", () => {
    const l = trainingLoad(daily(28, 300), TODAY);
    expect(l.acute).toBe(2100);
    expect(l.chronic).toBe(2100);
    expect(l.ratio).toBe(1);
    expect(l.zone).toBe("optimal");
  });

  it("flags a spike after a quiet month", () => {
    const quiet = daily(21, 100, shiftDateKey(TODAY, -7));
    const spike = daily(7, 400);
    const l = trainingLoad([...quiet, ...spike], TODAY);
    expect(l.ratio).toBeGreaterThan(1.5);
    expect(l.zone).toBe("danger");
  });

  it("uses the history length as the chronic window before 28 days", () => {
    const l = trainingLoad(daily(21, 100), TODAY);
    expect(l.chronic).toBe(700);
    expect(l.ratio).toBe(1);
  });

  it("reads a long break as under-load", () => {
    const l = trainingLoad([{ dateKey: shiftDateKey(TODAY, -60), load: 500 }], TODAY);
    expect(l).toMatchObject({ acute: 0, chronic: 0, ratio: null, zone: "low" });
  });

  it("maps ratios to zones", () => {
    expect(zoneForRatio(0.79)).toBe("low");
    expect(zoneForRatio(0.8)).toBe("optimal");
    expect(zoneForRatio(1.3)).toBe("optimal");
    expect(zoneForRatio(1.45)).toBe("high");
    expect(zoneForRatio(1.51)).toBe("danger");
  });
});

describe("consistency", () => {
  it("starts weeks on Monday", () => {
    expect(weekStartKey(TODAY)).toBe("2026-09-21");
    expect(weekStartKey("2026-09-21")).toBe("2026-09-21");
  });

  it("counts sessions per week against the profile target", () => {
    const keys = ["2026-09-22", "2026-09-24", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-17", "2026-09-08"];
    const c = consistency(keys, 3, TODAY);
    expect(c.weeks.map((w) => w.count)).toEqual([0, 1, 4, 2]);
    expect(c).toMatchObject({ target: 3, targetFromProfile: true, thisWeek: 2, weeksOnTarget: 1, finishedWeeks: 2 });
  });

  it("ignores weeks before the first session", () => {
    const c = consistency(["2026-09-22"], 4, TODAY);
    expect(c.finishedWeeks).toBe(0);
  });

  it("uses a default target when the profile has none or an absurd one", () => {
    expect(consistency([], null, TODAY)).toMatchObject({ target: 3, targetFromProfile: false });
    expect(consistency([], 40, TODAY).targetFromProfile).toBe(false);
  });
});

describe("streaks", () => {
  it("keeps the streak alive until the end of the next day", () => {
    const keys = ["2026-09-25", "2026-09-24", "2026-09-22"];
    expect(currentStreak(keys, TODAY)).toBe(2);
    expect(currentStreak(["2026-09-26", ...keys], TODAY)).toBe(3);
    expect(currentStreak(["2026-09-23"], TODAY)).toBe(0);
  });
  it("finds the longest run across months", () => {
    expect(longestStreak(["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-01", "2026-09-10"])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("personal records", () => {
  const squat = (sets: Array<[number, number, boolean?]>) => lift("squat", "Squat", sets);

  it("keeps the heaviest validated set per exercise", () => {
    const r = personalRecords([
      session("2026-09-01", { exercises: [squat([[80, 5], [100, 3, false]])], total_volume_kg: 400 }),
      session("2026-09-10", { exercises: [squat([[90, 2], [90, 4]]), lift("bench", "Développé couché", [[60, 8]])], rounds_completed: 5 }),
      session("2026-09-12", { exercises: [squat([[85, 10]])], total_volume_kg: "1200.4", rounds_completed: 3 }),
    ]);
    expect(r.exercises).toEqual([
      { exerciseId: "squat", name: "Squat", weightKg: 90, reps: 4, dateKey: "2026-09-10" },
      { exerciseId: "bench", name: "Développé couché", weightKg: 60, reps: 8, dateKey: "2026-09-10" },
    ]);
    expect(r.volume).toEqual({ value: 1200, dateKey: "2026-09-12" });
    expect(r.rounds).toEqual({ value: 5, dateKey: "2026-09-10" });
  });

  it("ignores bodyweight and empty sets", () => {
    const r = personalRecords([session(TODAY, { exercises: [lift("pushup", "Pompes", [[0, 30], [20, 0]])] })]);
    expect(r.exercises).toEqual([]);
    expect(r.volume).toBeNull();
  });

  it("reports what a session beat, never a first attempt", () => {
    const history = [
      session("2026-09-01", { exercises: [squat([[80, 5]])], total_volume_kg: 400, rounds_completed: 4 }),
      session("2026-09-20", {
        id: "latest",
        exercises: [squat([[85, 3]]), lift("bench", "Développé couché", [[60, 8]])],
        total_volume_kg: 735,
        rounds_completed: 4,
      }),
    ];
    expect(recordsBeaten(history, "latest")).toEqual([
      { kind: "weight", name: "Squat", value: 85, previous: 80 },
      { kind: "volume", value: 735, previous: 400 },
    ]);
    expect(recordsBeaten(history, history[0].id)).toEqual([]);
    expect(recordsBeaten(history, "missing")).toEqual([]);
  });
});

describe("fightCamp", () => {
  it("is off without a date or once the date has passed", () => {
    expect(fightCamp(null, "Gala", TODAY, [])).toBeNull();
    expect(fightCamp("2026-09-25", "Gala", TODAY, [])).toBeNull();
    expect(fightCamp("not a date", null, TODAY, [])).toBeNull();
  });

  it("counts down before the camp starts", () => {
    const c = fightCamp("2027-01-30", "  ", TODAY, [TODAY]);
    expect(c).toMatchObject({ event: null, week: null, sessionsInCamp: 0, startKey: "2026-12-06" });
    expect(c!.daysLeft).toBe(126);
  });

  it("tracks the camp week and its sessions", () => {
    const deadline = shiftDateKey(TODAY, 24);
    const c = fightCamp(deadline, "Gala Paris", TODAY, [TODAY, shiftDateKey(TODAY, -20), shiftDateKey(TODAY, -40)]);
    expect(c).toMatchObject({ event: "Gala Paris", daysLeft: 24, week: 5, sessionsInCamp: 2 });
    expect(fightCamp(TODAY, null, TODAY, [])!.week).toBe(8);
    expect(fightCamp(shiftDateKey(TODAY, 55), null, TODAY, [])!.week).toBe(1);
  });

  it("starts the camp on the first day of week 1", () => {
    const firstDay = fightCamp(shiftDateKey(TODAY, 55), null, TODAY, [TODAY])!;
    expect(firstDay).toMatchObject({ week: 1, startKey: TODAY, sessionsInCamp: 1 });
    const dayBefore = fightCamp(shiftDateKey(TODAY, 56), null, TODAY, [TODAY])!;
    expect(dayBefore).toMatchObject({ week: null, startKey: shiftDateKey(TODAY, 1), sessionsInCamp: 0 });
  });
});

describe("buildPerformance", () => {
  it("assembles every indicator from stored sessions", () => {
    const p = buildPerformance(
      [session(TODAY, { perceived_effort: 7 }), session("2026-09-25")],
      { weekly_availability: 4, goal_deadline: null, target_event: null },
      TODAY,
    );
    expect(p.totalSessions).toBe(2);
    expect(p.streakDays).toBe(2);
    expect(p.consistency).toMatchObject({ target: 4, thisWeek: 2 });
    expect(p.load).toMatchObject({ acute: 720, zone: "calibrating" });
    expect(p.camp).toBeNull();
  });
});
