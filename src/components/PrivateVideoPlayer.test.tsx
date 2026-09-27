import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrivateVideoPlayer } from "./PrivateVideoPlayer";

const source = {
  url: "https://video.test/old",
  expiresAt: Date.now() + 7200000,
};
describe("PrivateVideoPlayer", () => {
  it("renews an expired link on play and restores playback position", async () => {
    const renew = vi
      .fn()
      .mockResolvedValue({
        url: "https://video.test/new",
        expiresAt: Date.now() + 7200000,
      });
    const { container } = render(
      <PrivateVideoPlayer
        initialSource={{ ...source, expiresAt: 1 }}
        renew={renew}
      />,
    );
    const video = container.querySelector("video")!;
    video.currentTime = 42;
    fireEvent.timeUpdate(video);
    fireEvent.play(video);
    await waitFor(() =>
      expect(video.getAttribute("src")).toBe("https://video.test/new"),
    );
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(42);
    expect(video.play).toHaveBeenCalled();
    expect(renew).toHaveBeenCalledTimes(1);
  });
  it("bounds automatic retries and exposes a manual recovery action", async () => {
    const renew = vi
      .fn()
      .mockResolvedValue({
        url: "https://video.test/new",
        expiresAt: Date.now() + 7200000,
      });
    const { container } = render(
      <PrivateVideoPlayer initialSource={source} renew={renew} />,
    );
    const video = container.querySelector("video")!;
    fireEvent.error(video);
    await waitFor(() => expect(renew).toHaveBeenCalledTimes(1));
    await act(async () => {
      fireEvent.error(video);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("connexion");
    expect(renew).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(renew).toHaveBeenCalledTimes(2));
  });
  it("preserves a paused position when the query refreshes its URL", () => {
    const { container, rerender } = render(
      <PrivateVideoPlayer initialSource={source} renew={vi.fn()} />,
    );
    const video = container.querySelector("video")!;
    video.currentTime = 18;
    fireEvent.timeUpdate(video);
    rerender(
      <PrivateVideoPlayer
        initialSource={{
          url: "https://video.test/refreshed",
          expiresAt: source.expiresAt + 3600000,
        }}
        renew={vi.fn()}
      />,
    );
    fireEvent.loadedMetadata(video);
    expect(video.currentTime).toBe(18);
    expect(video.play).not.toHaveBeenCalled();
  });
  it("shows a recoverable error when signing is unavailable", async () => {
    const { container } = render(
      <PrivateVideoPlayer
        initialSource={source}
        renew={vi.fn().mockRejectedValue(Error("offline"))}
      />,
    );
    fireEvent.error(container.querySelector("video")!);
    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
