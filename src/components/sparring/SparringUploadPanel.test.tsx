import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SparringUploadPanel } from "./SparringUploadPanel";
const props = () => ({
  discipline: "auto",
  athlete: "",
  onAthleteChange: vi.fn(),
  onDisciplineChange: vi.fn(),
  onFile: vi.fn(),
});
it("accepts files by selection, keyboard and drop and edits the athlete description", () => {
  const p = props();
  const { container } = render(<SparringUploadPanel {...p} />);
  const file = new File(["video"], "round.mp4", { type: "video/mp4" });
  const input = container.querySelector("input[type=file]")!;
  fireEvent.change(input, { target: { files: [file] } });
  expect(p.onFile).toHaveBeenCalledWith(file);
  const zone = screen.getByRole("button", {
    name: "Importer une vidéo de sparring",
  });
  const pick = vi.spyOn(input as HTMLInputElement, "click");
  fireEvent.keyDown(zone, { key: "Enter" });
  expect(pick).toHaveBeenCalledOnce();
  fireEvent.dragOver(zone);
  fireEvent.dragLeave(zone);
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
  expect(p.onFile).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getByLabelText("Comment vous reconnaître"), {
    target: { value: "Gants rouges" },
  });
  expect(p.onAthleteChange).toHaveBeenCalledWith("Gants rouges");
});
it("does not accept files while processing", () => {
  const p = props();
  render(<SparringUploadPanel {...p} disabled />);
  const zone = screen.getByRole("button", {
    name: "Importer une vidéo de sparring",
  });
  fireEvent.drop(zone, { dataTransfer: { files: [new File(["x"], "x.mp4")] } });
  fireEvent.keyDown(zone, { key: " " });
  expect(p.onFile).not.toHaveBeenCalled();
  expect(zone.tabIndex).toBe(-1);
});
