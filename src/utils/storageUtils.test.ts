import { beforeEach, expect, it, vi } from "vitest";
import {
  convertToSignedUrl,
  extractFilePathFromUrl,
  getSignedUrl,
} from "./storageUtils";
const sign = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: sign }) } },
}));
beforeEach(() =>
  sign.mockResolvedValue({
    data: { signedUrl: "https://signed.test/video" },
    error: null,
  }),
);
it("decodes a public storage path and signs it with the requested lifetime", async () => {
  const url =
    "https://project.supabase.co/storage/v1/object/public/training-videos/user/round%20one.mp4";
  expect(extractFilePathFromUrl(url, "training-videos")).toBe(
    "user/round one.mp4",
  );
  expect(await convertToSignedUrl(url, "training-videos", 7200)).toBe(
    "https://signed.test/video",
  );
  expect(sign).toHaveBeenCalledWith("user/round one.mp4", 7200);
});
it("leaves non-storage and empty URLs unchanged", async () => {
  expect(await convertToSignedUrl("", "training-videos")).toBe("");
  expect(
    await convertToSignedUrl(
      "https://youtube.com/watch?v=test",
      "training-videos",
    ),
  ).toContain("youtube");
  expect(extractFilePathFromUrl("", "training-videos")).toBeNull();
  expect(sign).not.toHaveBeenCalled();
});
it("handles invalid encoding, signing errors and unavailable storage", async () => {
  expect(
    extractFilePathFromUrl(
      "https://project/storage/v1/object/public/training-videos/%zz",
      "training-videos",
    ),
  ).toBeNull();
  sign.mockResolvedValueOnce({ data: null, error: Error("denied") });
  expect(await getSignedUrl("training-videos", "user/round.mp4")).toBeNull();
  sign.mockRejectedValueOnce(Error("offline"));
  expect(await getSignedUrl("training-videos", "user/round.mp4")).toBeNull();
  const url =
    "https://project/storage/v1/object/public/training-videos/round.mp4";
  sign.mockResolvedValueOnce({ data: null, error: Error("denied") });
  expect(await convertToSignedUrl(url, "training-videos")).toBe(url);
});
