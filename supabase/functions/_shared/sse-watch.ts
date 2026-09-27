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

  // onEnd runs once, whether the stream ends, fails or is cancelled: an
  // upstream error before any text must refund like an empty reply.
  let ended = false;
  const end = async () => {
    if (ended) return;
    ended = true;
    await onEnd(hadContent);
  };

  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch (error) {
        await end();
        controller.error(error);
        return;
      }
      if (result.done) {
        scan(text.decode() + "\n");
        await end();
        controller.close();
        return;
      }
      scan(text.decode(result.value, { stream: true }));
      controller.enqueue(result.value);
    },
    async cancel(reason) {
      await end();
      await reader.cancel(reason);
    },
  });
}
