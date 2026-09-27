import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { trainingProgressKey } from './useTraining';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  weight: number | null;
  height: number | null;
  fitness_level: string | null;
  martial_arts_discipline: string | null;
  goals: string[] | null;

  // Physique avancé
  body_fat_percent: number | null;
  waist_cm: number | null;
  morphotype: string | null;
  handedness: string | null;
  injuries: string[] | null;

  // Expérience martiale
  years_practice: number | null;
  belt_rank: string | null;
  secondary_disciplines: string[] | null;
  competition_level: string | null;
  competitions_count: number | null;

  // Objectifs SMART
  primary_goal: string | null;
  goal_deadline: string | null;
  target_event: string | null;

  // Lifestyle & récupération
  sleep_hours: number | null;
  stress_level: number | null;
  weekly_availability: number | null;
  preferred_session_duration: number | null;
  training_location: string | null;
  equipment: string[] | null;
  dietary_restrictions: string[] | null;

  created_at: string;
  updated_at: string;
}

// Stored as slugs in profiles.martial_arts_discipline / secondary_disciplines.
export const disciplineOptions = [
  { value: "mma", label: "MMA" },
  { value: "boxe", label: "Boxe Anglaise" },
  { value: "muay-thai", label: "Muay Thai" },
  { value: "kickboxing", label: "Kickboxing" },
  { value: "jiu-jitsu", label: "Jiu-Jitsu Brésilien" },
  { value: "judo", label: "Judo" },
  { value: "karate", label: "Karaté" },
  { value: "taekwondo", label: "Taekwondo" },
  { value: "lutte", label: "Lutte" },
  { value: "krav-maga", label: "Krav Maga" },
  { value: "autre", label: "Autre discipline" },
];

export const disciplineLabel = (slug: string | null | undefined): string =>
  disciplineOptions.find((d) => d.value === slug)?.label ?? slug ?? "";

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as unknown as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Profil mis à jour avec succès');
      void queryClient.invalidateQueries({ queryKey: trainingProgressKey(user?.id) });
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile: fetchProfile,
  };
};
