import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { sparringFixture } from "@/test/sparringFixture";
import { SparringAnalysisV2 } from "./SparringAnalysisV2";
import { SparringDialog } from "./SparringDialog";
const state = vi.hoisted(() => ({
  user: { id: "test" } as { id: string } | null,
  rows: [] as unknown[],
  gate: vi.fn(),
  extract: vi.fn(),
  invoke: vi.fn(),
  update: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user, loading: false }),
}));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile: { martial_arts_discipline: "mma" } }),
  disciplineLabel: () => "MMA",
}));
vi.mock("@/hooks/useFeatureGate", () => ({
  useFeatureGate: () => ({
    gate: state.gate,
    paywallOpen: false,
    setPaywallOpen: vi.fn(),
  }),
}));
vi.mock("@/components/FeaturePaywall", () => ({ FeaturePaywall: () => null }));
vi.mock("@/utils/motionSheetExtractor", () => ({
  extractMotionSheets: state.extract,
}));
vi.mock("sonner", () => ({
  toast: { error: state.error, success: state.success },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: state.invoke },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        order: () => q,
        limit: async () => ({ data: state.rows, error: null }),
        insert: () => q,
        update: (data: unknown) => {
          state.update(data);
          return q;
        },
        single: async () => ({ data: { id: "analysis-test" }, error: null }),
      };
      return q;
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: { signedUrl: "https://video.test/history" },
          error: null,
        }),
      }),
    },
  },
}));
beforeEach(() => {
  state.user = { id: "test" };
  state.rows = [];
  state.gate.mockResolvedValue(true);
  state.extract.mockResolvedValue({
    sheets: [0, 1, 2].map((n) => ({ base64: "YQ==", timestamps: [n] })),
    duration: 30,
    burstSpacing: 0.25,
  });
  state.invoke.mockResolvedValue({
    data: { success: true, analysis: sparringFixture },
    error: null,
  });
  URL.createObjectURL = vi.fn(() => "blob:round");
  URL.revokeObjectURL = vi.fn();
});
const upload = (
  container: HTMLElement,
  file = new File(["video"], "round.mp4", { type: "video/mp4" }),
) =>
  fireEvent.change(container.querySelector("input[type=file]")!, {
    target: { files: [file] },
  });
it("runs the upload and analysis flow and lets the athlete start again", async () => {
  const { container } = render(<SparringAnalysisV2 />);
  upload(container);
  expect(await screen.findByText(sparringFixture.summary)).toBeVisible();
  expect(state.invoke).toHaveBeenCalledTimes(1);
  expect(state.invoke).toHaveBeenCalledWith(
    "analyze-sparring",
    expect.objectContaining({
      body: expect.objectContaining({
        analysisId: "analysis-test",
        layout: "sheet_2x2",
      }),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: /nouvelle analyse/i }));
  expect(
    screen.getByRole("button", { name: "Importer une vidéo de sparring" }),
  ).toBeVisible();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:round");
});
it("does not extract an invalid file or spend quota", () => {
  const { container } = render(<SparringAnalysisV2 />);
  upload(container, new File(["text"], "bad.txt", { type: "text/plain" }));
  expect(state.error).toHaveBeenCalledWith(expect.stringContaining("Format"));
  expect(state.gate).not.toHaveBeenCalled();
  expect(state.extract).not.toHaveBeenCalled();
});
it("stops before extraction when the quota gate refuses access", async () => {
  state.gate.mockResolvedValue(false);
  const { container } = render(<SparringAnalysisV2 />);
  upload(container);
  await waitFor(() => expect(state.gate).toHaveBeenCalled());
  expect(state.extract).not.toHaveBeenCalled();
});
it("recovers the upload controls after extraction failure", async () => {
  state.extract.mockResolvedValue({ sheets: [], duration: 30 });
  const { container } = render(<SparringAnalysisV2 />);
  upload(container);
  await waitFor(() =>
    expect(state.error).toHaveBeenCalledWith(expect.stringContaining("sombre")),
  );
  expect(
    screen.getByRole("button", { name: "Importer une vidéo de sparring" }),
  ).toBeVisible();
  expect(state.invoke).not.toHaveBeenCalled();
});
it("marks a rejected analysis as failed without retrying the AI request", async () => {
  state.invoke.mockResolvedValue({
    data: { success: false, error: "Quota atteint" },
    error: null,
  });
  const { container } = render(<SparringAnalysisV2 />);
  upload(container);
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({ status: "error" }),
  );
  expect(state.invoke).toHaveBeenCalledTimes(1);
  expect(state.error).toHaveBeenCalledWith("Quota atteint");
});
it("requires authentication even when the dialog is opened directly", () => {
  state.user = null;
  render(<SparringDialog open onOpenChange={vi.fn()} />);
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByText(/Connectez-vous pour utiliser/)).toBeVisible();
});
it("loads a completed analysis from history", async () => {
  state.rows = [
    {
      id: "history",
      video_name: "Archive du round",
      video_url: "",
      created_at: "2026-09-26",
      status: "completed",
      analysis: sparringFixture,
    },
  ];
  render(<SparringAnalysisV2 />);
  const history = await screen.findByRole("button", { name: /historique/i });
  fireEvent.click(history);
  fireEvent.click(
    await screen.findByRole("button", { name: /Archive du round/i }),
  );
  expect(await screen.findByText(sparringFixture.summary)).toBeVisible();
  expect(state.invoke).not.toHaveBeenCalled();
});
