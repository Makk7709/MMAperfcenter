/**
 * useGamification Hook
 * 
 * Manages the Wolf Pack gamification state across the app:
 * - XP tracking and rank calculation
 * - Badge unlocking
 * - Streak management
 * - Workout session summaries
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateRank,
  getNextRank,
  calculateXPForAction,
  checkBadgeUnlock,
  calculateStreak,
  getMotivationalMessage,
  getRankUpMessage,
  WOLF_RANKS,
  type WolfRank,
  type WolfBadge,
  type ActionType,
} from '@/utils/gamification/wolfPack';
import { type SessionSummary } from '@/utils/gamification/wolfTracking';
import { useToast } from './use-toast';

// ============================================
// TYPES
// ============================================

export interface GamificationState {
  totalXP: number;
  currentRank: WolfRank;
  nextRank: WolfRank | null;
  unlockedBadges: string[];
  streakDays: number;
  totalWorkouts: number;
  loading: boolean;
}

export interface GamificationActions {
  addXP: (action: ActionType, options?: { streakDays?: number; intensity?: 'light' | 'moderate' | 'intense' }) => Promise<number>;
  checkAndUnlockBadges: () => Promise<WolfBadge[]>;
  recordWorkout: (summary: SessionSummary) => Promise<void>;
  refreshStats: () => Promise<void>;
}

interface GamificationContextValue extends GamificationState, GamificationActions {}

// ============================================
// CONTEXT
// ============================================

const GamificationContext = createContext<GamificationContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<GamificationState>({
    totalXP: 0,
    currentRank: WOLF_RANKS[0],
    nextRank: WOLF_RANKS[1],
    unlockedBadges: [],
    streakDays: 0,
    totalWorkouts: 0,
    loading: true,
  });

  // Fetch user gamification data from Supabase
  const fetchGamificationData = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Fetch workout data for streak and count calculation
      const { data: workouts } = await supabase
        .from('workouts')
        .select('created_at, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100);

      // Calculate totals from workouts
      const totalWorkouts = workouts?.length || 0;
      
      // Use localStorage for XP and badges (no DB columns exist)
      const storedXP = localStorage.getItem(`gamification_xp_${user.id}`);
      const storedBadges = localStorage.getItem(`gamification_badges_${user.id}`);
      
      const totalXP = storedXP ? Number.parseInt(storedXP, 10) : 0;
      const unlockedBadges = storedBadges ? JSON.parse(storedBadges) : [];

      // Calculate streak from workout dates
      const workoutDates = workouts?.map(w => w.created_at.split('T')[0]) || [];
      const streakDays = calculateStreak(workoutDates);

      // Calculate rank
      const currentRank = calculateRank(totalXP);
      const nextRank = getNextRank(currentRank);

      setState({
        totalXP,
        currentRank,
        nextRank,
        unlockedBadges,
        streakDays,
        totalWorkouts,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  // Add XP and check for rank up
  const addXP = useCallback(async (
    action: ActionType,
    options?: { streakDays?: number; intensity?: 'light' | 'moderate' | 'intense' }
  ): Promise<number> => {
    if (!user) return 0;

    const xpGained = calculateXPForAction(action, {
      streakDays: options?.streakDays || state.streakDays,
      intensity: options?.intensity,
    });

    const newTotalXP = state.totalXP + xpGained;
    const newRank = calculateRank(newTotalXP);
    const rankChanged = newRank.level > state.currentRank.level;

    // Update in localStorage (no DB column for XP)
    try {
      localStorage.setItem(`gamification_xp_${user.id}`, newTotalXP.toString());

      setState(prev => ({
        ...prev,
        totalXP: newTotalXP,
        currentRank: newRank,
        nextRank: getNextRank(newRank),
      }));

      // Show rank up toast
      if (rankChanged) {
        toast({
          title: "🐺 Nouveau Rang !",
          description: getRankUpMessage(newRank),
          duration: 5000,
        });
      }

      return xpGained;
    } catch (error) {
      console.error('Error adding XP:', error);
      return 0;
    }
  }, [user, state.totalXP, state.currentRank, state.streakDays, toast]);

  // Check and unlock badges
  const checkAndUnlockBadges = useCallback(async (): Promise<WolfBadge[]> => {
    if (!user) return [];

    const userStats = {
      totalWorkouts: state.totalWorkouts,
      streakDays: state.streakDays,
      totalXP: state.totalXP,
    };

    const newBadges = checkBadgeUnlock(userStats, state.unlockedBadges);

    if (newBadges.length > 0) {
      const newBadgeIds = [...state.unlockedBadges, ...newBadges.map(b => b.id)];

      try {
        // Store badges in localStorage (no DB column exists)
        localStorage.setItem(`gamification_badges_${user.id}`, JSON.stringify(newBadgeIds));

        setState(prev => ({
          ...prev,
          unlockedBadges: newBadgeIds,
        }));

        // Show badge unlocked toast for each badge
        newBadges.forEach(badge => {
          toast({
            title: `${badge.icon} Badge Débloqué !`,
            description: `${badge.name}: ${badge.description}`,
            duration: 5000,
          });
        });
      } catch (error) {
        console.error('Error unlocking badges:', error);
      }
    }

    return newBadges;
  }, [user, state.totalWorkouts, state.streakDays, state.totalXP, state.unlockedBadges, toast]);

  // Record a completed workout
  const recordWorkout = useCallback(async (_summary: SessionSummary) => {
    if (!user) return;

    try {
      // Update total workouts (count from actual workouts, no need to store separately)
      const newTotalWorkouts = state.totalWorkouts + 1;

      setState(prev => ({
        ...prev,
        totalWorkouts: newTotalWorkouts,
      }));

      // Add XP for workout
      await addXP('workout_completed', { intensity: 'moderate' });

      // Check for new badges
      await checkAndUnlockBadges();

      // Show motivational message
      toast({
        title: "🐺 Chasse Terminée !",
        description: getMotivationalMessage(),
        duration: 4000,
      });
    } catch (error) {
      console.error('Error recording workout:', error);
    }
  }, [user, state.totalWorkouts, addXP, checkAndUnlockBadges, toast]);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await fetchGamificationData();
  }, [fetchGamificationData]);

  const contextValue: GamificationContextValue = {
    ...state,
    addXP,
    checkAndUnlockBadges,
    recordWorkout,
    refreshStats,
  };

  return (
    <GamificationContext.Provider value={contextValue}>
      {children}
    </GamificationContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

export default useGamification;

