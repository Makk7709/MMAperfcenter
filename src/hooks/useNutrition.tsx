import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { fromDateKey, lastDateKeys } from "@/lib/dateKey";
import { asMealType, sumMacros, type Macros, type MealType } from "@/lib/nutrition";

export interface NutritionLog {
  id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export type NewNutritionLog = Omit<NutritionLog, "id" | "created_at">;

export interface NutritionGoals {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
}

export const DEFAULT_GOALS: NutritionGoals = {
  daily_calories: 2000,
  daily_protein_g: 150,
  daily_carbs_g: 250,
  daily_fat_g: 70,
};

const nutritionKey = (userId?: string) => ["nutrition", userId] as const;

const toLog = (row: Record<string, unknown>): NutritionLog => ({
  id: String(row.id),
  date: String(row.date),
  meal_type: asMealType(String(row.meal_type)),
  food_name: String(row.food_name),
  calories: Number(row.calories) || 0,
  protein_g: Number(row.protein_g) || 0,
  carbs_g: Number(row.carbs_g) || 0,
  fat_g: Number(row.fat_g) || 0,
  created_at: String(row.created_at),
});

/** Entries, totals and goals for one local day (`yyyy-MM-dd`), plus the 7 days ending on it. */
export const useNutrition = (dateKey: string) => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const weekKeys = useMemo(() => lastDateKeys(7, fromDateKey(dateKey)), [dateKey]);

  const logsQuery = useQuery({
    queryKey: [...nutritionKey(userId), "day", dateKey],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("id, date, meal_type, food_name, calories, protein_g, carbs_g, fat_g, created_at")
        .eq("user_id", userId!)
        .eq("date", dateKey)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toLog);
    },
  });

  const weekQuery = useQuery({
    queryKey: [...nutritionKey(userId), "week", dateKey],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("date, calories")
        .eq("user_id", userId!)
        .gte("date", weekKeys[0])
        .lte("date", dateKey);
      if (error) throw error;
      const byDay = new Map<string, number>();
      for (const row of data ?? []) byDay.set(row.date, (byDay.get(row.date) ?? 0) + (Number(row.calories) || 0));
      return weekKeys.map((key) => ({ date: key, calories: byDay.get(key) ?? 0 }));
    },
  });

  const goalsQuery = useQuery({
    queryKey: [...nutritionKey(userId), "goals"],
    enabled: !!userId,
    queryFn: async (): Promise<NutritionGoals> => {
      const { data, error } = await supabase
        .from("nutrition_goals")
        .select("daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_GOALS;
      return {
        daily_calories: Number(data.daily_calories) || DEFAULT_GOALS.daily_calories,
        daily_protein_g: Number(data.daily_protein_g) || DEFAULT_GOALS.daily_protein_g,
        daily_carbs_g: Number(data.daily_carbs_g) || DEFAULT_GOALS.daily_carbs_g,
        daily_fat_g: Number(data.daily_fat_g) || DEFAULT_GOALS.daily_fat_g,
      };
    },
  });

  const refreshDays = () => queryClient.invalidateQueries({ queryKey: nutritionKey(userId) });

  const addLog = useMutation({
    mutationFn: async (log: NewNutritionLog) => {
      const { error } = await supabase.from("nutrition_logs").insert({ user_id: userId!, ...log });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aliment ajouté");
      void refreshDays();
    },
    onError: () => toast.error("L'aliment n'a pas pu être ajouté"),
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aliment retiré");
      void refreshDays();
    },
    onError: () => toast.error("L'aliment n'a pas pu être retiré"),
  });

  const saveGoals = useMutation({
    mutationFn: async (goals: NutritionGoals) => {
      const { error } = await supabase
        .from("nutrition_goals")
        .upsert({ user_id: userId!, ...goals }, { onConflict: "user_id" });
      if (error) throw error;
      return goals;
    },
    onSuccess: (goals) => {
      queryClient.setQueryData([...nutritionKey(userId), "goals"], goals);
      toast.success("Objectifs enregistrés");
    },
    onError: () => toast.error("Les objectifs n'ont pas pu être enregistrés"),
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const totals: Macros = useMemo(() => sumMacros(logs), [logs]);

  return {
    logs,
    totals,
    week: weekQuery.data ?? weekKeys.map((date) => ({ date, calories: 0 })),
    goals: goalsQuery.data ?? DEFAULT_GOALS,
    isLoading: logsQuery.isLoading,
    isError: logsQuery.isError,
    addLog: addLog.mutateAsync,
    adding: addLog.isPending,
    deleteLog: deleteLog.mutate,
    deletingId: deleteLog.isPending ? deleteLog.variables : undefined,
    saveGoals: saveGoals.mutateAsync,
    savingGoals: saveGoals.isPending,
  };
};
