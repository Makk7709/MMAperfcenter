import { PublicError } from "./http.ts";

export const MAX_HISTORY = 30;
export const MAX_USER_CHARS = 4000;
// Coach answers (full programmes, meal plans) routinely exceed the user limit;
// older ones are shortened rather than rejected so the chat keeps working.
export const MAX_ASSISTANT_CHARS = 6000;
// Worst case: MAX_HISTORY messages of MAX_ASSISTANT_CHARS 4-byte characters.
export const MAX_BODY_BYTES = 768 * 1024;

export type ChatMessage = { role: "user" | "assistant"; content: string };

// Only user/assistant turns are forwarded: the system prompt is ours alone.
// Older turns beyond MAX_HISTORY are dropped to bound the token cost.
export function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new PublicError("Conversation vide");
  const messages: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      throw new PublicError("Format de message invalide");
    }
    if (role === "assistant") {
      if (!content.trim()) continue;
      messages.push({ role, content: content.slice(0, MAX_ASSISTANT_CHARS) });
      continue;
    }
    if (!content.trim()) throw new PublicError("Format de message invalide");
    if (content.length > MAX_USER_CHARS) {
      throw new PublicError(`Message trop long (${MAX_USER_CHARS} caractères maximum)`);
    }
    messages.push({ role, content });
  }
  if (messages[messages.length - 1]?.role !== "user") {
    throw new PublicError("Le dernier message doit venir de l'utilisateur");
  }
  return messages;
}
