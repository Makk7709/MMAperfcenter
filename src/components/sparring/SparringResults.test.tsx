import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi, beforeEach } from "vitest";
import { SparringResults } from "./SparringResults";
import { sparringFixture as analysis } from "@/test/sparringFixture";
const backend = vi.hoisted(() => ({ rows: [] as unknown[] }));
const user = { id: "test" };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        limit: async () => ({ data: backend.rows, error: null }),
      };
      return q;
    },
  },
}));
const props = {
  analysis,
  videoUrl: "blob:test",
  videoName: "Round test",
  analysisDate: "2026-09-27",
  onNewAnalysis: vi.fn(),
};
beforeEach(() => {
  backend.rows = [];
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
it("shows analysis, reliability and seeks to a key moment", () => {
  const { container } = render(<SparringResults {...props} />);
  expect(screen.getByText(analysis.summary)).toBeVisible();
  expect(screen.getByText("Angle partiellement masqué")).toBeVisible();
  const moment = screen
    .getAllByRole("button")
    .find((b) => b.textContent?.includes("Jab au visage"))!;
  fireEvent.click(moment);
  expect(container.querySelector("video")!.currentTime).toBe(20);
  expect(container.querySelector("video")!.play).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /nouvelle analyse/i }));
  expect(props.onNewAnalysis).toHaveBeenCalled();
});
it("lets the athlete inspect statistics, techniques, advice and rounds", async () => {
  const u = userEvent.setup();
  render(<SparringResults {...props} />);
  for (const [tab, text] of [
    ["Statistiques", "Coups"],
    ["Techniques", "Bras relâché"],
    ["Conseils", "Remonter la garde"],
    ["Rounds", "Jab décisif"],
  ]) {
    await u.click(screen.getByRole("tab", { name: tab }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent(text);
  }
  await u.click(screen.getByRole("tab", { name: "Progression" }));
  expect(
    await screen.findByText(/Pas encore d'analyses complétées/),
  ).toBeVisible();
});
it("compares previous sessions for both corners", async () => {
  backend.rows = [
    {
      id: "new",
      video_name: "Nouveau round",
      created_at: "2026-09-27",
      analysis,
    },
    {
      id: "old",
      video_name: "Ancien round",
      created_at: "2026-09-26",
      analysis: {
        ...analysis,
        performance_scores: {
          fighter_1: { ...analysis.performance_scores.fighter_1, overall: 60 },
          fighter_2: analysis.performance_scores.fighter_2,
        },
      },
    },
  ];
  const u = userEvent.setup();
  render(<SparringResults {...props} />);
  await u.click(screen.getByRole("tab", { name: "Progression" }));
  await waitFor(() =>
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Nouveau round"),
  );
  await u.click(screen.getAllByRole("combobox")[0]);
  await u.click(screen.getByRole("option", { name: /combattant 2/i }));
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Combattant 2");
});
it("renders legacy analyses with missing optional information", async () => {
  const u = userEvent.setup();
  render(
    <SparringResults
      {...props}
      videoUrl={null}
      analysis={{
        ...analysis,
        analysis_quality: undefined,
        sampling: undefined,
        rounds: [],
        techniques_observed: [],
        key_moments: [],
        athlete_identified: false,
        applicable_metrics: undefined,
      }}
    />,
  );
  expect(screen.queryByRole("tab", { name: "Rounds" })).not.toBeInTheDocument();
  await u.click(screen.getByRole("tab", { name: "Techniques" }));
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Jab précis");
});

it("offers the movement contribution only while the video is on the device", () => {
  const { rerender } = render(<SparringResults {...props} />);
  expect(screen.queryByRole("button", { name: /Faire progresser PRISM/ })).toBeNull();
  rerender(<SparringResults {...props} contribution={{ file: new File(["x"], "s.mp4"), analysisId: "an-1" }} />);
  expect(screen.getByRole("button", { name: /Faire progresser PRISM/ })).toBeVisible();
});
