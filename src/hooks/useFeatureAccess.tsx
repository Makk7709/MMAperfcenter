import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

// Configuration des fonctionnalités par plan
export const FEATURE_CONFIG = {
  // Fonctionnalités Free avec limites
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
    name: 'Analyse Sparring IA',
    description: 'Analyse vidéo de vos combats par IA',
    limits: { free: 3, pro: -1, elite: -1, sensei: -1 },
    minPlan: 'free' as const,
    counted: true,
  },
  
  // Fonctionnalités Free illimitées
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

  // Fonctionnalités PRO+
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

  // Fonctionnalités ELITE+
  ai_videos: {
    name: 'Vidéos IA',
    description: 'Bibliothèque vidéo premium avec analyse IA',
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
    description: 'Assistance prioritaire par l\'équipe KOREV',
    limits: { free: 0, pro: 0, elite: -1, sensei: -1 },
    minPlan: 'elite' as const,
    counted: false,
  },

  // Fonctionnalités SENSEI exclusives
  multi_athletes: {
    name: 'Multi-athlètes',
    description: 'Gestion de plusieurs profils athlètes',
    limits: { free: 0, pro: 0, elite: 0, sensei: -1 },
    minPlan: 'sensei' as const,
    counted: false,
  },
  team_dashboard: {
    name: 'Tableau de bord équipe',
    description: 'Statistiques collectives et comparaisons',
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
    description: 'Export des rapports et programmes en PDF',
    limits: { free: 0, pro: 0, elite: 0, sensei: -1 },
    minPlan: 'sensei' as const,
    counted: false,
  },
} as const;

export type FeatureKey = keyof typeof FEATURE_CONFIG;
export type PlanType = 'free' | 'pro' | 'elite' | 'sensei';

// Infos sur les plans pour le paywall
export const PLAN_INFO: Record<PlanType, { name: string; price: string; cta: string }> = {
  free: { name: 'Découverte', price: 'Gratuit', cta: 'Plan actuel' },
  pro: { name: 'Guerrier', price: '14,90€/mois', cta: 'Passer Pro' },
  elite: { name: 'Compétiteur', price: '29,90€/mois', cta: 'Devenir Elite' },
  sensei: { name: 'Senseï', price: '69€/mois', cta: 'Devenir Coach' },
};

interface FeatureAccessResult {
  hasAccess: boolean;
  currentUsage: number;
  limit: number;
  isUnlimited: boolean;
  remainingUsage: number;
  requiredPlan: PlanType;
}

export const useFeatureAccess = () => {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [usageCache, setUsageCache] = useState<Record<string, number>>({});

  const currentPlan: PlanType = (subscription?.plan as PlanType) || 'free';

  const getFeatureUsage = useCallback(async (feature: FeatureKey): Promise<number> => {
    if (!user) return 0;
    
    // Check cache first
    if (usageCache[feature] !== undefined) {
      return usageCache[feature];
    }

    const { data, error } = await supabase.rpc('get_feature_usage', {
      _user_id: user.id,
      _feature_name: feature,
    });

    if (error) {
      console.error('Error fetching feature usage:', error);
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
      console.error('Error incrementing feature usage:', error);
      return 0;
    }

    const newUsage = data || 0;
    setUsageCache(prev => ({ ...prev, [feature]: newUsage }));
    return newUsage;
  }, [user]);

  const checkAccess = useCallback(async (feature: FeatureKey): Promise<FeatureAccessResult> => {
    const config = FEATURE_CONFIG[feature];
    const limit = config.limits[currentPlan];
    const isUnlimited = limit === -1;
    const requiredPlan = config.minPlan;

    // Si le plan actuel est suffisant et illimité
    if (isUnlimited) {
      return {
        hasAccess: true,
        currentUsage: 0,
        limit: -1,
        isUnlimited: true,
        remainingUsage: -1,
        requiredPlan,
      };
    }

    // Si aucun accès avec ce plan
    if (limit === 0) {
      return {
        hasAccess: false,
        currentUsage: 0,
        limit: 0,
        isUnlimited: false,
        remainingUsage: 0,
        requiredPlan,
      };
    }

    // Vérifier l'usage actuel pour les fonctionnalités comptées
    if (config.counted) {
      const currentUsage = await getFeatureUsage(feature);
      const remainingUsage = Math.max(0, limit - currentUsage);
      
      return {
        hasAccess: currentUsage < limit,
        currentUsage,
        limit,
        isUnlimited: false,
        remainingUsage,
        requiredPlan,
      };
    }

    // Accès illimité par défaut pour les non-comptées
    return {
      hasAccess: true,
      currentUsage: 0,
      limit: -1,
      isUnlimited: true,
      remainingUsage: -1,
      requiredPlan,
    };
  }, [currentPlan, getFeatureUsage]);

  const useFeatureWithTracking = useCallback(async (feature: FeatureKey): Promise<{ allowed: boolean; newUsage: number }> => {
    const access = await checkAccess(feature);
    
    if (!access.hasAccess) {
      return { allowed: false, newUsage: access.currentUsage };
    }

    // Si c'est une fonctionnalité comptée, incrémenter l'usage
    const config = FEATURE_CONFIG[feature];
    if (config.counted && !access.isUnlimited) {
      const newUsage = await incrementUsage(feature);
      return { allowed: true, newUsage };
    }

    return { allowed: true, newUsage: access.currentUsage };
  }, [checkAccess, incrementUsage]);

  const clearUsageCache = useCallback(() => {
    setUsageCache({});
  }, []);

  return {
    currentPlan,
    loading: subscriptionLoading,
    checkAccess,
    useFeatureWithTracking,
    getFeatureUsage,
    clearUsageCache,
    FEATURE_CONFIG,
    PLAN_INFO,
  };
};
