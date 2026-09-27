import { expect, it } from "vitest";
import { buildAnalysisMessages } from "./sparringPrompts";
it("keeps images in the user message and communicates duration and sampling", () => {
  const image = {
    type: "image_url",
    image_url: { url: "data:image/jpeg;base64,YQ==" },
  };
  const messages = buildAnalysisMessages(
    { frameCount: 12, totalDuration: 125 },
    [image],
  );
  expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
  expect(messages[0].content).toContain("2:05");
  expect(messages[0].content).toContain("12 images");
  expect(messages[1].content).toEqual([
    expect.objectContaining({
      type: "text",
      text: expect.stringContaining('"duration_seconds": 125'),
    }),
    image,
  ]);
});
