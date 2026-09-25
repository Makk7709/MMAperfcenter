import { streamChatCompletion } from "../_shared/ai-gateway.ts";
import { createServiceClient, requireUser } from "../_shared/auth.ts";
import { errorResponse, preflight, PublicError, streamResponse } from "../_shared/http.ts";
import { consumeQuota, refundQuota } from "../_shared/quota.ts";

const MAX_HISTORY = 30;
const MAX_MESSAGE_CHARS = 4000;

type ChatMessage = { role: "user" | "assistant"; content: string };

// Only user/assistant turns are forwarded: the system prompt is ours alone.
// Older turns beyond MAX_HISTORY are dropped to bound the token cost.
function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new PublicError("Conversation vide");
  const messages = raw.slice(-MAX_HISTORY).map((m) => {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) {
      throw new PublicError("Format de message invalide");
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      throw new PublicError(`Message trop long (${MAX_MESSAGE_CHARS} caractères maximum)`);
    }
    return { role, content } as ChatMessage;
  });
  if (messages[messages.length - 1].role !== "user") throw new PublicError("Le dernier message doit venir de l'utilisateur");
  return messages;
}

// deno-lint-ignore no-explicit-any
function buildSystemPrompt(profile: any): string {
  let systemPrompt = `Tu es Coach IA KOREV, un expert en arts martiaux et préparation physique pour combattants. Tu es spécialisé dans la création de programmes d'entraînement personnalisés.

PROFIL DU COMBATTANT:`;

  const p: any = profile || {};
  const add = (label: string, value: any) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    systemPrompt += `\n- ${label}: ${Array.isArray(value) ? value.join(", ") : value}`;
  };

  // Identité
  add("Nom", p.full_name);
  add("Âge", p.age ? `${p.age} ans` : null);
  add("Genre", p.gender);
  add("Latéralité", p.handedness);

  // Physique
  add("Poids", p.weight ? `${p.weight} kg` : null);
  add("Taille", p.height ? `${p.height} cm` : null);
  add("Masse grasse", p.body_fat_percent ? `${p.body_fat_percent}%` : null);
  add("Tour de taille", p.waist_cm ? `${p.waist_cm} cm` : null);
  add("Morphotype", p.morphotype);
  add("Blessures / limitations", p.injuries);

  // Expérience martiale
  add("Discipline principale", p.martial_arts_discipline);
  add("Disciplines secondaires", p.secondary_disciplines);
  add("Niveau global", p.fitness_level);
  add("Années de pratique", p.years_practice);
  add("Grade / ceinture", p.belt_rank);
  add("Niveau compétition", p.competition_level);
  add("Nombre de combats", p.competitions_count);

  // Objectifs
  add("Objectifs", p.goals);
  add("Objectif principal", p.primary_goal);
  add("Échéance objectif", p.goal_deadline);
  add("Événement cible", p.target_event);

  // Lifestyle
  add("Sommeil moyen", p.sleep_hours ? `${p.sleep_hours} h/nuit` : null);
  add("Niveau de stress", p.stress_level ? `${p.stress_level}/10` : null);
  add("Disponibilité", p.weekly_availability ? `${p.weekly_availability} séances/semaine` : null);
  add("Durée préférée d'une séance", p.preferred_session_duration ? `${p.preferred_session_duration} min` : null);
  add("Lieu d'entraînement", p.training_location);
  add("Équipement disponible", p.equipment);
  add("Restrictions alimentaires", p.dietary_restrictions);

  systemPrompt += `

INSTRUCTIONS:
- Utilise TOUJOURS ces informations pour personnaliser tes recommandations
- Propose des programmes adaptés à sa discipline martiale, son niveau ET son âge
- Tiens compte de son poids, âge et objectifs dans tes conseils nutritionnels
- Adapte l'intensité et le volume d'entraînement selon l'âge du combattant
- Sois motivant, technique et précis
- Réponds en français
- Si des informations manquent dans le profil, demande-les au combattant
- Pour les programmes d'entraînement, structure-les clairement avec échauffement, corps de séance, et retour au calme
- Adapte l'intensité selon son niveau de fitness et son âge

NUTRITION & MACROS:
- Calcule et recommande des répartitions de macros personnalisées (protéines/glucides/lipides) selon ses objectifs et son âge
- Utilise l'âge pour calculer le métabolisme basal et les besoins caloriques journaliers
- Propose des projections de poids réalistes basées sur son profil et ses objectifs
- Crée des recettes équilibrées adaptées aux combattants avec calcul des macros détaillé
- Suggère des plans alimentaires par semaine si demandé
- Adapte les calories et macros selon phase (prise de masse, sèche, maintien, perte de poids)
- Pour les recettes: inclus portions, temps de préparation, ingrédients précis et valeurs nutritionnelles complètes`;

  return systemPrompt;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const user = await requireUser(supabase, req);
    const body = await req.json().catch(() => ({}));
    const messages = parseMessages(body?.messages);

    await consumeQuota(supabase, user.id, "ai_coach");
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const stream = await streamChatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: buildSystemPrompt(profile) }, ...messages],
      });
      return streamResponse(req, stream);
    } catch (e) {
      await refundQuota(supabase, user.id, "ai_coach");
      throw e;
    }
  } catch (e) {
    return errorResponse(req, e, "ai-coach");
  }
});
