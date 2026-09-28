import type { Pose } from "./landmarks";
import { loadPoseLandmarker } from "./poseLandmarker";
import { TwoPersonTracker } from "./tracker";

// Runs pose estimation over a local video, frame by frame at a fixed rate.
// Everything happens on the device; only the resulting skeletons are kept.

export const MOVEMENT_FPS = 10;
export const MAX_MOVEMENT_SECONDS = 180;
const SEEK_TIMEOUT_MS = 8_000;
const PREVIEW_MAX_SIDE = 640;

export const TRACK_COLORS = ["#3b82f6", "#ef4444"] as const;
export const TRACK_NAMES = ["A", "B"] as const;

const BONES: ReadonlyArray<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 31], [24, 26], [26, 28], [28, 32], [0, 11], [0, 12],
];

export interface MovementCapture {
  fps: number;
  frameCount: number;
  tracks: [Array<Pose | null>, Array<Pose | null>];
  /** Share of frames where each track is present, 0 to 1. */
  coverage: [number, number];
  /** Local image of one frame with both skeletons drawn, to tell who is who. Never uploaded. */
  preview: string | null;
  truncated: boolean;
}

export interface CaptureOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener("seeked", done);
      reject(new Error("La vidéo ne répond pas pendant la lecture image par image."));
    }, SEEK_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    video.currentTime = time;
  });
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error("Vidéo illisible sur cet appareil."));
    video.src = url;
  });
}

export function drawSkeletons(video: HTMLVideoElement, poses: [Pose | null, Pose | null]): string {
  const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  poses.forEach((pose, slot) => {
    if (!pose) return;
    ctx.strokeStyle = TRACK_COLORS[slot];
    ctx.fillStyle = TRACK_COLORS[slot];
    ctx.lineWidth = 4;
    for (const [a, b] of BONES) {
      ctx.beginPath();
      ctx.moveTo(pose[a].x * canvas.width, pose[a].y * canvas.height);
      ctx.lineTo(pose[b].x * canvas.width, pose[b].y * canvas.height);
      ctx.stroke();
    }
    const head = pose[0];
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(TRACK_NAMES[slot], head.x * canvas.width + 12, Math.max(28, head.y * canvas.height - 16));
  });
  return canvas.toDataURL("image/jpeg", 0.8);
}

export async function captureMovement(file: File, { onProgress, signal }: CaptureOptions = {}): Promise<MovementCapture> {
  const landmarker = await loadPoseLandmarker();
  const url = URL.createObjectURL(file);
  try {
    const video = await loadVideo(url);
    const total = Math.floor(Math.min(video.duration, MAX_MOVEMENT_SECONDS) * MOVEMENT_FPS);
    if (!Number.isFinite(total) || total < MOVEMENT_FPS) throw new Error("Vidéo trop courte pour en extraire le mouvement.");

    const tracker = new TwoPersonTracker();
    const tracks: MovementCapture["tracks"] = [[], []];
    let preview: string | null = null;
    let firstBoth = -1;
    // The preview comes from a frame past the first fifth, when both fighters are in view.
    const previewFrom = Math.floor(total / 5);

    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException("Annulé", "AbortError");
      const time = i / MOVEMENT_FPS;
      await seek(video, time);
      const result = landmarker.detectForVideo(video, Math.round(time * 1000) + 1);
      const [a, b] = tracker.assign(result.landmarks);
      tracks[0].push(a);
      tracks[1].push(b);
      if (a && b && firstBoth < 0) firstBoth = i;
      if (!preview && a && b && i >= previewFrom) preview = drawSkeletons(video, [a, b]);
      onProgress?.(i + 1, total);
    }
    if (!preview && firstBoth >= 0) {
      await seek(video, firstBoth / MOVEMENT_FPS);
      preview = drawSkeletons(video, [tracks[0][firstBoth], tracks[1][firstBoth]]);
    }

    const share = (track: Array<Pose | null>) => track.filter(Boolean).length / total;
    return {
      fps: MOVEMENT_FPS,
      frameCount: total,
      tracks,
      coverage: [share(tracks[0]), share(tracks[1])],
      preview,
      truncated: video.duration > MAX_MOVEMENT_SECONDS,
    };
  } finally {
    landmarker.close();
    URL.revokeObjectURL(url);
  }
}
