import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";

// Model and runtime are served by the app itself: opening the contribution
// flow must not contact a third-party CDN.
const MODEL_PATH = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`;

export async function loadPoseLandmarker(): Promise<PoseLandmarker> {
  const { PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(
      { wasmLoaderPath, wasmBinaryPath },
      {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate },
        runningMode: "VIDEO",
        // Two fighters, plus room for a referee the tracker will ignore.
        numPoses: 3,
        minPoseDetectionConfidence: 0.4,
        minPosePresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      },
    );
  try {
    return await create("GPU");
  } catch {
    return await create("CPU");
  }
}
