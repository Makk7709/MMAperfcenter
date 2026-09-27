import { describe, expect, it } from "vitest";
import type { Pose } from "./landmarks";
import { TwoPersonTracker, poseCenter } from "./tracker";

// A standing person centred on x, `height` tall (normalised units).
const person = (x: number, height = 0.6): Pose =>
  Array.from({ length: 33 }, (_, i) => ({ x, y: 0.2 + (height * i) / 32, z: 0, visibility: 1 }));

describe("TwoPersonTracker", () => {
  it("starts with the left fighter as track A", () => {
    const tracker = new TwoPersonTracker();
    const [a, b] = tracker.assign([person(0.7), person(0.3)]);
    expect(poseCenter(a!)!.x).toBeCloseTo(0.3);
    expect(poseCenter(b!)!.x).toBeCloseTo(0.7);
  });

  it("keeps each identity when the detector returns poses in another order", () => {
    const tracker = new TwoPersonTracker();
    tracker.assign([person(0.3), person(0.7)]);
    const [a, b] = tracker.assign([person(0.68), person(0.33)]);
    expect(poseCenter(a!)!.x).toBeCloseTo(0.33);
    expect(poseCenter(b!)!.x).toBeCloseTo(0.68);
  });

  it("gives a lone detection to the nearest track", () => {
    const tracker = new TwoPersonTracker();
    tracker.assign([person(0.3), person(0.7)]);
    const [a, b] = tracker.assign([person(0.72)]);
    expect(a).toBeNull();
    expect(poseCenter(b!)!.x).toBeCloseTo(0.72);
  });

  it("ignores a smaller third person such as a referee", () => {
    const tracker = new TwoPersonTracker();
    const [a, b] = tracker.assign([person(0.3), person(0.5, 0.2), person(0.7)]);
    expect([poseCenter(a!)!.x, poseCenter(b!)!.x]).toEqual([0.3, 0.7]);
  });

  it("skips poses without visible hips or shoulders", () => {
    const hidden = person(0.5).map((p) => ({ ...p, visibility: 0.1 }));
    expect(poseCenter(hidden)).toBeNull();
    expect(new TwoPersonTracker().assign([hidden])).toEqual([null, null]);
  });
});
