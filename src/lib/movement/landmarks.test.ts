import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BYTES_PER_FRAME, KEPT_LANDMARKS, LANDMARK_SET, encodeTrack, toBase64, type Pose } from "./landmarks";
import { MOVEMENT_CONSENT_VERSION } from "./contribution";

const pose = (x: number): Pose => Array.from({ length: 33 }, (_, i) => ({ x, y: i / 100, z: -0.5, visibility: 0.9 }));
const int16 = (bytes: Uint8Array, index: number) => new DataView(bytes.buffer).getInt16(index * 2, true);

describe("movement track encoding", () => {
  it("keeps the nose and the body, never the other facial points", () => {
    expect(KEPT_LANDMARKS).toHaveLength(23);
    expect(KEPT_LANDMARKS[0]).toBe(0);
    for (let face = 1; face <= 10; face++) expect(KEPT_LANDMARKS).not.toContain(face);
    expect(BYTES_PER_FRAME).toBe(184);
  });

  it("stores x, y, z and visibility scaled by 10 000, and marks missing frames", () => {
    const bytes = encodeTrack([pose(0.25), null]);
    expect(bytes).toHaveLength(2 * BYTES_PER_FRAME);
    // Second kept point is MediaPipe index 11 (left shoulder).
    expect([int16(bytes, 4), int16(bytes, 5), int16(bytes, 6), int16(bytes, 7)]).toEqual([2500, 1100, -5000, 9000]);
    const missing = BYTES_PER_FRAME / 2;
    expect(int16(bytes, missing)).toBe(-32768);
    expect(int16(bytes, missing + 91)).toBe(-32768);
  });

  it("clamps out-of-frame points instead of overflowing", () => {
    const bytes = encodeTrack([pose(9)]);
    expect(int16(bytes, 0)).toBe(32767);
  });

  it("encodes base64 like the server decodes it", () => {
    const bytes = encodeTrack([pose(0.5), pose(0.6)]);
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });

  it("matches the constants checked by the database", () => {
    const sql = readFileSync("supabase/migrations/20260928100000_movement_contributions.sql", "utf8");
    expect(sql).toContain(`SELECT '${MOVEMENT_CONSENT_VERSION}'::text`);
    expect(sql).toContain(`'${LANDMARK_SET}'`);
    expect(sql).toContain(`p_frame_count * ${BYTES_PER_FRAME}`);
  });
});
