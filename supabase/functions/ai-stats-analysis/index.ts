import { subDays } from "https://esm.sh/date-fns@3.6.0";
import { streamChatCompletion } from "../_shared/ai-gateway.ts";
import { createServiceClient, requireUser, type ServiceClient } from "../_shared/auth.ts";
import { errorResponse, preflight, streamResponse } from "../_shared/http.ts";
import { consumeQuota, refundQuota } from "../_shared/quota.ts";

const dailyAverage = (sum: number, days: number) => (days > 0 ? Math.round(sum / days) : 0);

const describeTrend = (trend: number) => {
  if (trend > 0) return "progression";
  if (trend < 0) return "régression";
  return "stable";
};

// Builds the system prompt from the user's last 30 days of data.
async function buildAnalysisPrompt(supabase: ServiceClient, userId: string): Promise<string> {
    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Fetch workout data (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const { data: workouts } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", thirtyDaysAgo)
      .order("completed_at", { ascending: true });

    // Fetch nutrition data (last 30 days)
    const thirtyDaysAgoDate = subDays(new Date(), 30).toISOString().split('T')[0];
    const { data: nutritionLogs } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("date", thirtyDaysAgoDate)
      .order("date", { ascending: true });

    // Fetch nutrition goals
    const { data: nutritionGoals } = await supabase
      .from("nutrition_goals")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Calculate statistics
    const totalWorkouts = workouts?.length || 0;
    const totalDuration = workouts?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0;
    const totalVolume = workouts?.reduce((sum, w) => sum + (Number(w.total_volume_kg) || 0), 0) || 0;
    const totalCaloriesBurned = workouts?.reduce((sum, w) => sum + (w.calories_burned || 0), 0) || 0;

    // Calculate average weekly workouts
    const weeklyWorkouts = Math.round((totalWorkouts / 4) * 10) / 10;

    // Nutrition aggregation
    const totalNutritionDays = new Set(nutritionLogs?.map(n => n.date) || []).size;
    const sumCalories = nutritionLogs?.reduce((sum, n) => sum + (n.calories || 0), 0) || 0;
    const sumProtein = nutritionLogs?.reduce((sum, n) => sum + (Number(n.protein_g) || 0), 0) || 0;
    const sumCarbs = nutritionLogs?.reduce((sum, n) => sum + (Number(n.carbs_g) || 0), 0) || 0;
    const sumFat = nutritionLogs?.reduce((sum, n) => sum + (Number(n.fat_g) || 0), 0) || 0;
    const avgDailyCalories = dailyAverage(sumCalories, totalNutritionDays);
    const avgDailyProtein = dailyAverage(sumProtein, totalNutritionDays);
    const avgDailyCarbs = dailyAverage(sumCarbs, totalNutritionDays);
    const avgDailyFat = dailyAverage(sumFat, totalNutritionDays);

    // Workout trend (compare last 2 weeks)
    const twoWeeksAgo = subDays(new Date(), 14);
    const oneWeekAgo = subDays(new Date(), 7);
    const lastWeekWorkouts = workouts?.filter(w => new Date(w.completed_at) >= oneWeekAgo).length || 0;
    const previousWeekWorkouts = workouts?.filter(w => 
      new Date(w.completed_at) >= twoWeeksAgo && new Date(w.completed_at) < oneWeekAgo
    ).length || 0;
    const workoutTrend = lastWeekWorkouts - previousWeekWorkouts;

    // Build comprehensive data object for AI
    const userData = {
      profile: {
        name: profile?.full_name || "Combattant",
        weight: profile?.weight,
        height: profile?.height,
        gender: profile?.gender,
        fitnessLevel: profile?.fitness_level,
        discipline: profile?.martial_arts_discipline,
        goals: profile?.goals || []
      },
      workouts: {
        total30Days: totalWorkouts,
        weeklyAverage: weeklyWorkouts,
        totalDuration,
        totalVolume: Math.round(totalVolume),
        totalCaloriesBurned,
        lastWeekWorkouts,
        previousWeekWorkouts,
        trend: describeTrend(workoutTrend)
      },
      nutrition: {
        daysTracked: totalNutritionDays,
        avgDailyCalories,
        avgDailyProtein,
        avgDailyCarbs,
        avgDailyFat,
        goals: nutritionGoals ? {
          targetCalories: nutritionGoals.daily_calories,
          targetProtein: nutritionGoals.daily_protein_g,
          targetCarbs: nutritionGoals.daily_carbs_g,
          targetFat: nutritionGoals.daily_fat_g
        } : null
      }
    };

    const systemPrompt = `Tu es Coach IA KOREV, expert en analyse de performance pour combattants MMA et pratiquants d'arts martiaux.

DONNÉES DU COMBATTANT (30 derniers jours):
${JSON.stringify(userData, null, 2)}

INSTRUCTIONS:
Tu dois fournir une ANALYSE PERSONNALISÉE et ACTIONNABLE basée sur ces données réelles.

Structure ta réponse en 4 sections:

## 🎯 Synthèse Performance
- Résumé de l'activité des 30 derniers jours
- Tendance générale (progression/régression/maintien)
- Points forts identifiés

## 💪 Analyse Entraînement  
- Évaluation de la fréquence (${weeklyWorkouts} séances/semaine)
- Analyse du volume total (${Math.round(totalVolume)} kg)
- Recommandations d'ajustement basées sur l'objectif

## 🍽️ Analyse Nutrition
- Comparaison apports vs objectifs si disponibles
- Évaluation protéines (${avgDailyProtein}g/jour) vs recommandation pour ${profile?.goals?.join(", ") || "performance"}
- Ajustements suggérés

## 📈 Plan d'Action
- 3 actions prioritaires pour les 2 prochaines semaines
- Objectifs mesurables et réalistes
- Conseil motivationnel personnalisé

RÈGLES:
- Sois précis, utilise LES DONNÉES RÉELLES fournies
- Adapte tes conseils à la discipline: ${profile?.martial_arts_discipline || "arts martiaux"}
- Niveau: ${profile?.fitness_level || "intermédiaire"}
- Objectifs: ${profile?.goals?.join(", ") || "performance générale"}
- Réponds en français, sois motivant mais réaliste`;

    return systemPrompt;
}

// Counted against the same monthly AI quota as the coach chat.
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const supabase = createServiceClient();
    const user = await requireUser(supabase, req);

    const ticket = await consumeQuota(supabase, user.id, "ai_coach");
    try {
      const systemPrompt = await buildAnalysisPrompt(supabase, user.id);
      const stream = await streamChatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Analyse ma progression et donne-moi des recommandations personnalisées pour atteindre mes objectifs." },
        ],
      });
      return streamResponse(req, stream);
    } catch (e) {
      await refundQuota(supabase, ticket);
      throw e;
    }
  } catch (e) {
    return errorResponse(req, e, "ai-stats-analysis");
  }
});
