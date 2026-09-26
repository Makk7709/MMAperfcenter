import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toDateKey } from "@/lib/dateKey";
import {
  asIntensity,
  asSessionType,
  estimateCalories,
  progressFromXP,
  sessionMinutes,
  summarizeSets,
  totalXP,
  workoutXP,
  type Intensity,
  type Progress,
  type SessionType,
  type SetsSummary,
} from "@/lib/training/session";
import { calculateStreak } from "@/utils/gamification/wolfPack";

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  instructions?: string | null;
}

export interface SessionSet {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed: boolean;
}

export interface SessionExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  rest_seconds: number;
  exercise: Exercise;
  sets: SessionSet[];
}

export interface ActiveWorkout {
  id: string;
  name: string;
  session_type: SessionType;
  intensity: Intensity;
  planned_rounds: number | null;
  round_seconds: number | null;
  rest_seconds: number | null;
  rounds_completed: number;
  started_at: string;
  workout_exercises: SessionExercise[];
}

export interface StartSessionInput {
  name: string;
  type: SessionType;
  intensity: Intensity;
  rounds?: number;
  roundDuration?: number;
  restDuration?: number;
}

export interface FinishInput {
  mood?: string;
  energy?: number;
  note?: string;
}

export interface FinishedSession extends SetsSummary {
  name: string;
  minutes: number;
  calories: number;
  rounds: number;
  xp: number;
}

const ACTIVE_SELECT = `
  id, name, session_type, intensity, planned_rounds, round_seconds, rest_seconds, rounds_completed, started_at,
  workout_exercises (id, exercise_id, order_index, rest_seconds, exercise:exercises (*), sets (id, set_number, weight_kg, reps, completed))
`;

const DEFAULT_EXERCISE_REST = 90;

// PostgREST returns NUMERIC as strings and nested rows unordered.
type RawWorkout = Omit<ActiveWorkout, "session_type" | "intensity" | "workout_exercises"> & {
  session_type: string | null;
  intensity: string | null;
  rounds_completed: number | null;
  started_at: string | null;
  workout_exercises: Array<Omit<SessionExercise, "sets" | "rest_seconds"> & {
    rest_seconds: number | null;
    sets: Array<Omit<SessionSet, "weight_kg" | "completed"> & { weight_kg: number | string | null; completed: boolean | null }>;
  }>;
};

const normalizeWorkout = (w: RawWorkout): ActiveWorkout => ({
  ...w,
  session_type: asSessionType(w.session_type),
  intensity: asIntensity(w.intensity),
  rounds_completed: w.rounds_completed ?? 0,
  started_at: w.started_at ?? new Date().toISOString(),
  workout_exercises: [...(w.workout_exercises ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((we) => ({
      ...we,
      rest_seconds: we.rest_seconds ?? DEFAULT_EXERCISE_REST,
      sets: [...(we.sets ?? [])]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ ...s, weight_kg: Number(s.weight_kg) || 0, completed: !!s.completed })),
    })),
});

export const activeWorkoutKey = (userId: string | undefined) => ["active-workout", userId] as const;
export const trainingProgressKey = (userId: string | undefined) => ["training-progress", userId] as const;

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    staleTime: Infinity,
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Exercise[];
    },
  });
}

export function useActiveWorkout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const key = useMemo(() => activeWorkoutKey(userId), [userId]);
  const [pending, setPending] = useState(false);

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async (): Promise<ActiveWorkout | null> => {
      const { data, error } = await supabase
        .from("workouts")
        .select(ACTIVE_SELECT)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeWorkout(data as unknown as RawWorkout) : null;
    },
  });

  const workout = query.data ?? null;

  const patch = useCallback(
    (fn: (w: ActiveWorkout) => ActiveWorkout) =>
      queryClient.setQueryData<ActiveWorkout | null>(key, (w) => (w ? fn(w) : w)),
    [queryClient, key],
  );

  const patchExercise = useCallback(
    (weId: string, fn: (we: SessionExercise) => SessionExercise) =>
      patch((w) => ({ ...w, workout_exercises: w.workout_exercises.map((we) => (we.id === weId ? fn(we) : we)) })),
    [patch],
  );

  const run = useCallback(async <T,>(label: string, op: () => Promise<T>): Promise<T | undefined> => {
    setPending(true);
    try {
      return await op();
    } catch (error) {
      console.error(label, error);
      toast.error(label);
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  const start = useCallback(
    (input: StartSessionInput) =>
      run("Impossible de démarrer la séance", async () => {
        if (!user) throw new Error("not signed in");
        const withRounds = !!input.rounds && !!input.roundDuration;
        const { data, error } = await supabase
          .from("workouts")
          .insert({
            user_id: user.id,
            name: input.name.slice(0, 80),
            status: "active",
            session_type: input.type,
            intensity: input.intensity,
            planned_rounds: withRounds ? input.rounds : null,
            round_seconds: withRounds ? input.roundDuration : null,
            rest_seconds: withRounds ? input.restDuration ?? 60 : null,
          })
          .select(ACTIVE_SELECT)
          .single();
        if (error) throw error;
        const created = normalizeWorkout(data as unknown as RawWorkout);
        queryClient.setQueryData(key, created);
        return created;
      }),
    [run, user, queryClient, key],
  );

  const addExercise = useCallback(
    (exerciseId: string) =>
      run("Impossible d'ajouter l'exercice", async () => {
        if (!workout) return;
        const orderIndex = workout.workout_exercises.reduce((m, we) => Math.max(m, we.order_index + 1), 0);
        const { data, error } = await supabase
          .from("workout_exercises")
          .insert({ workout_id: workout.id, exercise_id: exerciseId, order_index: orderIndex, rest_seconds: DEFAULT_EXERCISE_REST })
          .select("id, exercise_id, order_index, rest_seconds, exercise:exercises (*)")
          .single();
        if (error) throw error;
        const we = data as unknown as Omit<SessionExercise, "sets">;
        const { data: firstSet, error: setError } = await supabase
          .from("sets")
          .insert({ workout_exercise_id: we.id, set_number: 1, weight_kg: 0, reps: 10, completed: false })
          .select("id, set_number, weight_kg, reps, completed")
          .single();
        if (setError) throw setError;
        patch((w) => ({
          ...w,
          workout_exercises: [
            ...w.workout_exercises,
            { ...we, rest_seconds: we.rest_seconds ?? DEFAULT_EXERCISE_REST, sets: [{ ...firstSet, weight_kg: Number(firstSet.weight_kg) || 0, completed: false }] },
          ],
        }));
      }),
    [run, workout, patch],
  );

  const removeExercise = useCallback(
    (weId: string) =>
      run("Impossible de retirer l'exercice", async () => {
        const { error } = await supabase.from("workout_exercises").delete().eq("id", weId);
        if (error) throw error;
        patch((w) => ({ ...w, workout_exercises: w.workout_exercises.filter((we) => we.id !== weId) }));
      }),
    [run, patch],
  );

  const addSet = useCallback(
    (weId: string) =>
      run("Impossible d'ajouter la série", async () => {
        const we = workout?.workout_exercises.find((e) => e.id === weId);
        if (!we) return;
        const last = we.sets[we.sets.length - 1];
        const setNumber = we.sets.reduce((m, s) => Math.max(m, s.set_number), 0) + 1;
        const { data, error } = await supabase
          .from("sets")
          .insert({ workout_exercise_id: weId, set_number: setNumber, weight_kg: last?.weight_kg ?? 0, reps: last?.reps ?? 10, completed: false })
          .select("id, set_number, weight_kg, reps, completed")
          .single();
        if (error) throw error;
        patchExercise(weId, (e) => ({ ...e, sets: [...e.sets, { ...data, weight_kg: Number(data.weight_kg) || 0, completed: false }] }));
      }),
    [run, workout, patchExercise],
  );

  const updateSet = useCallback(
    (weId: string, setId: string, values: Partial<Pick<SessionSet, "weight_kg" | "reps" | "completed">>) =>
      run("Impossible d'enregistrer la série", async () => {
        const update: { weight_kg?: number; reps?: number; completed?: boolean; completed_at?: string | null } = { ...values };
        if (values.completed !== undefined) update.completed_at = values.completed ? new Date().toISOString() : null;
        const { error } = await supabase.from("sets").update(update).eq("id", setId);
        if (error) throw error;
        patchExercise(weId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...values } : s)) }));
        return true;
      }),
    [run, patchExercise],
  );

  const deleteSet = useCallback(
    (weId: string, setId: string) =>
      run("Impossible de supprimer la série", async () => {
        const { error } = await supabase.from("sets").delete().eq("id", setId);
        if (error) throw error;
        patchExercise(weId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
      }),
    [run, patchExercise],
  );

  const setRoundsCompleted = useCallback(
    async (rounds: number) => {
      if (!workout || rounds === workout.rounds_completed) return;
      patch((w) => ({ ...w, rounds_completed: rounds }));
      const { error } = await supabase.from("workouts").update({ rounds_completed: rounds }).eq("id", workout.id);
      if (error) console.error("rounds_completed", error);
    },
    [workout, patch],
  );

  const finish = useCallback(
    (input: FinishInput) =>
      run("Impossible d'enregistrer la séance", async (): Promise<FinishedSession> => {
        if (!workout || !user) throw new Error("no active workout");
        const minutes = sessionMinutes(workout.started_at);
        const sets = summarizeSets(workout.workout_exercises);
        const { data: profile } = await supabase.from("profiles").select("weight").eq("id", user.id).maybeSingle();
        const calories = estimateCalories(workout.session_type, workout.intensity, minutes, profile?.weight ? Number(profile.weight) : null);

        const { error } = await supabase
          .from("workouts")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            duration_minutes: minutes,
            total_volume_kg: sets.volumeKg,
            calories_burned: calories,
            rounds_completed: workout.rounds_completed,
          })
          .eq("id", workout.id);
        if (error) throw error;

        const note = input.note?.trim();
        if (note || input.mood) {
          const { error: journalError } = await supabase.from("workout_journal").insert({
            user_id: user.id,
            date: toDateKey(),
            title: workout.name,
            notes: note || null,
            mood: input.mood ?? "neutral",
            energy_level: Math.min(10, Math.max(1, Math.round(input.energy ?? 5))),
            workout_id: workout.id,
          });
          // The session itself is saved: a failed note must not lose it.
          if (journalError) {
            console.error("journal", journalError);
            toast.error("Séance enregistrée, mais la note du carnet n'a pas pu l'être");
          }
        }

        queryClient.setQueryData(key, null);
        void queryClient.invalidateQueries({ queryKey: trainingProgressKey(user.id) });
        void queryClient.invalidateQueries({ queryKey: ["journal", user.id] });

        return {
          ...sets,
          name: workout.name,
          minutes,
          calories,
          rounds: workout.rounds_completed,
          xp: workoutXP({ intensity: workout.intensity, duration_minutes: minutes, rounds_completed: workout.rounds_completed, setsCompleted: sets.setsCompleted }),
        };
      }),
    [run, workout, user, queryClient, key],
  );

  const discard = useCallback(
    () =>
      run("Impossible d'abandonner la séance", async () => {
        if (!workout) return true;
        const { error } = await supabase.from("workouts").delete().eq("id", workout.id);
        if (error) throw error;
        queryClient.setQueryData(key, null);
        return true;
      }),
    [run, workout, queryClient, key],
  );

  return {
    workout,
    isLoading: query.isLoading,
    isError: query.isError,
    pending,
    start,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    deleteSet,
    setRoundsCompleted,
    finish,
    discard,
  };
}

export interface RecentSession {
  id: string;
  name: string;
  session_type: SessionType;
  completed_at: string;
  duration_minutes: number;
  total_volume_kg: number;
  rounds_completed: number;
}

export interface TrainingProgress extends Progress {
  totalWorkouts: number;
  weekWorkouts: number;
  streakDays: number;
  recent: RecentSession[];
}

export function useTrainingProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: trainingProgressKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<TrainingProgress> => {
      const [workoutsRes, sparringRes] = await Promise.all([
        supabase
          .from("workouts")
          .select("id, name, session_type, completed_at, duration_minutes, intensity, rounds_completed, total_volume_kg, workout_exercises (sets (completed))")
          .eq("user_id", user!.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false }),
        supabase
          .from("sparring_analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "completed"),
      ]);
      if (workoutsRes.error) throw workoutsRes.error;

      const rows = (workoutsRes.data ?? []) as unknown as Array<{
        id: string;
        name: string;
        session_type: string | null;
        completed_at: string | null;
        duration_minutes: number | null;
        intensity: string | null;
        rounds_completed: number | null;
        total_volume_kg: number | string | null;
        workout_exercises: Array<{ sets: Array<{ completed: boolean | null }> }> | null;
      }>;

      const xpInputs = rows.map((w) => ({
        intensity: w.intensity,
        duration_minutes: w.duration_minutes,
        rounds_completed: w.rounds_completed,
        setsCompleted: (w.workout_exercises ?? []).reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0),
      }));

      const weekStart = Date.now() - 7 * 24 * 3600 * 1000;
      const completedDates = rows.map((w) => w.completed_at).filter((d): d is string => !!d);

      return {
        ...progressFromXP(totalXP(xpInputs, sparringRes.count ?? 0)),
        totalWorkouts: rows.length,
        weekWorkouts: completedDates.filter((d) => new Date(d).getTime() >= weekStart).length,
        streakDays: calculateStreak(completedDates),
        recent: rows.slice(0, 3).map((w) => ({
          id: w.id,
          name: w.name,
          session_type: asSessionType(w.session_type),
          completed_at: w.completed_at ?? "",
          duration_minutes: w.duration_minutes ?? 0,
          total_volume_kg: Number(w.total_volume_kg) || 0,
          rounds_completed: w.rounds_completed ?? 0,
        })),
      };
    },
  });
}
