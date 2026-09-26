/**
 * Motion sheets for sparring analysis.
 *
 * A single frame every few seconds cannot show a strike: the model only sees
 * guards. Each sheet packs a short burst of consecutive frames in a 2×2 grid,
 * with the timecode burned into every cell, so the model sees movement and can
 * date what it reports. Same image count and size as single frames.
 */
import { validateFrame } from "./videoFrameExtractor";

export const SHEET_COLS = 2;
export const SHEET_ROWS = 2;
export const FRAMES_PER_SHEET = SHEET_COLS * SHEET_ROWS;

export interface MotionSheet {
  /** Timecodes (s) of the cells, in reading order. */
  timestamps: number[];
  /** JPEG, base64 without the data: prefix. */
  base64: string;
}

export interface MotionSheetResult {
  sheets: MotionSheet[];
  /** Real video duration in seconds. */
  duration: number;
  burstSpacing: number;
  /** First sheet, as a data URL, for the waiting screen preview. */
  previewDataUrl: string | null;
}

export interface MotionSheetOptions {
  maxSheets?: number;
  burstSpacing?: number;
  /** Longest side of a sheet, in px. */
  maxSide?: number;
  quality?: number;
  /** Quality is lowered until a sheet fits (server rejects frames > 600k chars). */
  maxBase64Chars?: number;
  minDuration?: number;
  timeoutMs?: number;
  onProgress?: (done: number, total: number) => void;
  onPreview?: (dataUrl: string) => void;
}

const MIN_QUALITY = 0.35;
const SEEK_TIMEOUT_MS = 8000;

// ============================================
// PURE HELPERS
// ============================================

/** Evenly spread burst start times over the video, never past its end. */
export function planSheetStarts(duration: number, maxSheets: number, burstSpan: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0 || maxSheets <= 0) return [];
  // Short clips: one sheet every ~1.5 s is already dense; no need for maxSheets.
  const count = Math.max(1, Math.min(maxSheets, Math.floor(duration / 1.5)));
  const lastStart = Math.max(0, duration - burstSpan - 0.05);
  if (count === 1) return [lastStart / 2];
  const step = lastStart / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(i * step * 100) / 100);
}

/** Cell and sheet size in px, keeping the video aspect ratio. */
export function sheetGeometry(videoWidth: number, videoHeight: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(videoWidth * SHEET_COLS, videoHeight * SHEET_ROWS));
  const cellWidth = Math.max(1, Math.round(videoWidth * scale));
  const cellHeight = Math.max(1, Math.round(videoHeight * scale));
  return { cellWidth, cellHeight, width: cellWidth * SHEET_COLS, height: cellHeight * SHEET_ROWS };
}

/** "m:ss.s", as burned into the cells and quoted in the prompt. */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** Share of the video actually shown to the model, in %. */
export function coveragePercent(sheetCount: number, burstSpacing: number, duration: number): number {
  if (duration <= 0) return 0;
  const observed = sheetCount * FRAMES_PER_SHEET * burstSpacing;
  return Math.min(100, Math.round((observed / duration) * 100));
}

// ============================================
// DOM EXTRACTION
// ============================================

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      reject(new Error("Lecture de la vidéo trop lente"));
    }, SEEK_TIMEOUT_MS);
    const onSeeked = () => {
      clearTimeout(timer);
      resolve();
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = time;
  });
}

// MediaRecorder WebM files report an infinite duration until the end is read.
async function readDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration)) return video.duration;
  await new Promise<void>((resolve) => {
    const onChange = () => {
      if (Number.isFinite(video.duration)) {
        video.removeEventListener("durationchange", onChange);
        resolve();
      }
    };
    video.addEventListener("durationchange", onChange);
    video.currentTime = Number.MAX_SAFE_INTEGER;
  });
  return video.duration;
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const release = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve({ video, release });
    video.onerror = () => {
      release();
      reject(new Error("Impossible de lire cette vidéo dans le navigateur."));
    };
    video.src = url;
  });
}

function drawTimecode(ctx: CanvasRenderingContext2D, x: number, y: number, cellHeight: number, label: string) {
  const size = Math.max(12, Math.round(cellHeight * 0.06));
  ctx.font = `600 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  const pad = Math.round(size * 0.4);
  const width = ctx.measureText(label).width + pad * 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(x, y, width, size + pad * 2);
  ctx.fillStyle = "#f5d98a";
  ctx.textBaseline = "top";
  ctx.fillText(label, x + pad, y + pad);
}

function encode(canvas: HTMLCanvasElement, quality: number, maxChars: number): string {
  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > maxChars && q > MIN_QUALITY) {
    q = Math.max(MIN_QUALITY, q - 0.1);
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  return dataUrl;
}

export async function extractMotionSheets(file: File, options: MotionSheetOptions = {}): Promise<MotionSheetResult> {
  const {
    maxSheets = 48,
    burstSpacing = 0.25,
    maxSide = 1280,
    quality = 0.72,
    maxBase64Chars = 380_000,
    minDuration = 6,
    timeoutMs = 240_000,
    onProgress,
    onPreview,
  } = options;

  const { video, release } = await loadVideo(file);
  const startedAt = Date.now();
  try {
    const duration = await readDuration(video);
    if (!Number.isFinite(duration) || duration < minDuration) {
      throw new Error(`Vidéo trop courte (minimum ${minDuration} secondes).`);
    }
    if (!video.videoWidth || !video.videoHeight) throw new Error("Vidéo sans piste image exploitable.");

    const burstSpan = burstSpacing * (FRAMES_PER_SHEET - 1);
    const starts = planSheetStarts(duration, maxSheets, burstSpan);
    const geometry = sheetGeometry(video.videoWidth, video.videoHeight, maxSide);

    const canvas = document.createElement("canvas");
    canvas.width = geometry.width;
    canvas.height = geometry.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D indisponible dans ce navigateur.");

    const sheets: MotionSheet[] = [];
    let previewDataUrl: string | null = null;

    for (let s = 0; s < starts.length; s++) {
      // Keep what we have rather than lose everything on a slow device.
      if (Date.now() - startedAt > timeoutMs) break;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const timestamps: number[] = [];
      for (let k = 0; k < FRAMES_PER_SHEET; k++) {
        const time = Math.min(starts[s] + k * burstSpacing, duration - 0.05);
        await seek(video, time);
        const x = (k % SHEET_COLS) * geometry.cellWidth;
        const y = Math.floor(k / SHEET_COLS) * geometry.cellHeight;
        ctx.drawImage(video, x, y, geometry.cellWidth, geometry.cellHeight);
        drawTimecode(ctx, x + 6, y + 6, geometry.cellHeight, formatTimecode(time));
        timestamps.push(Math.round(time * 100) / 100);
      }

      // Cell separators, so the model reads four views and not one picture.
      ctx.fillStyle = "#000";
      ctx.fillRect(geometry.cellWidth - 1, 0, 2, canvas.height);
      ctx.fillRect(0, geometry.cellHeight - 1, canvas.width, 2);

      const check = validateFrame(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (check.isValid) {
        const dataUrl = encode(canvas, quality, maxBase64Chars);
        if (!previewDataUrl) {
          previewDataUrl = dataUrl;
          onPreview?.(dataUrl);
        }
        sheets.push({ timestamps, base64: dataUrl.replace(/^data:image\/\w+;base64,/, "") });
      }
      onProgress?.(s + 1, starts.length);
    }

    return { sheets, duration, burstSpacing, previewDataUrl };
  } finally {
    release();
  }
}
