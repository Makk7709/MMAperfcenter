// Pass-through for an OpenAI-style SSE stream that reports, once it ends,
// whether the model produced any answer text. Used to refund the quota when a
// reply comes back empty (safety block, error event sent mid-stream).

const decoder = () => new TextDecoder();

function lineHasContent(line: string): boolean {
  if (!line.startsWith("data:")) return false;
  const json = line.slice(5).trim();
  if (!json || json === "[DONE]") return false;
  try {
    const content = JSON.parse(json)?.choices?.[0]?.delta?.content;
    return typeof content === "string" && content.trim().length > 0;
  } catch {
    return false;
  }
}

export function watchStreamContent(
  source: ReadableStream<Uint8Array>,
  onEnd: (hadContent: boolean) => void | Promise<void>,
): ReadableStream<Uint8Array> {
  const text = decoder();
  let buffer = "";
  let hadContent = false;

  const scan = (chunk: string) => {
    if (hadContent) return;
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1 && !hadContent) {
      hadContent = lineHasContent(buffer.slice(0, newline).replace(/\r$/, ""));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
    if (hadContent) buffer = "";
  };

  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        scan(text.decode(chunk, { stream: true }));
        controller.enqueue(chunk);
      },
      async flush() {
        scan(text.decode() + "\n");
        await onEnd(hadContent);
      },
    }),
  );
}
