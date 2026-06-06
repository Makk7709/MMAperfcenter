/**
 * Utilitaires de lecture de flux SSE (Server-Sent Events) au format OpenAI.
 *
 * Les fonctions d'analyse IA (Coach IA, analyse de stats) consomment un flux
 * `text/event-stream` renvoyé par les Edge Functions. La logique de parsing
 * est centralisée ici pour éviter la duplication et garder les composants
 * appelants simples.
 */

type SSELineResult =
  | { type: "skip" }
  | { type: "done" }
  | { type: "incomplete" }
  | { type: "delta"; content: string | undefined };

const parseSSELine = (rawLine: string): SSELineResult => {
  let line = rawLine;
  if (line.endsWith("\r")) line = line.slice(0, -1);
  if (line.startsWith(":") || line.trim() === "") return { type: "skip" };
  if (!line.startsWith("data: ")) return { type: "skip" };

  const jsonStr = line.slice(6).trim();
  if (jsonStr === "[DONE]") return { type: "done" };

  try {
    const parsed = JSON.parse(jsonStr);
    return { type: "delta", content: parsed.choices?.[0]?.delta?.content as string | undefined };
  } catch {
    return { type: "incomplete" };
  }
};

/**
 * Traite les lignes complètes présentes dans le tampon en appelant `onDelta`
 * pour chaque fragment de contenu. Renvoie le tampon restant (pouvant contenir
 * une ligne incomplète à compléter par le prochain chunk réseau).
 */
const drainSSEBuffer = (buffer: string, onDelta: (content: string) => void): string => {
  let textBuffer = buffer;
  let newlineIndex = textBuffer.indexOf("\n");

  while (newlineIndex !== -1) {
    const rawLine = textBuffer.slice(0, newlineIndex);
    const rest = textBuffer.slice(newlineIndex + 1);
    const result = parseSSELine(rawLine);

    if (result.type === "incomplete") {
      return `${rawLine}\n${rest}`;
    }

    textBuffer = rest;
    if (result.type === "done") break;
    if (result.type === "delta" && result.content) onDelta(result.content);

    newlineIndex = textBuffer.indexOf("\n");
  }

  return textBuffer;
};

/**
 * Lit un flux SSE jusqu'à épuisement et transmet chaque fragment de contenu
 * via `onDelta`.
 */
export const consumeSSEStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (content: string) => void,
): Promise<void> => {
  const decoder = new TextDecoder();
  let textBuffer = "";

  let result = await reader.read();
  while (!result.done) {
    textBuffer += decoder.decode(result.value, { stream: true });
    textBuffer = drainSSEBuffer(textBuffer, onDelta);
    result = await reader.read();
  }
};
