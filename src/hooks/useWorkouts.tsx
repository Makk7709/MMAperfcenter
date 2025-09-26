import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  instructions?: string;
}

export interface WorkoutSet {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed: boolean;
  completed_at?: string;
}

export interface WorkoutExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  rest_seconds: number;
  exercise: Exercise;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  duration_minutes?: number;
  total_volume_kg: number;
  calories_burned: number;
  status: 'active' | 'completed' | 'paused';
  started_at: string;
  completed_at?: string;
  workout_exercises: WorkoutExercise[];
}

export const useWorkouts = () => {
  const { user } = useAuth();
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available exercises
  useEffect(() => {
    const loadExercises = async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading exercises:', error);
        return;
      }

      setExercises(data || []);
    };

    loadExercises();
  }, []);

  // Load current active workout
  useEffect(() => {
    if (!user) return;

    const loadCurrentWorkout = async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*),
            sets (*)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading current workout:', error);
        return;
      }

      if (data) {
        setCurrentWorkout(data as Workout);
      }
    };

    loadCurrentWorkout();
  }, [user]);

  const startWorkout = async (name: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentWorkout({
        ...data,
        workout_exercises: []
      } as Workout);

      toast.success('Entraînement démarré !');
      return data;
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Erreur lors du démarrage de l\'entraînement');
    } finally {
      setLoading(false);
    }
  };

  const addExerciseToWorkout = async (exerciseId: string, restSeconds: number = 60) => {
    if (!currentWorkout) return;

    setLoading(true);
    try {
      const orderIndex = currentWorkout.workout_exercises.length;

      const { data, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: currentWorkout.id,
          exercise_id: exerciseId,
          order_index: orderIndex,
          rest_seconds: restSeconds
        })
        .select(`
          *,
          exercise:exercises (*),
          sets (*)
        `)
        .single();

      if (error) throw error;

      setCurrentWorkout(prev => ({
        ...prev!,
        workout_exercises: [...prev!.workout_exercises, data as WorkoutExercise]
      }));

      toast.success('Exercice ajouté !');
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast.error('Erreur lors de l\'ajout de l\'exercice');
    } finally {
      setLoading(false);
    }
  };

  const addSet = async (workoutExerciseId: string, weightKg: number, reps: number) => {
    if (!currentWorkout) return;

    setLoading(true);
    try {
      const workoutExercise = currentWorkout.workout_exercises.find(we => we.id === workoutExerciseId);
      const setNumber = (workoutExercise?.sets.length || 0) + 1;

      const { data, error } = await supabase
        .from('sets')
        .insert({
          workout_exercise_id: workoutExerciseId,
          set_number: setNumber,
          weight_kg: weightKg,
          reps: reps,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentWorkout(prev => ({
        ...prev!,
        workout_exercises: prev!.workout_exercises.map(we =>
          we.id === workoutExerciseId
            ? { ...we, sets: [...we.sets, data as WorkoutSet] }
            : we
        )
      }));

      toast.success('Série ajoutée !');
    } catch (error) {
      console.error('Error adding set:', error);
      toast.error('Erreur lors de l\'ajout de la série');
    } finally {
      setLoading(false);
    }
  };

  const completeSet = async (setId: string) => {
    if (!currentWorkout) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sets')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', setId);

      if (error) throw error;

      setCurrentWorkout(prev => ({
        ...prev!,
        workout_exercises: prev!.workout_exercises.map(we => ({
          ...we,
          sets: we.sets.map(set =>
            set.id === setId
              ? { ...set, completed: true, completed_at: new Date().toISOString() }
              : set
          )
        }))
      }));

      toast.success('Série complétée !');
    } catch (error) {
      console.error('Error completing set:', error);
      toast.error('Erreur lors de la completion de la série');
    } finally {
      setLoading(false);
    }
  };

  const updateSet = async (setId: string, weightKg: number, reps: number) => {
    if (!currentWorkout) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sets')
        .update({
          weight_kg: weightKg,
          reps: reps
        })
        .eq('id', setId);

      if (error) throw error;

      setCurrentWorkout(prev => ({
        ...prev!,
        workout_exercises: prev!.workout_exercises.map(we => ({
          ...we,
          sets: we.sets.map(set =>
            set.id === setId
              ? { ...set, weight_kg: weightKg, reps: reps }
              : set
          )
        }))
      }));
    } catch (error) {
      console.error('Error updating set:', error);
      toast.error('Erreur lors de la mise à jour de la série');
    } finally {
      setLoading(false);
    }
  };

  const completeWorkout = async () => {
    if (!currentWorkout) return;

    setLoading(true);
    try {
      const startTime = new Date(currentWorkout.started_at);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // Calculate total volume
      const totalVolume = currentWorkout.workout_exercises.reduce((total, we) => {
        return total + we.sets.reduce((setTotal, set) => {
          return set.completed ? setTotal + (set.weight_kg * set.reps) : setTotal;
        }, 0);
      }, 0);

      const { error } = await supabase
        .from('workouts')
        .update({
          status: 'completed',
          completed_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          total_volume_kg: totalVolume,
          calories_burned: Math.round(durationMinutes * 8) // Simple estimation
        })
        .eq('id', currentWorkout.id);

      if (error) throw error;

      setCurrentWorkout(null);
      toast.success('Entraînement terminé !');
    } catch (error) {
      console.error('Error completing workout:', error);
      toast.error('Erreur lors de la completion de l\'entraînement');
    } finally {
      setLoading(false);
    }
  };

  return {
    currentWorkout,
    exercises,
    loading,
    startWorkout,
    addExerciseToWorkout,
    addSet,
    completeSet,
    updateSet,
    completeWorkout
  };
};