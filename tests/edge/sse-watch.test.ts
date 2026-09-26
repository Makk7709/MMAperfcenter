import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { watchStreamContent } from "../../supabase/functions/_shared/sse-watch.ts";

const streamOf = (...chunks: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
};

const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;

async function run(...chunks: string[]): Promise<{ hadContent: boolean | null; body: string }> {
  let hadContent: boolean | null = null;
  const watched = watchStreamContent(streamOf(...chunks), (had) => {
    hadContent = had;
  });
  const body = await new Response(watched).text();
  return { hadContent, body };
}

Deno.test("watchStreamContent passes the stream through untouched", async () => {
  const chunks = [delta("Bon"), delta("jour"), "data: [DONE]\n"];
  const { body, hadContent } = await run(...chunks);
  assertEquals(body, chunks.join(""));
  assertEquals(hadContent, true);
});

Deno.test("watchStreamContent detects content split across chunks", async () => {
  const line = delta("Salut");
  assertEquals((await run(line.slice(0, 10), line.slice(10))).hadContent, true);
});

Deno.test("watchStreamContent reports an empty reply", async () => {
  const blocked = `data: ${JSON.stringify({ choices: [{ delta: { role: "assistant" }, finish_reason: "content_filter" }] })}\n`;
  assertEquals((await run(blocked, delta("  "), "data: [DONE]\n")).hadContent, false);
  assertEquals((await run(`data: ${JSON.stringify({ error: { message: "boom" } })}\n`)).hadContent, false);
  assertEquals((await run()).hadContent, false);
});

Deno.test("watchStreamContent reads a last line without newline", async () => {
  assertEquals((await run(delta("A").trimEnd())).hadContent, true);
});
