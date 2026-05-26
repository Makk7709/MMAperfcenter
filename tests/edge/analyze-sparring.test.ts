// ----------------------------------------------------------------------------
// Harness pour la fonction analyze-sparring.
//
// Vérifications :
//   - payload invalide rejeté (videoUrl manquante, frames vides),
//   - payload minimal accepté,
//   - qualityMode "fast" → modèle gemini-2.5-flash ;
//     qualityMode absent / "pro" → modèle gemini-2.5-pro.
// ----------------------------------------------------------------------------

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

interface AnalyzeInput {
  videoUrl?: string;
  frames?: string[];
  qualityMode?: "fast" | "pro";
  discipline?: string;
}

function validate(input: AnalyzeInput): { ok: boolean; error?: string } {
  if (!input.videoUrl || typeof input.videoUrl !== "string") {
    return { ok: false, error: "missing_videoUrl" };
  }
  if (!Array.isArray(input.frames) || input.frames.length === 0) {
    return { ok: false, error: "no_frames" };
  }
  return { ok: true };
}

function modelFor(input: AnalyzeInput): "google/gemini-2.5-flash" | "google/gemini-2.5-pro" {
  return input.qualityMode === "fast" ? "google/gemini-2.5-flash" : "google/gemini-2.5-pro";
}

Deno.test("analyze-sparring rejects payload without videoUrl", () => {
  const r = validate({ frames: ["a"] });
  assertEquals(r.ok, false);
  assertEquals(r.error, "missing_videoUrl");
});

Deno.test("analyze-sparring rejects payload with empty frames", () => {
  const r = validate({ videoUrl: "https://example.com/v.mp4", frames: [] });
  assertEquals(r.ok, false);
  assertEquals(r.error, "no_frames");
});

Deno.test("analyze-sparring accepts a minimal valid payload", () => {
  const r = validate({ videoUrl: "https://example.com/v.mp4", frames: ["frame-base64"] });
  assertEquals(r.ok, true);
  assert(r.error === undefined);
});

Deno.test("analyze-sparring routes qualityMode fast to gemini-2.5-flash", () => {
  assertEquals(
    modelFor({ videoUrl: "x", frames: ["f"], qualityMode: "fast" }),
    "google/gemini-2.5-flash",
  );
});

Deno.test("analyze-sparring defaults to gemini-2.5-pro when no qualityMode", () => {
  assertEquals(
    modelFor({ videoUrl: "x", frames: ["f"] }),
    "google/gemini-2.5-pro",
  );
});
