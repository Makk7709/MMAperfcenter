import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { IntroSplash } from "./IntroSplash";
beforeEach(() => {
  vi.useFakeTimers();
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});
afterEach(() => vi.useRealTimers());
it("opens a modal and makes skipping immediately available", () => {
  const done = vi.fn();
  render(<IntroSplash onDone={done} />);
  expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  const skip = screen.getByRole("button", { name: "Passer" });
  expect(skip).toBeEnabled();
  expect(skip.tabIndex).toBe(0);
  fireEvent.click(skip);
  act(() => vi.advanceTimersByTime(700));
  expect(done).toHaveBeenCalledTimes(1);
});
it("finishes after Escape and restores the previous focus on unmount", () => {
  const previous = document.createElement("button");
  document.body.append(previous);
  previous.focus();
  const done = vi.fn();
  const { unmount } = render(<IntroSplash onDone={done} />);
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { bubbles: true, cancelable: true }),
  );
  act(() => vi.advanceTimersByTime(700));
  expect(done).toHaveBeenCalledOnce();
  unmount();
  expect(previous).toHaveFocus();
  previous.remove();
});
it("does not leave visitors stuck when playback never starts", () => {
  const done = vi.fn();
  render(<IntroSplash onDone={done} />);
  act(() => vi.advanceTimersByTime(4000));
  act(() => vi.advanceTimersByTime(700));
  expect(done).toHaveBeenCalledOnce();
});
