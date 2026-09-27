import { describe, expect, it, vi } from "vitest";
import {
  extractMotionSheets,
  coveragePercent,
  formatTimecode,
  planSheetStarts,
  sheetGeometry,
} from "./motionSheetExtractor";

describe("planSheetStarts", () => {
  it("spreads sheets over the whole video without passing its end", () => {
    const starts = planSheetStarts(300, 48, 0.75);
    expect(starts).toHaveLength(48);
    expect(starts[0]).toBe(0);
    expect(starts[starts.length - 1] + 0.75).toBeLessThanOrEqual(300);
    const gaps = starts.slice(1).map((s, i) => s - starts[i]);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.05);
  });

  it("uses fewer sheets on short clips", () => {
    expect(planSheetStarts(9, 48, 0.75)).toHaveLength(6);
  });

  it("returns nothing for an invalid duration", () => {
    expect(planSheetStarts(Number.NaN, 48, 0.75)).toEqual([]);
    expect(planSheetStarts(0, 48, 0.75)).toEqual([]);
  });
});

describe("sheetGeometry", () => {
  it("keeps a landscape sheet within the max side", () => {
    expect(sheetGeometry(1920, 1080, 1280)).toEqual({
      cellWidth: 640,
      cellHeight: 360,
      width: 1280,
      height: 720,
    });
  });

  it("keeps a portrait sheet within the max side", () => {
    const g = sheetGeometry(1080, 1920, 1280);
    expect(g.height).toBeLessThanOrEqual(1280);
    expect(g.cellWidth / g.cellHeight).toBeCloseTo(1080 / 1920, 2);
  });

  it("never upscales a small video", () => {
    expect(sheetGeometry(320, 240, 1280)).toEqual({
      cellWidth: 320,
      cellHeight: 240,
      width: 640,
      height: 480,
    });
  });
});

describe("formatTimecode", () => {
  it("formats minutes, seconds and tenths", () => {
    expect(formatTimecode(0)).toBe("0:00.0");
    expect(formatTimecode(83.46)).toBe("1:23.5");
    expect(formatTimecode(-3)).toBe("0:00.0");
  });
});

describe("coveragePercent", () => {
  it("reports the observed share of the video", () => {
    expect(coveragePercent(48, 0.25, 240)).toBe(20);
    expect(coveragePercent(10, 0.25, 5)).toBe(100);
    expect(coveragePercent(10, 0.25, 0)).toBe(0);
  });
});

describe("browser extraction pipeline", () => {
  it("extracts timecoded sheets and always releases the local video", async () => {
    URL.createObjectURL = vi.fn(() => "blob:sheet-test");
    URL.revokeObjectURL = vi.fn();
    const progress = vi.fn();
    const preview = vi.fn();
    const result = await extractMotionSheets(new File(["video"], "round.mp4"), {
      maxSheets: 2,
      maxSide: 64,
      onProgress: progress,
      onPreview: preview,
    });
    expect(result.sheets).toHaveLength(2);
    expect(result.sheets[0].timestamps).toHaveLength(4);
    expect(result.sheets[1].timestamps[3]).toBeLessThanOrEqual(result.duration);
    expect(result.sheets[0].base64).not.toContain("data:");
    expect(preview).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenLastCalledWith(2, 2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:sheet-test");
  });
  it("rejects clips below the minimum duration and cleans up", async () => {
    URL.createObjectURL = vi.fn(() => "blob:short");
    URL.revokeObjectURL = vi.fn();
    await expect(
      extractMotionSheets(new File(["video"], "short.mp4"), {
        minDuration: 10000,
      }),
    ).rejects.toThrow("courte");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:short");
  });
  it("stops on the extraction budget without inventing frames", async () => {
    URL.createObjectURL = vi.fn(() => "blob:budget");
    URL.revokeObjectURL = vi.fn();
    const result = await extractMotionSheets(new File(["video"], "round.mp4"), {
      timeoutMs: -1,
    });
    expect(result.sheets).toHaveLength(0);
    expect(result.previewDataUrl).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:budget");
  });
});
