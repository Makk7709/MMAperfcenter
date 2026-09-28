import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import MovementInvite from "./MovementInvite";
import { pendingInvitePath } from "@/lib/movement/pendingInvite";

const state = vi.hoisted(() => ({ user: null as { id: string } | null, accepted: [] as string[] }));
const TOKEN = "a".repeat(64);

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock("@/lib/movement/contribution", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/movement/contribution")>()),
  getMovementInvite: async () => ({
    status: "pending",
    contributor_name: "Bruno",
    discipline: "Boxe anglaise",
    created_at: "2026-09-28T10:00:00Z",
    expires_at: "2026-10-12T10:00:00Z",
  }),
  acceptMovementInvite: async (token: string) => {
    state.accepted.push(token);
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/contribution/${TOKEN}`]}>
      <Routes>
        <Route path="/contribution/:token" element={<MovementInvite />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  state.user = null;
  state.accepted = [];
});

it("remembers the invitation of a signed-out partner", () => {
  renderPage();
  expect(screen.getByRole("button", { name: /Se connecter ou créer un compte/ })).toBeVisible();
  expect(pendingInvitePath()).toBe(`/contribution/${TOKEN}`);
});

it("records consent only once the partner is adult and agrees", async () => {
  state.user = { id: "partner" };
  const u = userEvent.setup();
  renderPage();
  expect(await screen.findByText("Bruno")).toBeVisible();
  const accept = screen.getByRole("button", { name: "Accepter" });
  expect(accept).toBeDisabled();
  await u.click(screen.getByLabelText("Je suis majeur(e)."));
  await u.click(screen.getByLabelText(/J'accepte que KOREV AI/));
  await u.click(accept);
  expect(await screen.findByText(/ton accord est enregistré/)).toBeVisible();
  expect(state.accepted).toEqual([TOKEN]);
});
