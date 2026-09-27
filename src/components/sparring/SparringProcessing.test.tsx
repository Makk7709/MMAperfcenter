import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SparringProcessing } from "./SparringProcessing";
afterEach(() => vi.useRealTimers());
it("reports actual extraction progress and never reports analysis complete early", () => {
  vi.useFakeTimers();
  const props = {
    extractDone: 2,
    extractTotal: 4,
    previewUrl: null,
    analyzeStartedAt: null,
  };
  const { rerender } = render(
    <SparringProcessing {...props} stage="extract" />,
  );
  expect(screen.getByText("2 / 4 planches")).toBeVisible();
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "50",
  );
  rerender(<SparringProcessing {...props} stage="send" />);
  expect(screen.getByText("Transmission des planches")).toBeVisible();
  rerender(
    <SparringProcessing
      {...props}
      stage="analyze"
      previewUrl="data:image/jpeg;base64,YQ=="
      analyzeStartedAt={Date.now()}
    />,
  );
  act(() => vi.advanceTimersByTime(180000));
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "95",
  );
  expect(screen.getByText(/180 s/)).toBeVisible();
});
