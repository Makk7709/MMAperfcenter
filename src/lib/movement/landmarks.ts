// Skeleton encoding for movement contributions.
//
// MediaPipe Pose returns 33 points; the nose stands for the head and the other
// facial points (eyes, ears, mouth: 1-10) are dropped, so no facial feature
// ever leaves the device. Each kept point is stored as four Int16 values
// (x, y, z, visibility) scaled by 10 000, little-endian.

export interface PosePoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}
export type Pose = PosePoint[];

// Keep in sync with public.contribute_movement (landmark set and frame size).
export const LANDMARK_SET = "mediapipe-pose-23-v1";
export const KEPT_LANDMARKS: readonly number[] = [0, ...Array.from({ length: 22 }, (_, i) => i + 11)];
export const VALUES_PER_POINT = 4;
export const BYTES_PER_FRAME = KEPT_LANDMARKS.length * VALUES_PER_POINT * 2;

const SCALE = 10_000;
const MISSING = -32768;

const quantize = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(-32767, Math.min(32767, Math.round(value * SCALE)));
};

/** One row of BYTES_PER_FRAME per frame; a frame without the person is all MISSING. */
export function encodeTrack(frames: ReadonlyArray<Pose | null>): Uint8Array {
  const bytes = new Uint8Array(frames.length * BYTES_PER_FRAME);
  const view = new DataView(bytes.buffer);
  frames.forEach((pose, f) => {
    KEPT_LANDMARKS.forEach((index, k) => {
      const offset = f * BYTES_PER_FRAME + k * VALUES_PER_POINT * 2;
      const point = pose?.[index];
      const values = point ? [point.x, point.y, point.z, point.visibility ?? 0].map(quantize) : [MISSING, MISSING, MISSING, MISSING];
      values.forEach((v, i) => view.setInt16(offset + i * 2, v, true));
    });
  });
  return bytes;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
