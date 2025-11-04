import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionPlan = 'free' | 'pro' | 'elite' | 'sensei';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasFeatureAccess = (feature: string): boolean => {
    if (!subscription) return false;

    const plan = subscription.plan;

    // Free plan features
    if (plan === 'free') {
      return ['basic_training', 'hydration_log', 'limited_scan'].includes(feature);
    }

    // Pro plan features
    if (plan === 'pro') {
      return !['ai_videos', 'advanced_recovery', 'priority_support', 'multi_athletes'].includes(feature);
    }

    // Elite plan features
    if (plan === 'elite') {
      return !['multi_athletes', 'collective_tracking', 'pdf_export'].includes(feature);
    }

    // Sensei plan has all features
    if (plan === 'sensei') {
      return true;
    }

    return false;
  };

  return {
    subscription,
    loading,
    refreshSubscription: fetchSubscription,
    hasFeatureAccess,
    isPro: subscription?.plan === 'pro' || subscription?.plan === 'elite' || subscription?.plan === 'sensei',
    isElite: subscription?.plan === 'elite' || subscription?.plan === 'sensei',
    isSensei: subscription?.plan === 'sensei',
    currentPlan: subscription?.plan || 'free',
  };
};
