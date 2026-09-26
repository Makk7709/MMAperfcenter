import { describe, expect, it } from "vitest";
import { consumeSSEStream, SSEStreamError } from "./sse";

const readerOf = (...chunks: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  }).getReader();
};

const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;

const collect = async (...chunks: string[]) => {
  let text = "";
  await consumeSSEStream(readerOf(...chunks), (d) => {
    text += d;
  });
  return text;
};

describe("consumeSSEStream", () => {
  it("joins deltas, including a line split across network chunks", async () => {
    const line = delta("lo");
    expect(await collect(delta("Bonjour "), line.slice(0, 12), line.slice(12), "data: [DONE]\n")).toBe("Bonjour lo");
  });

  it("skips a malformed line instead of dropping the rest of the answer", async () => {
    expect(await collect(delta("Début"), "data: {oops\n", delta(" et fin"), "data: [DONE]\n")).toBe("Début et fin");
  });

  it("ignores comments, blank lines and anything after [DONE]", async () => {
    expect(await collect(": keep-alive\n", "\n", delta("A"), "data: [DONE]\n", delta("B"))).toBe("A");
  });

  it("reads a final line that has no trailing newline", async () => {
    expect(await collect(delta("A"), delta("B").trimEnd())).toBe("AB");
  });

  it("raises the gateway error sent mid-stream", async () => {
    const error = `data: ${JSON.stringify({ error: { message: "Contenu bloqué" } })}\n`;
    await expect(collect(delta("A"), error)).rejects.toBeInstanceOf(SSEStreamError);
    await expect(collect(error)).rejects.toThrow("Contenu bloqué");
  });
});
