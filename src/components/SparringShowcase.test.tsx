import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SparringShowcase } from "./SparringShowcase";

vi.mock("@/components/sparring", () => ({ SparringDialog: () => null }));

let reduced = false;
let onMotionChange: () => void;
let onIntersection: IntersectionObserverCallback;
const disconnect = vi.fn();

function setVisible(visible: boolean) {
  act(() => onIntersection([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver));
}

beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: (_event: string, listener: () => void) => { onMotionChange = listener; },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { onIntersection = callback; }
    observe = vi.fn();
    disconnect = disconnect;
  });
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Sparring preview motion", () => {
  it("keeps a real percentage visible and only cycles while on screen", () => {
    render(<SparringShowcase />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "68");
    act(() => vi.advanceTimersByTime(6000));
    expect(bar).toHaveAttribute("aria-label", "Précision coups de poing");
    setVisible(true);
    act(() => vi.advanceTimersByTime(3000));
    expect(bar).toHaveAttribute("aria-valuenow", "67");
    expect(bar).toHaveAttribute("aria-label", "Précision coups de pied");
    setVisible(false);
    act(() => vi.advanceTimersByTime(6000));
    expect(bar).toHaveAttribute("aria-label", "Précision coups de pied");
  });

  it("stops updates when the visitor enables reduced motion", () => {
    render(<SparringShowcase />);
    setVisible(true);
    act(() => { reduced = true; onMotionChange(); });
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "68");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pauses in a hidden tab and cleans up timers on unmount", () => {
    const { unmount } = render(<SparringShowcase />);
    setVisible(true);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "68");
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "67");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(disconnect).toHaveBeenCalled();
  });
});
