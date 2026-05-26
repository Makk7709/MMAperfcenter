import { useState, useCallback } from 'react';
import { useFeatureAccess, FeatureKey } from './useFeatureAccess';

/**
 * Hook helper qui combine la vérification d'accès et l'affichage du paywall.
 * Usage:
 *   const { gate, Paywall } = useFeatureGate('ai_coach');
 *   const ok = await gate(); if (!ok) return;
 *   ... action ...
 *   Puis monter <Paywall /> dans le JSX.
 */
export const useFeatureGate = (feature: FeatureKey) => {
  const { useFeatureWithTracking } = useFeatureAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const gate = useCallback(async (): Promise<boolean> => {
    const { allowed } = await useFeatureWithTracking(feature);
    if (!allowed) {
      setPaywallOpen(true);
      return false;
    }
    return true;
  }, [useFeatureWithTracking, feature]);

  return { gate, paywallOpen, setPaywallOpen };
};
