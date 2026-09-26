import { describe, expect, it } from "vitest";
import {
  asIntensity,
  asSessionType,
  estimateCalories,
  formatClock,
  roundClock,
  roundPlanSeconds,
  sessionMinutes,
  summarizeSets,
} from "./session";

describe("summarizeSets", () => {
  it("counts only validated sets and parses numeric strings", () => {
    const s = summarizeSets([
      { sets: [{ weight_kg: "80", reps: 5, completed: true }, { weight_kg: 80, reps: 5, completed: false }] },
      { sets: [{ weight_kg: null, reps: 20, completed: true }] },
      { sets: [{ weight_kg: 50, reps: 10, completed: null }] },
    ]);
    expect(s).toEqual({ setsCompleted: 2, setsTotal: 4, reps: 25, volumeKg: 400, exercisesWorked: 2 });
  });
});

describe("estimateCalories", () => {
  it("scales with MET, weight and time", () => {
    expect(estimateCalories("boxing", "intense", 60, 80)).toBe(800);
    expect(estimateCalories("strength", "moderate", 30, 70)).toBe(175);
  });
  it("falls back to a default weight when missing or absurd", () => {
    expect(estimateCalories("cardio", "moderate", 60, null)).toBe(525);
    expect(estimateCalories("cardio", "moderate", 60, 900)).toBe(525);
  });
});

describe("sessionMinutes", () => {
  it("caps sessions left open", () => {
    const start = new Date(2026, 8, 26, 8, 0).toISOString();
    expect(sessionMinutes(start, new Date(2026, 8, 26, 8, 47))).toBe(47);
    expect(sessionMinutes(start, new Date(2026, 8, 27, 8, 0))).toBe(240);
    expect(sessionMinutes(null)).toBe(0);
  });
});

describe("roundClock", () => {
  const plan = { rounds: 3, workSeconds: 180, restSeconds: 60 };
  it("walks through work and rest phases", () => {
    expect(roundClock(0, plan)).toEqual({ phase: "work", round: 1, remaining: 180, roundsCompleted: 0 });
    expect(roundClock(170, plan)).toEqual({ phase: "work", round: 1, remaining: 10, roundsCompleted: 0 });
    expect(roundClock(200, plan)).toEqual({ phase: "rest", round: 1, remaining: 40, roundsCompleted: 1 });
    expect(roundClock(250, plan)).toEqual({ phase: "work", round: 2, remaining: 170, roundsCompleted: 1 });
  });
  it("has no rest after the last round", () => {
    expect(roundPlanSeconds(plan)).toBe(660);
    expect(roundClock(659, plan).phase).toBe("work");
    expect(roundClock(660, plan)).toEqual({ phase: "done", round: 3, remaining: 0, roundsCompleted: 3 });
  });
});

describe("helpers", () => {
  it("formats clocks", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(59.2)).toBe("1:00");
    expect(formatClock(3725)).toBe("1:02:05");
  });
  it("normalises stored enums", () => {
    expect(asSessionType("boxing")).toBe("boxing");
    expect(asSessionType(null)).toBe("custom");
    expect(asIntensity("yoga")).toBe("moderate");
  });
});
