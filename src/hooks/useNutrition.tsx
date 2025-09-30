import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface NutritionLog {
  id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface NutritionGoals {
  id?: string;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
}

export const useNutrition = () => {
  const { user } = useAuth();
  const [todayLogs, setTodayLogs] = useState<NutritionLog[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>({
    daily_calories: 2000,
    daily_protein_g: 150,
    daily_carbs_g: 250,
    daily_fat_g: 70,
  });
  const [loading, setLoading] = useState(false);

  // Load today's nutrition logs
  useEffect(() => {
    if (!user) return;

    const loadTodayLogs = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading nutrition logs:', error);
        return;
      }

      setTodayLogs((data || []) as NutritionLog[]);
    };

    loadTodayLogs();
  }, [user]);

  // Load nutrition goals
  useEffect(() => {
    if (!user) return;

    const loadGoals = async () => {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading nutrition goals:', error);
        return;
      }

      if (data) {
        setGoals({
          id: data.id,
          daily_calories: data.daily_calories,
          daily_protein_g: data.daily_protein_g,
          daily_carbs_g: data.daily_carbs_g,
          daily_fat_g: data.daily_fat_g,
        });
      }
    };

    loadGoals();
  }, [user]);

  const addNutritionLog = async (log: Omit<NutritionLog, 'id'>) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert({
          user_id: user.id,
          ...log,
        })
        .select()
        .single();

      if (error) throw error;

      setTodayLogs(prev => [...prev, data as NutritionLog]);
      toast.success('Aliment ajouté !');
    } catch (error) {
      console.error('Error adding nutrition log:', error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const deleteNutritionLog = async (id: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTodayLogs(prev => prev.filter(log => log.id !== id));
      toast.success('Aliment supprimé !');
    } catch (error) {
      console.error('Error deleting nutrition log:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const updateGoals = async (newGoals: Omit<NutritionGoals, 'id'>) => {
    if (!user) return;

    setLoading(true);
    try {
      if (goals.id) {
        // Update existing goals
        const { error } = await supabase
          .from('nutrition_goals')
          .update(newGoals)
          .eq('id', goals.id);

        if (error) throw error;
      } else {
        // Create new goals
        const { data, error } = await supabase
          .from('nutrition_goals')
          .insert({
            user_id: user.id,
            ...newGoals,
          })
          .select()
          .single();

        if (error) throw error;
        setGoals({ id: data.id, ...newGoals });
      }

      setGoals(prev => ({ ...prev, ...newGoals }));
      toast.success('Objectifs mis à jour !');
    } catch (error) {
      console.error('Error updating nutrition goals:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const getTodayTotals = () => {
    return todayLogs.reduce(
      (totals, log) => ({
        calories: totals.calories + log.calories,
        protein: totals.protein + Number(log.protein_g),
        carbs: totals.carbs + Number(log.carbs_g),
        fat: totals.fat + Number(log.fat_g),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  return {
    todayLogs,
    goals,
    loading,
    addNutritionLog,
    deleteNutritionLog,
    updateGoals,
    getTodayTotals,
  };
};
