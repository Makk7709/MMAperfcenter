import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: [
    '3 plannings IA par mois',
    'Scan code-barres limité',
    'Journal d\'hydratation basique',
  ],
  pro: [
    'Plannings IA illimités',
    'Calcul macros & repas automatique',
    'Scan code-barres illimité',
    'Journal complet',
    'Statistiques avancées',
  ],
  elite: [
    'Tout du plan Pro',
    'Vidéos explicatives IA',
    'Analyse nutrition avancée',
    'Suivi récupération',
    'Support IA prioritaire',
  ],
  sensei: [
    'Tout du plan Elite',
    'Gestion multi-athlètes',
    'Statistiques collectif',
    'Export PDF',
    'IA de suivi collectif',
  ],
};

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
    queryFn: async (): Promise<Subscription | null> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        toast.error('Erreur lors du chargement de l\'abonnement');
        return null;
      }

      // La ligne est créée par le trigger d'inscription ; les écritures client
      // sur subscriptions sont interdites. En son absence, on affiche le plan free.
      return (data as Subscription | null) ?? { id: '', user_id: user!.id, plan: 'free', status: 'active' };
    },
  });

  const { refetch } = query;
  const refreshSubscription = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    subscription: query.data ?? null,
    loading: query.isLoading,
    isPaid: isPaidSubscription(query.data),
    refreshSubscription,
  };
};
