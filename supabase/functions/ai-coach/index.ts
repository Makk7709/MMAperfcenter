import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { AI_GATEWAY_URL, getAiGatewayKey } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// deno-lint-ignore no-explicit-any
async function authenticateUser(supabase: any, token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.error("User not authenticated:", error?.message);
    return null;
  }
  return user;
}

// Applique le gating serveur (free = quota mensuel). Renvoie true si l'accès
// est autorisé (admin/coach toujours autorisés), false sinon.
// deno-lint-ignore no-explicit-any
async function checkAiCoachAccess(supabase: any, userId: string): Promise<boolean> {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isCoach } = await supabase.rpc("has_role", { _user_id: userId, _role: "coach" });
  if (isAdmin === true || isCoach === true) return true;

  const { data: allowed, error: gateErr } = await supabase.rpc("has_feature_access", {
    _user_id: userId,
    _feature: "ai_coach",
  });
  if (gateErr) console.error("has_feature_access error:", gateErr);
  if (allowed !== true) return false;

  await supabase.rpc("increment_feature_usage", { _user_id: userId, _feature_name: "ai_coach" });
  return true;
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

async function handleGatewayError(response: Response): Promise<Response> {
  if (response.status === 429) {
    return jsonResponse({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }, 429);
  }
  if (response.status === 402) {
    return jsonResponse({ error: "Crédit insuffisant, contactez le support." }, 402);
  }
  const t = await response.text();
  console.error("AI gateway error:", response.status, t);
  return jsonResponse({ error: "Erreur du service IA" }, 500);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const aiGatewayKey = getAiGatewayKey();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return jsonResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const user = await authenticateUser(supabase, token);
    if (!user) {
      return jsonResponse({ error: "User not authenticated" }, 401);
    }
    console.log("User authenticated:", user.id);

    // Feature gating (server-side enforcement)
    const allowed = await checkAiCoachAccess(supabase, user.id);
    if (!allowed) {
      return jsonResponse(
        { error: "Limite mensuelle atteinte pour Coach IA. Passe au plan Pro pour un accès illimité.", code: "FEATURE_LIMIT_REACHED" },
        402,
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const systemPrompt = buildSystemPrompt(profile);

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiGatewayKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      return await handleGatewayError(response);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});
