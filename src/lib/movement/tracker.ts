import type { Pose } from "./landmarks";

// Follows the two fighters across frames: MediaPipe returns poses in no
// particular order, so each one goes to the track whose last position is
// closest. Identity swaps in a tight clinch remain possible.

type Center = { x: number; y: number };

const MIN_VISIBILITY = 0.3;
// A track not seen for this many frames is considered lost and re-acquired anew.
const MAX_MISSED = 20;
// Cost of starting a lost track, in normalised image units.
const NEW_TRACK_COST = 0.35;

const visible = (pose: Pose, index: number) => {
  const p = pose[index];
  return p && (p.visibility ?? 1) >= MIN_VISIBILITY ? p : null;
};

/** Hips midpoint, else shoulders midpoint. */
export function poseCenter(pose: Pose): Center | null {
  for (const [a, b] of [[23, 24], [11, 12]]) {
    const pa = visible(pose, a);
    const pb = visible(pose, b);
    if (pa && pb) return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
    if (pa || pb) return { x: (pa ?? pb)!.x, y: (pa ?? pb)!.y };
  }
  return null;
}

function poseHeight(pose: Pose): number {
  const ys = pose.filter((p) => (p.visibility ?? 1) >= MIN_VISIBILITY).map((p) => p.y);
  return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
}

const distance = (a: Center, b: Center) => Math.hypot(a.x - b.x, a.y - b.y);

export class TwoPersonTracker {
  private last: [Center | null, Center | null] = [null, null];
  private missed: [number, number] = [0, 0];

  assign(poses: ReadonlyArray<Pose>): [Pose | null, Pose | null] {
    // The two largest people are the fighters; referee and spectators come smaller or farther.
    const candidates = poses
      .map((pose) => ({ pose, center: poseCenter(pose), height: poseHeight(pose) }))
      .filter((c): c is { pose: Pose; center: Center; height: number } => c.center !== null)
      .sort((a, b) => b.height - a.height)
      .slice(0, 2);

    const cost = (slot: 0 | 1, center: Center) => {
      const last = this.last[slot];
      return last ? distance(last, center) : NEW_TRACK_COST;
    };

    let order: Array<0 | 1>;
    if (candidates.length === 2) {
      if (!this.last[0] && !this.last[1]) {
        order = candidates[0].center.x <= candidates[1].center.x ? [0, 1] : [1, 0];
      } else {
        const straight = cost(0, candidates[0].center) + cost(1, candidates[1].center);
        const swapped = cost(1, candidates[0].center) + cost(0, candidates[1].center);
        order = straight <= swapped ? [0, 1] : [1, 0];
      }
    } else if (candidates.length === 1) {
      order = [cost(0, candidates[0].center) <= cost(1, candidates[0].center) ? 0 : 1];
    } else {
      order = [];
    }

    const result: [Pose | null, Pose | null] = [null, null];
    order.forEach((slot, i) => {
      result[slot] = candidates[i].pose;
      this.last[slot] = candidates[i].center;
      this.missed[slot] = 0;
    });
    for (const slot of [0, 1] as const) {
      if (result[slot]) continue;
      this.missed[slot] += 1;
      if (this.missed[slot] > MAX_MISSED) this.last[slot] = null;
    }
    return result;
  }
}
