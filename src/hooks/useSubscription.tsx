import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionPlan = 'free' | 'pro' | 'elite' | 'sensei';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

// Every line of a plan on sale is a commitment: it must match what the app
// and the server quotas actually deliver.
export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: [
    '3 échanges avec le coach IA par mois',
    '3 analyses sparring PRISM par mois',
    '3 scans code-barres par mois',
    'Journal d\'entraînement et suivi nutritionnel',
    'Tableau de performance',
  ],
  pro: [
    'Tout du plan Free',
    'Coach IA illimité *',
    'Analyses sparring PRISM illimitées *',
    'Scan code-barres illimité',
    'Analyse IA de tes statistiques et idées de repas *',
  ],
  elite: [
    'Tout du plan Pro',
    'Suivi de la récupération',
    'Analyse nutritionnelle avancée',
    'Réponses IA prioritaires',
    'Vidéos techniques commentées',
  ],
  sensei: [
    'Tout du plan Pro',
    'Suivi de 10 athlètes, avec leur accord',
    'Statistiques collectives',
    'Export PDF des rapports athlètes',
    'Synthèse IA de ton groupe',
  ],
};

/** Plans that can be bought today; the others are announced as coming soon. */
export const PLANS_ON_SALE: ReadonlySet<SubscriptionPlan> = new Set<SubscriptionPlan>(['pro']);

/** Server-side daily caps behind the "illimité" (*) lines. */
export const FAIR_USE_NOTE =
  '* Usage raisonnable : jusqu\'à 200 messages au coach IA et 20 analyses PRISM par jour.';

export const PLAN_PRICES = {
  pro: { monthly: 14.90, yearly: 119 },
  elite: { monthly: 29.90, yearly: 239 },
  sensei: { monthly: 69, yearly: 699 },
};

const PAID_STATUSES = new Set(['active', 'trialing']);

export const isPaidSubscription = (subscription: Subscription | null | undefined): boolean =>
  !!subscription && subscription.plan !== 'free' && PAID_STATUSES.has(subscription.status);

// Shared through react-query: every header and page reads the same cached row.
export const useSubscription = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    retry: 2,
    queryFn: async (): Promise<Subscription> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        throw error;
      }

      // La ligne est créée par le trigger d'inscription ; les écritures client
      // sur subscriptions sont interdites. En son absence, on affiche le plan free.
      return (data as Subscription | null) ?? { id: '', user_id: user!.id, plan: 'free', status: 'active' };
    },
  });

  const { refetch } = query;
  const refreshSubscription = useCallback(async (): Promise<Subscription | null> => {
    const { data } = await refetch();
    return data ?? null;
  }, [refetch]);

  return {
    // null while loading or after a failed load: not the same as the free plan.
    subscription: query.data ?? null,
    loading: query.isLoading,
    isError: query.isError && !query.data,
    isKnown: query.data !== undefined,
    isPaid: isPaidSubscription(query.data),
    refreshSubscription,
  };
};
