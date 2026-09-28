import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { sparringFixture as analysis } from "@/test/sparringFixture";
import { MovementContributionDialog } from "./MovementContributionDialog";

const calls = vi.hoisted(() => ({ capture: 0, contribute: [] as unknown[], preview: "data:image/jpeg;base64,x" as string | null, failSend: false }));
const toasts = vi.hoisted(() => [] as string[]);
vi.mock("sonner", () => ({ toast: { error: (m: string) => toasts.push(m), success: vi.fn() } }));
const tracks = vi.hoisted(() => [[{ id: "a" }], [{ id: "b" }]]);

vi.mock("@/lib/movement/captureMovement", () => ({
  MAX_MOVEMENT_SECONDS: 180,
  TRACK_COLORS: ["blue", "red"],
  TRACK_NAMES: ["A", "B"],
  captureMovement: async () => {
    calls.capture++;
    return { fps: 10, frameCount: 1, tracks, coverage: [0.9, 0.8], preview: calls.preview, truncated: true };
  },
}));
vi.mock("@/lib/movement/contribution", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/movement/contribution")>()),
  contributeMovement: async (input: unknown) => {
    if (calls.failSend) throw new Error("Limite atteinte");
    calls.contribute.push(input);
    return { id: "c1", inviteToken: "f".repeat(64) };
  },
}));

const renderDialog = () =>
  render(
    <MemoryRouter>
      <MovementContributionDialog open onOpenChange={vi.fn()} file={new File(["x"], "s.mp4")} analysisId="an-1" analysis={analysis} />
    </MemoryRouter>,
  );

beforeEach(() => {
  calls.capture = 0;
  calls.contribute = [];
  calls.preview = "data:image/jpeg;base64,x";
  calls.failSend = false;
  toasts.length = 0;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

it("extracts nothing before both attestations are ticked", async () => {
  const u = userEvent.setup();
  renderDialog();
  const start = screen.getByRole("button", { name: "Extraire le mouvement" });
  expect(start).toBeDisabled();
  await u.click(screen.getByLabelText(/Je suis majeur/));
  expect(start).toBeDisabled();
  await u.click(screen.getByLabelText(/J'accepte que KOREV AI/));
  expect(start).toBeEnabled();
  expect(calls.capture).toBe(0);
});

it("sends the chosen skeleton, the partner's for consent, and the corrections", async () => {
  const u = userEvent.setup();
  renderDialog();
  await u.click(screen.getByLabelText(/Je suis majeur/));
  await u.click(screen.getByLabelText(/J'accepte que KOREV AI/));
  await u.click(screen.getByRole("button", { name: "Extraire le mouvement" }));

  const next = await screen.findByRole("button", { name: "Continuer" });
  expect(next).toBeDisabled();
  await u.click(screen.getByRole("radio", { name: /B/ }));
  await u.click(screen.getByRole("radio", { name: /Coin bleu/ }));
  await u.click(next);

  await u.click(screen.getAllByRole("button", { name: new RegExp(": Faux$") })[0]);
  await u.click(screen.getByRole("button", { name: "Envoyer ma contribution" }));

  await screen.findByText(/ta contribution est enregistrée/);
  expect(calls.contribute).toEqual([
    {
      analysisId: "an-1",
      contributorFighter: 2,
      fps: 10,
      contributorTrack: tracks[1],
      partnerTrack: tracks[0],
      verdicts: [{ kind: "moment", index: 0, verdict: "incorrect" }],
    },
  ]);
  expect(screen.getByLabelText("Lien d'invitation")).toHaveValue(`${window.location.origin}/contribution/${"f".repeat(64)}`);
});

it("keeps the partner's movement out when they are not invited", async () => {
  const u = userEvent.setup();
  renderDialog();
  await u.click(screen.getByRole("switch", { name: /Inviter mon partenaire/ }));
  expect(screen.getByText(/celui de ton partenaire n'est pas conservé/)).toBeVisible();
  await u.click(screen.getByLabelText(/Je suis majeur/));
  await u.click(screen.getByLabelText(/J'accepte que KOREV AI/));
  await u.click(screen.getByRole("button", { name: "Extraire le mouvement" }));
  await u.click(await screen.findByRole("radio", { name: /A/ }));
  await u.click(screen.getByRole("button", { name: "Continuer" }));
  await u.click(screen.getByRole("button", { name: "Envoyer ma contribution" }));
  await waitFor(() => expect(calls.contribute).toHaveLength(1));
  expect(calls.contribute[0]).toMatchObject({ contributorTrack: tracks[0], partnerTrack: null, verdicts: [] });
});

const reachIdentify = async (u: ReturnType<typeof userEvent.setup>) => {
  await u.click(screen.getByLabelText(/Je suis majeur/));
  await u.click(screen.getByLabelText(/J'accepte que KOREV AI/));
  await u.click(screen.getByRole("button", { name: "Extraire le mouvement" }));
};

it("goes back to the start when the two fighters cannot be told apart", async () => {
  calls.preview = null;
  const u = userEvent.setup();
  renderDialog();
  await reachIdentify(u);
  expect(await screen.findByRole("button", { name: "Extraire le mouvement" })).toBeVisible();
  expect(toasts).toEqual(["Impossible de distinguer deux combattants sur cette vidéo."]);
});

it("keeps the corrections when sending fails, and a second click clears a verdict", async () => {
  calls.failSend = true;
  const u = userEvent.setup();
  renderDialog();
  await reachIdentify(u);
  expect(await screen.findByText(/Seules les 3 premières minutes/)).toBeVisible();
  await u.click(screen.getByRole("radio", { name: /A/ }));
  await u.click(screen.getByRole("button", { name: "Continuer" }));
  const wrong = screen.getAllByRole("button", { name: new RegExp(": Faux$") })[0];
  await u.click(wrong);
  expect(wrong).toHaveAttribute("aria-pressed", "true");
  await u.click(wrong);
  expect(wrong).toHaveAttribute("aria-pressed", "false");
  await u.click(screen.getByRole("button", { name: "Envoyer ma contribution" }));
  expect(await screen.findByRole("button", { name: "Envoyer ma contribution" })).toBeEnabled();
  expect(toasts).toEqual(["Limite atteinte"]);
});
