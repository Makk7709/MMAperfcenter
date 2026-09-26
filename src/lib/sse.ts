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
  | { type: "delta"; content: string | undefined };

/** Erreur signalée par la passerelle IA au milieu d'un flux déjà ouvert. */
export class SSEStreamError extends Error {}

const errorMessage = (error: unknown): string => {
  if (typeof error === "string" && error) return error;
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" && message ? message : "Le Coach IA a interrompu sa réponse";
};

// Appelée uniquement sur des lignes complètes : une ligne JSON invalide est
// ignorée, jamais conservée, sinon elle bloquerait tout le reste du flux.
const parseSSELine = (rawLine: string): SSELineResult => {
  let line = rawLine;
  if (line.endsWith("\r")) line = line.slice(0, -1);
  if (!line.startsWith("data:")) return { type: "skip" };

  const jsonStr = line.slice(5).trim();
  if (jsonStr === "[DONE]") return { type: "done" };

  let parsed: { choices?: Array<{ delta?: { content?: unknown } }>; error?: unknown };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { type: "skip" };
  }
  if (parsed?.error) throw new SSEStreamError(errorMessage(parsed.error));
  const content = parsed?.choices?.[0]?.delta?.content;
  return { type: "delta", content: typeof content === "string" ? content : undefined };
};

/**
 * Traite les lignes complètes présentes dans le tampon en appelant `onDelta`
 * pour chaque fragment de contenu. Renvoie le tampon restant (une ligne
 * incomplète à compléter par le prochain chunk réseau) et si `[DONE]` a été lu.
 */
const drainSSEBuffer = (
  buffer: string,
  onDelta: (content: string) => void,
): { rest: string; done: boolean } => {
  let textBuffer = buffer;
  let newlineIndex = textBuffer.indexOf("\n");

  while (newlineIndex !== -1) {
    const result = parseSSELine(textBuffer.slice(0, newlineIndex));
    textBuffer = textBuffer.slice(newlineIndex + 1);
    if (result.type === "done") return { rest: "", done: true };
    if (result.type === "delta" && result.content) onDelta(result.content);
    newlineIndex = textBuffer.indexOf("\n");
  }

  return { rest: textBuffer, done: false };
};

/**
 * Lit un flux SSE jusqu'à épuisement (ou `[DONE]`) et transmet chaque fragment
 * de contenu via `onDelta`. Lève `SSEStreamError` si la passerelle envoie un
 * évènement d'erreur.
 */
export const consumeSSEStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (content: string) => void,
): Promise<void> => {
  const decoder = new TextDecoder();
  let textBuffer = "";

  try {
    let result = await reader.read();
    while (!result.done) {
      textBuffer += decoder.decode(result.value, { stream: true });
      const drained = drainSSEBuffer(textBuffer, onDelta);
      if (drained.done) return;
      textBuffer = drained.rest;
      result = await reader.read();
    }
    textBuffer += decoder.decode();
    if (textBuffer) drainSSEBuffer(`${textBuffer}\n`, onDelta);
  } finally {
    reader.cancel().catch(() => {});
  }
};
