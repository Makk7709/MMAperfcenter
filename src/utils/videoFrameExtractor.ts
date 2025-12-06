/**
 * Video Frame Extractor - TDD Implementation
 * 
 * Extracts frames from a video file at regular intervals for AI analysis
 * with validation to skip black/blurry frames.
 */

// ============================================
// TYPES
// ============================================

export interface ExtractedFrame {
  timestamp: number; // seconds
  dataUrl: string;   // base64 image (data:image/jpeg;base64,...)
}

export interface ExtractionOptions {
  frameInterval?: number;    // seconds between frames (default: 2)
  maxFrames?: number;        // maximum frames to extract (default: 30)
  quality?: number;          // JPEG quality 0-1 (default: 0.7)
  maxWidth?: number;         // max frame width for scaling (default: 1280)
  preferWebP?: boolean;      // try WebP format first (default: false)
  validateFrames?: boolean;  // validate frame quality (default: true)
  skipInvalidFrames?: boolean; // skip invalid frames instead of including them (default: true)
  minDuration?: number;      // minimum video duration in seconds (default: 6)
  timeoutMs?: number;        // extraction timeout in ms (default: 120000)
}

export interface FrameValidationResult {
  isValid: boolean;
  brightness: number;
  contrast: number;
  reason?: string;
}

export interface FrameValidationOptions {
  minBrightness?: number;  // minimum average brightness (default: 15)
  maxBrightness?: number;  // maximum average brightness (default: 240)
  minContrast?: number;    // minimum contrast level (default: 5)
}

export interface IntervalCalculationParams {
  videoDuration: number;
  requestedInterval: number;
  maxFrames: number;
}

export interface FormatOptions {
  maxFrames?: number;
}

// ============================================
// FRAME VALIDATION
// ============================================

/**
 * Validates a frame's quality based on brightness and contrast
 */
export function validateFrame(
  imageData: ImageData,
  options: FrameValidationOptions = {}
): FrameValidationResult {
  const {
    minBrightness = 15,
    maxBrightness = 240,
    minContrast = 5,
  } = options;

  const { data, width, height } = imageData;

  // Handle empty image data
  if (!data || data.length === 0 || width === 0 || height === 0) {
    return {
      isValid: false,
      brightness: 0,
      contrast: 0,
      reason: 'Empty or invalid image data',
    };
  }

  const pixelCount = data.length / 4;
  let totalBrightness = 0;
  const brightnessValues: number[] = [];

  // Calculate average brightness
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
    brightnessValues.push(brightness);
  }

  const avgBrightness = totalBrightness / pixelCount;

  // Check brightness bounds
  if (avgBrightness < minBrightness) {
    return {
      isValid: false,
      brightness: avgBrightness,
      contrast: 0,
      reason: 'Frame is too dark (black frame)',
    };
  }

  if (avgBrightness > maxBrightness) {
    return {
      isValid: false,
      brightness: avgBrightness,
      contrast: 0,
      reason: 'Frame is too bright (overexposed)',
    };
  }

  // Calculate contrast (standard deviation of brightness)
  let varianceSum = 0;
  for (const brightness of brightnessValues) {
    varianceSum += Math.pow(brightness - avgBrightness, 2);
  }
  const contrast = Math.sqrt(varianceSum / pixelCount);

  // Check contrast
  if (contrast < minContrast) {
    return {
      isValid: false,
      brightness: avgBrightness,
      contrast,
      reason: 'Frame has low contrast (solid color or blur)',
    };
  }

  return {
    isValid: true,
    brightness: avgBrightness,
    contrast,
  };
}

// ============================================
// INTERVAL CALCULATION
// ============================================

/**
 * Calculates the optimal frame extraction interval
 */
export function calculateOptimalInterval(params: IntervalCalculationParams): number {
  const { videoDuration, requestedInterval, maxFrames } = params;
  
  const MIN_INTERVAL = 0.5; // Minimum 0.5 seconds between frames

  // Calculate how many frames we'd get with requested interval
  const framesAtRequestedInterval = Math.floor(videoDuration / requestedInterval);

  if (framesAtRequestedInterval <= maxFrames) {
    // Requested interval is fine
    return Math.max(requestedInterval, MIN_INTERVAL);
  }

  // Need to increase interval to stay within maxFrames
  const requiredInterval = videoDuration / maxFrames;
  return Math.max(requiredInterval, MIN_INTERVAL);
}

// ============================================
// FRAME EXTRACTION
// ============================================

/**
 * Extracts frames from a video file at regular intervals
 */
export async function extractVideoFrames(
  videoFile: File,
  options: ExtractionOptions = {}
): Promise<ExtractedFrame[]> {
  const {
    frameInterval = 2,
    maxFrames = 30,
    quality = 0.7,
    maxWidth = 1280,
    preferWebP = false,
    validateFrames = true,
    skipInvalidFrames = true,
    minDuration = 6,
    timeoutMs = 120000,
  } = options;

  // Validate file type
  const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
  if (!validTypes.includes(videoFile.type)) {
    throw new Error(`Invalid video format: ${videoFile.type}. Supported: MP4, MOV, WebM, AVI`);
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const frames: ExtractedFrame[] = [];
    let currentTime = 0;
    let isCleanedUp = false;

    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    // Configure video element
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      URL.revokeObjectURL(objectUrl);
      video.remove();
      canvas.remove();
    };

    // Timeout handler
    const timeoutId = setTimeout(() => {
      cleanup();
      if (frames.length === 0) {
        reject(new Error('Video frame extraction timed out'));
      } else {
        resolve(frames);
      }
    }, timeoutMs);

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error(`Failed to load video: ${videoFile.name}`));
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      
      console.log(`[FrameExtractor] Video duration: ${duration}s`);

      // Check minimum duration
      if (duration < minDuration) {
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error(`Video too short: ${duration.toFixed(1)}s (minimum ${minDuration}s)`));
        return;
      }

      // Calculate optimal interval
      const actualInterval = calculateOptimalInterval({
        videoDuration: duration,
        requestedInterval: frameInterval,
        maxFrames,
      });

      console.log(`[FrameExtractor] Using interval: ${actualInterval}s`);

      // Set canvas size based on video dimensions
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      // Determine image format
      let format = 'image/jpeg';
      if (preferWebP) {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        if (testCanvas.toDataURL('image/webp').startsWith('data:image/webp')) {
          format = 'image/webp';
        }
        testCanvas.remove();
      }

      const captureFrame = () => {
        if (currentTime > duration || frames.length >= maxFrames) {
          clearTimeout(timeoutId);
          cleanup();
          console.log(`[FrameExtractor] Extraction complete: ${frames.length} frames`);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Validate frame if enabled
        let shouldInclude = true;
        if (validateFrames) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const validation = validateFrame(imageData);
          
          if (!validation.isValid) {
            console.log(`[FrameExtractor] Skipping invalid frame at ${currentTime}s: ${validation.reason}`);
            shouldInclude = !skipInvalidFrames;
          }
        }

        if (shouldInclude) {
          const dataUrl = canvas.toDataURL(format, quality);
          frames.push({
            timestamp: currentTime,
            dataUrl,
          });
        }

        // Move to next frame
        currentTime += actualInterval;
        captureFrame();
      };

      // Start extraction
      captureFrame();
    };
  });
}

// ============================================
// API FORMATTING
// ============================================

/**
 * Formats extracted frames for API consumption
 * Strips data URL prefix and returns plain base64
 */
export function formatFramesForAPI(
  frames: ExtractedFrame[],
  options: FormatOptions = {}
): {
  frames: Array<{ timestamp: number; base64: string }>;
  totalDuration: number;
} {
  const { maxFrames } = options;

  // Limit frames if maxFrames specified
  let processedFrames = frames;
  if (maxFrames && frames.length > maxFrames) {
    // Evenly sample frames to stay within limit
    const step = frames.length / maxFrames;
    processedFrames = [];
    for (let i = 0; i < maxFrames; i++) {
      const index = Math.floor(i * step);
      processedFrames.push(frames[index]);
    }
  }

  return {
    frames: processedFrames.map(frame => ({
      timestamp: frame.timestamp,
      base64: frame.dataUrl.replace(/^data:image\/\w+;base64,/, ''),
    })),
    totalDuration: frames.length > 0 ? frames[frames.length - 1].timestamp : 0,
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  extractVideoFrames,
  formatFramesForAPI,
  validateFrame,
  calculateOptimalInterval,
};
