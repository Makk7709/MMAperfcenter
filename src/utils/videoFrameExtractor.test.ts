/**
 * TDD Tests for Video Frame Extractor
 * 
 * UNIT TESTS: Pure logic functions (no DOM)
 * INTEGRATION TESTS: DOM-dependent (marked with .skip for jsdom, run in real browser)
 */

import { describe, it, expect } from 'vitest';
import { setMockVideoConfig } from '../test/setup';
import {
  extractVideoFrames,
  formatFramesForAPI,
  validateFrame,
  calculateOptimalInterval,
  type ExtractedFrame,
} from './videoFrameExtractor';

// ============================================
// TEST UTILITIES
// ============================================

function createMockVideoFile(options: {
  name?: string;
  type?: string;
  size?: number;
} = {}): File {
  const { 
    name = 'test-video.mp4', 
    type = 'video/mp4',
    size = 1024 * 1024
  } = options;
  
  const content = new ArrayBuffer(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

function createMockImageData(brightness: number, width = 10, height = 10): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = brightness;
    data[i + 1] = brightness;
    data[i + 2] = brightness;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' };
}

function createVariedImageData(width = 10, height = 10): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const brightness = 50 + (i / 4) * 10;
    data[i] = brightness;
    data[i + 1] = brightness;
    data[i + 2] = brightness;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' };
}

// ============================================
// UNIT TESTS: FRAME VALIDATION (Pure Logic)
// ============================================

describe('validateFrame', () => {
  describe('Brightness Detection', () => {
    it('should reject frames that are too dark (black frames)', () => {
      const darkImageData = createMockImageData(5);
      const result = validateFrame(darkImageData);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toMatch(/too dark/i);
      expect(result.brightness).toBeLessThan(15);
    });

    it('should reject frames that are too bright (overexposed)', () => {
      const brightImageData = createMockImageData(250);
      const result = validateFrame(brightImageData);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toMatch(/too bright|overexposed/i);
      expect(result.brightness).toBeGreaterThan(240);
    });

    it('should accept frames with normal brightness (100-180)', () => {
      // Need varied data for contrast check
      const variedData = createVariedImageData();
      const result = validateFrame(variedData);
      
      expect(result.isValid).toBe(true);
      expect(result.brightness).toBeGreaterThan(15);
      expect(result.brightness).toBeLessThan(240);
    });

    it('should correctly calculate average brightness', () => {
      const testData = createMockImageData(100);
      const result = validateFrame(testData, { minContrast: 0 }); // Disable contrast check
      
      expect(result.brightness).toBeCloseTo(100, 0);
    });
  });

  describe('Contrast Detection', () => {
    it('should reject frames with very low contrast (solid color)', () => {
      const solidColor = createMockImageData(128); // All pixels same
      const result = validateFrame(solidColor, { minContrast: 10 });
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toMatch(/low contrast/i);
      expect(result.contrast).toBeLessThan(10);
    });

    it('should accept frames with sufficient contrast', () => {
      const highContrast = createVariedImageData();
      const result = validateFrame(highContrast, { minContrast: 5 });
      
      expect(result.isValid).toBe(true);
      expect(result.contrast).toBeGreaterThan(5);
    });

    it('should allow custom contrast threshold', () => {
      const mediumContrast = createVariedImageData();
      
      // With low threshold, should pass
      const result1 = validateFrame(mediumContrast, { minContrast: 1 });
      expect(result1.isValid).toBe(true);
      
      // With very high threshold, might fail
      const result2 = validateFrame(mediumContrast, { minContrast: 100 });
      expect(result2.contrast).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty image data gracefully', () => {
      const emptyData: ImageData = {
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
        colorSpace: 'srgb'
      };
      const result = validateFrame(emptyData);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toMatch(/empty|invalid/i);
    });

    it('should handle single pixel image', () => {
      const singlePixel: ImageData = {
        data: new Uint8ClampedArray([128, 128, 128, 255]),
        width: 1,
        height: 1,
        colorSpace: 'srgb'
      };
      const result = validateFrame(singlePixel, { minContrast: 0 });
      
      expect(result.brightness).toBe(128);
    });

    it('should handle custom brightness thresholds', () => {
      const dimFrame = createMockImageData(20);
      
      // Default threshold (15) - should pass
      const result1 = validateFrame(dimFrame, { minBrightness: 10, minContrast: 0 });
      expect(result1.isValid).toBe(true);
      
      // Higher threshold - should fail
      const result2 = validateFrame(dimFrame, { minBrightness: 30, minContrast: 0 });
      expect(result2.isValid).toBe(false);
    });
  });
});

// ============================================
// UNIT TESTS: INTERVAL CALCULATION (Pure Logic)
// ============================================

describe('calculateOptimalInterval', () => {
  it('should return requested interval when within limits', () => {
    const result = calculateOptimalInterval({
      videoDuration: 20,
      requestedInterval: 2,
      maxFrames: 15,
    });
    
    // 20s / 2s = 10 frames, which is < 15 max
    expect(result).toBe(2);
  });

  it('should increase interval for long videos', () => {
    const result = calculateOptimalInterval({
      videoDuration: 60,
      requestedInterval: 2,
      maxFrames: 10,
    });
    
    // Need 60s / 10 frames = 6s interval
    expect(result).toBe(6);
  });

  it('should respect minimum interval of 0.5 seconds', () => {
    const result = calculateOptimalInterval({
      videoDuration: 5,
      requestedInterval: 0.1,
      maxFrames: 100,
    });
    
    expect(result).toBeGreaterThanOrEqual(0.5);
  });

  it('should handle edge case: duration equals interval', () => {
    const result = calculateOptimalInterval({
      videoDuration: 2,
      requestedInterval: 2,
      maxFrames: 10,
    });
    
    expect(result).toBe(2);
  });

  it('should handle edge case: very short video', () => {
    const result = calculateOptimalInterval({
      videoDuration: 1,
      requestedInterval: 2,
      maxFrames: 5,
    });
    
    expect(result).toBeGreaterThanOrEqual(0.5);
  });

  it('should handle edge case: many frames needed', () => {
    const result = calculateOptimalInterval({
      videoDuration: 300,
      requestedInterval: 1,
      maxFrames: 20,
    });
    
    // 300s / 20 frames = 15s interval
    expect(result).toBe(15);
  });
});

// ============================================
// UNIT TESTS: API FORMATTING (Pure Logic)
// ============================================

describe('formatFramesForAPI', () => {
  const mockFrames: ExtractedFrame[] = [
    { timestamp: 0, dataUrl: 'data:image/jpeg;base64,abc123' },
    { timestamp: 2, dataUrl: 'data:image/jpeg;base64,def456' },
    { timestamp: 4, dataUrl: 'data:image/jpeg;base64,ghi789' },
  ];

  describe('Base64 Extraction', () => {
    it('should strip data URL prefix from JPEG', () => {
      const result = formatFramesForAPI(mockFrames);
      
      expect(result.frames[0].base64).toBe('abc123');
      expect(result.frames[1].base64).toBe('def456');
      expect(result.frames[2].base64).toBe('ghi789');
    });

    it('should strip data URL prefix from WebP', () => {
      const webpFrames: ExtractedFrame[] = [
        { timestamp: 0, dataUrl: 'data:image/webp;base64,RIFF123' },
      ];
      const result = formatFramesForAPI(webpFrames);
      
      expect(result.frames[0].base64).toBe('RIFF123');
    });

    it('should strip data URL prefix from PNG', () => {
      const pngFrames: ExtractedFrame[] = [
        { timestamp: 0, dataUrl: 'data:image/png;base64,iVBOR...' },
      ];
      const result = formatFramesForAPI(pngFrames);
      
      expect(result.frames[0].base64).toBe('iVBOR...');
    });
  });

  describe('Timestamp Preservation', () => {
    it('should preserve all timestamps', () => {
      const result = formatFramesForAPI(mockFrames);
      
      expect(result.frames[0].timestamp).toBe(0);
      expect(result.frames[1].timestamp).toBe(2);
      expect(result.frames[2].timestamp).toBe(4);
    });

    it('should handle non-integer timestamps', () => {
      const frames: ExtractedFrame[] = [
        { timestamp: 0.5, dataUrl: 'data:image/jpeg;base64,a' },
        { timestamp: 2.7, dataUrl: 'data:image/jpeg;base64,b' },
      ];
      const result = formatFramesForAPI(frames);
      
      expect(result.frames[0].timestamp).toBe(0.5);
      expect(result.frames[1].timestamp).toBe(2.7);
    });
  });

  describe('Duration Calculation', () => {
    it('should calculate total duration from last frame', () => {
      const result = formatFramesForAPI(mockFrames);
      
      expect(result.totalDuration).toBe(4);
    });

    it('should return 0 duration for empty array', () => {
      const result = formatFramesForAPI([]);
      
      expect(result.totalDuration).toBe(0);
    });

    it('should handle single frame', () => {
      const singleFrame: ExtractedFrame[] = [
        { timestamp: 5, dataUrl: 'data:image/jpeg;base64,x' },
      ];
      const result = formatFramesForAPI(singleFrame);
      
      expect(result.totalDuration).toBe(5);
    });
  });

  describe('Frame Limiting', () => {
    it('should limit frames when maxFrames specified', () => {
      const manyFrames = Array.from({ length: 30 }, (_, i) => ({
        timestamp: i * 2,
        dataUrl: `data:image/jpeg;base64,frame${i}`,
      }));
      
      const result = formatFramesForAPI(manyFrames, { maxFrames: 15 });
      
      expect(result.frames.length).toBe(15);
    });

    it('should evenly sample frames when limiting', () => {
      const frames = Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        dataUrl: `data:image/jpeg;base64,f${i}`,
      }));
      
      const result = formatFramesForAPI(frames, { maxFrames: 5 });
      
      // Should pick frames at indices 0, 2, 4, 6, 8
      expect(result.frames.length).toBe(5);
      expect(result.frames[0].timestamp).toBe(0);
    });

    it('should not limit if maxFrames > frame count', () => {
      const result = formatFramesForAPI(mockFrames, { maxFrames: 100 });
      
      expect(result.frames.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty frame array', () => {
      const result = formatFramesForAPI([]);
      
      expect(result.frames).toHaveLength(0);
      expect(result.totalDuration).toBe(0);
    });

    it('should handle frames without options', () => {
      const result = formatFramesForAPI(mockFrames);
      
      expect(result.frames.length).toBe(3);
    });
  });
});

// ============================================
// UNIT TESTS: INPUT VALIDATION (Sync)
// ============================================

describe('extractVideoFrames - Input Validation', () => {
  it('should reject invalid video format immediately', async () => {
    const invalidFile = createMockVideoFile({ type: 'text/plain' });
    
    await expect(extractVideoFrames(invalidFile)).rejects.toThrow(/Invalid video format/);
  });

  it('should reject application/pdf', async () => {
    const pdfFile = createMockVideoFile({ type: 'application/pdf' });
    
    await expect(extractVideoFrames(pdfFile)).rejects.toThrow(/Invalid video format/);
  });

  it('should accept video/mp4', async () => {
    const mp4File = createMockVideoFile({ type: 'video/mp4' });
    setMockVideoConfig({ duration: 10 });
    
    // This will timeout but won't throw format error
    const promise = extractVideoFrames(mp4File, { timeoutMs: 100 });
    await expect(promise).rejects.not.toThrow(/Invalid video format/);
  });

  it('should accept video/webm', async () => {
    const webmFile = createMockVideoFile({ type: 'video/webm' });
    setMockVideoConfig({ duration: 10 });
    
    const promise = extractVideoFrames(webmFile, { timeoutMs: 100 });
    await expect(promise).rejects.not.toThrow(/Invalid video format/);
  });

  it('should accept video/quicktime (MOV)', async () => {
    const movFile = createMockVideoFile({ type: 'video/quicktime' });
    setMockVideoConfig({ duration: 10 });
    
    const promise = extractVideoFrames(movFile, { timeoutMs: 100 });
    await expect(promise).rejects.not.toThrow(/Invalid video format/);
  });
});

// ============================================
// DOM INTEGRATION TESTS (Skip in jsdom)
// These would run in a real browser (Playwright/Cypress)
// ============================================

describe.skip('extractVideoFrames - DOM Integration (requires real browser)', () => {
  it('should extract frames from a real video file', async () => {
    // This test would use a real video file and browser APIs
  });

  it('should handle video load errors', async () => {
    // This test would simulate video load failure
  });

  it('should timeout after specified duration', async () => {
    // This test would verify timeout behavior
  });

  it('should cleanup resources after extraction', async () => {
    // This test would verify URL.revokeObjectURL is called
  });
});
