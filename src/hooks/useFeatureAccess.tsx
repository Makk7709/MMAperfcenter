import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';

// Configuration des fonctionnalités par plan (UI uniquement — la source de vérité est côté DB)
export const FEATURE_CONFIG = {
  ai_coach: {
    name: 'Coach IA',
    description: 'Conseils personnalisés par intelligence artificielle',
    limits: { free: 3, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'free' as const,
    counted: true,
  },
  barcode_scan: {
    name: 'Scan Code-barre',
    description: 'Scanner les produits alimentaires',
    limits: { free: 3, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'free' as const,
    counted: true,
  },
  sparring_analysis: {
    name: 'Analyse Sparring PRISM',
    description: 'Analyse vidéo de vos combats par IA',
    limits: { free: 3, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'free' as const,
    counted: true,
  },
  basic_training: {
    name: 'Entraînement basique',
    description: 'Suivi des séances d\'entraînement',
    limits: { free: -1, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'free' as const,
    counted: false,
  },
  hydration_log: {
    name: 'Journal hydratation',
    description: 'Suivi de votre hydratation',
    limits: { free: -1, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'free' as const,
    counted: false,
  },
  basic_stats: {
    name: 'Statistiques basiques',
    description: 'Visualisation de vos progrès',
    limits: { free: -1, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'free' as const,
    counted: false,
  },
  unlimited_ai: {
    name: 'Coach IA illimité',
    description: 'Accès illimité au coach IA',
    limits: { free: 0, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'pro' as const,
    counted: false,
  },
  full_macros: {
    name: 'Macros complets',
    description: 'Suivi nutritionnel détaillé',
    limits: { free: 0, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'pro' as const,
    counted: false,
  },
  full_journal: {
    name: 'Journal complet',
    description: 'Journal d\'entraînement avancé',
    limits: { free: 0, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'pro' as const,
    counted: false,
  },
  unlimited_scan: {
    name: 'Scan illimité',
    description: 'Scan de produits illimité',
    limits: { free: 0, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'pro' as const,
    counted: false,
  },
  ai_videos: {
    name: 'Vidéos IA',
    description: 'Bibliothèque vidéo premium',
    limits: { free: 0, pro: 0, elite: -1, sensei: -1 },
    minPlan: 'elite' as const,
    counted: false,
  },
  advanced_recovery: {
    name: 'Récupération avancée',
    description: 'Suivi de récupération et fatigue',
    limits: { free: 0, pro: 0, elite: -1, sensei: -1 },
    minPlan: 'elite' as const,
    counted: false,
  },
  advanced_nutrition: {
    name: 'Nutrition avancée',
    description: 'Analyse nutritionnelle approfondie',
    limits: { free: 0, pro: 0, elite: -1, sensei: -1 },
    minPlan: 'elite' as const,
    counted: false,
  },
  priority_support: {
    name: 'Support prioritaire',
    description: 'Assistance prioritaire',
    limits: { free: 0, pro: 0, elite: -1, sensei: -1 },
    minPlan: 'elite' as const,
    counted: false,
  },
  multi_athletes: {
    name: 'Multi-athlètes',
    description: 'Gestion de plusieurs profils athlètes',
    limits: { free: 0, pro: 0, elite: 0, sensei: -1 },
    minPlan: 'sensei' as const,
    counted: false,
  },
  team_dashboard: {
    name: 'Tableau de bord équipe',
    description: 'Statistiques collectives',
    limits: { free: 0, pro: 0, elite: 0, sensei: -1 },
    minPlan: 'sensei' as const,
    counted: false,
  },
  collective_tracking: {
    name: 'Suivi collectif',
    description: 'Suivi IA pour toute l\'équipe',
    limits: { free: 0, pro: 0, elite: 0, sensei: -1 },
    minPlan: 'sensei' as const,
    counted: false,
  },
  pdf_export: {
    name: 'Export PDF',
    description: 'Export des rapports en PDF',
    limits: { free: 0, pro: 0, elite: 0, sensei: -1 },
    minPlan: 'sensei' as const,
    counted: false,
  },
} as const;

export type FeatureKey = keyof typeof FEATURE_CONFIG;
export type PlanType = 'free' | 'pro' | 'elite' | 'sensei';

export const PLAN_INFO: Record<PlanType, { name: string; price: string; cta: string }> = {
  free: { name: 'Découverte', price: 'Gratuit', cta: 'Plan actuel' },
  pro: { name: 'Guerrier', price: '14,90€/mois', cta: 'Passer Pro' },
  elite: { name: 'Compétiteur', price: '29,90€/mois', cta: 'Devenir Elite' },
  sensei: { name: 'Senseï', price: '69€/mois', cta: 'Devenir Coach' },
};

export interface FeatureAccessResult {
  hasAccess: boolean;
  currentUsage: number;
  limit: number;
  isUnlimited: boolean;
  remainingUsage: number;
  requiredPlan: PlanType;
  privileged?: boolean;
}

export const useFeatureAccess = () => {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, isCoach, isLoading: rolesLoading } = useUserRole();
  const [usageCache, setUsageCache] = useState<Record<string, number>>({});

  const isPrivileged = isAdmin || isCoach;
  const currentPlan: PlanType = isPrivileged
    ? 'sensei'
    : ((subscription?.plan as PlanType) || 'free');

  const getFeatureUsage = useCallback(async (feature: FeatureKey): Promise<number> => {
    if (!user) return 0;
    if (usageCache[feature] !== undefined) return usageCache[feature];

    const { data, error } = await supabase.rpc('get_feature_usage', {
      _user_id: user.id,
      _feature_name: feature,
    });
    if (error) {
      console.error('get_feature_usage error', error);
      return 0;
    }
    const usage = data || 0;
    setUsageCache(prev => ({ ...prev, [feature]: usage }));
    return usage;
  }, [user, usageCache]);

  const incrementUsage = useCallback(async (feature: FeatureKey): Promise<number> => {
    if (!user) return 0;
    const { data, error } = await supabase.rpc('increment_feature_usage', {
      _user_id: user.id,
      _feature_name: feature,
    });
    if (error) {
      console.error('increment_feature_usage error', error);
      return 0;
    }
    const newUsage = data || 0;
    setUsageCache(prev => ({ ...prev, [feature]: newUsage }));
    return newUsage;
  }, [user]);

  const checkAccess = useCallback(async (feature: FeatureKey): Promise<FeatureAccessResult> => {
    const config = FEATURE_CONFIG[feature];
    const requiredPlan = config.minPlan;

    // Bypass total pour admin/coach
    if (isPrivileged) {
      return { hasAccess: true, currentUsage: 0, limit: -1, isUnlimited: true, remainingUsage: -1, requiredPlan, privileged: true };
    }

    // Source de vérité = DB
    if (user) {
      const { data, error } = await supabase.rpc('has_feature_access', {
        _user_id: user.id,
        _feature: feature,
      });
      if (!error && typeof data === 'boolean') {
        const limit = config.limits[currentPlan];
        const isUnlimited = limit === -1;
        let currentUsage = 0;
        let remainingUsage = isUnlimited ? -1 : Math.max(0, limit);
        if (config.counted && !isUnlimited && limit > 0) {
          currentUsage = await getFeatureUsage(feature);
          remainingUsage = Math.max(0, limit - currentUsage);
        }
        return { hasAccess: data, currentUsage, limit, isUnlimited, remainingUsage, requiredPlan };
      }
    }

    // Fallback local si RPC indisponible
    const limit = config.limits[currentPlan];
    const isUnlimited = limit === -1;
    if (isUnlimited) return { hasAccess: true, currentUsage: 0, limit: -1, isUnlimited: true, remainingUsage: -1, requiredPlan };
    if (limit === 0) return { hasAccess: false, currentUsage: 0, limit: 0, isUnlimited: false, remainingUsage: 0, requiredPlan };
    if (config.counted) {
      const currentUsage = await getFeatureUsage(feature);
      return { hasAccess: currentUsage < limit, currentUsage, limit, isUnlimited: false, remainingUsage: Math.max(0, limit - currentUsage), requiredPlan };
    }
    return { hasAccess: true, currentUsage: 0, limit: -1, isUnlimited: true, remainingUsage: -1, requiredPlan };
  }, [user, currentPlan, getFeatureUsage, isPrivileged]);

  const runFeatureWithTracking = useCallback(async (feature: FeatureKey): Promise<{ allowed: boolean; newUsage: number; access: FeatureAccessResult }> => {
    const access = await checkAccess(feature);
    if (!access.hasAccess) return { allowed: false, newUsage: access.currentUsage, access };

    const config = FEATURE_CONFIG[feature];
    if (!access.privileged && config.counted && !access.isUnlimited) {
      const newUsage = await incrementUsage(feature);
      return { allowed: true, newUsage, access };
    }
    return { allowed: true, newUsage: access.currentUsage, access };
  }, [checkAccess, incrementUsage]);

  const clearUsageCache = useCallback(() => setUsageCache({}), []);

  return {
    currentPlan,
    isPrivileged,
    loading: subscriptionLoading || rolesLoading,
    checkAccess,
    runFeatureWithTracking,
    getFeatureUsage,
    clearUsageCache,
    FEATURE_CONFIG,
    PLAN_INFO,
  };
};
