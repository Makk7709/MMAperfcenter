/**
 * Video Frame Extractor
 * Extracts frames from a video file at regular intervals for AI analysis
 */

export interface ExtractedFrame {
  timestamp: number; // seconds
  dataUrl: string; // base64 image
}

export interface ExtractionOptions {
  frameInterval?: number; // seconds between frames (default: 2)
  maxFrames?: number; // maximum number of frames to extract (default: 30)
  quality?: number; // JPEG quality 0-1 (default: 0.8)
  maxWidth?: number; // max frame width (default: 1280)
}

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
    quality = 0.8,
    maxWidth = 1280
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const frames: ExtractedFrame[] = [];
    let currentTime = 0;

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
      canvas.remove();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      console.log(`Video duration: ${duration}s, extracting frames every ${frameInterval}s`);

      // Calculate actual interval based on max frames
      const totalPossibleFrames = Math.floor(duration / frameInterval);
      const actualInterval = totalPossibleFrames > maxFrames 
        ? duration / maxFrames 
        : frameInterval;

      // Set canvas size based on video dimensions
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      const captureFrame = () => {
        if (currentTime > duration || frames.length >= maxFrames) {
          cleanup();
          console.log(`Extracted ${frames.length} frames`);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        frames.push({
          timestamp: currentTime,
          dataUrl
        });

        // Move to next frame
        currentTime += actualInterval;
        captureFrame();
      };

      // Start extraction
      captureFrame();
    };

    video.onerror = (e) => {
      cleanup();
      reject(new Error(`Failed to load video: ${e}`));
    };

    // Timeout after 2 minutes
    setTimeout(() => {
      if (frames.length === 0) {
        cleanup();
        reject(new Error('Video frame extraction timed out'));
      }
    }, 120000);
  });
}

/**
 * Formats extracted frames for API consumption
 * Returns frames as array of base64 strings (without data URL prefix)
 */
export function formatFramesForAPI(frames: ExtractedFrame[]): {
  frames: Array<{ timestamp: number; base64: string }>;
  totalDuration: number;
} {
  return {
    frames: frames.map(f => ({
      timestamp: f.timestamp,
      base64: f.dataUrl.replace(/^data:image\/\w+;base64,/, '')
    })),
    totalDuration: frames.length > 0 ? frames[frames.length - 1].timestamp : 0
  };
}
