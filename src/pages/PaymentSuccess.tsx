import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { isPaidSubscription, useSubscription } from '@/hooks/useSubscription';

// The Stripe webhook can land a few seconds after the redirect.
const SYNC_ATTEMPTS = 3;
const SYNC_DELAY_MS = 2500;

type SyncState = 'syncing' | 'active' | 'pending';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function PaymentSuccess() {
  const { subscription, refreshSubscription } = useSubscription();
  const [state, setState] = useState<SyncState>('syncing');

  const sync = useCallback(async (stale: () => boolean) => {
    setState('syncing');
    for (let attempt = 1; attempt <= SYNC_ATTEMPTS; attempt++) {
      const { error } = await supabase.functions.invoke('check-subscription');
      if (error) console.error('check-subscription failed', error);
      const synced = await refreshSubscription();
      if (stale()) return;
      if (isPaidSubscription(synced)) {
        setState('active');
        return;
      }
      if (attempt < SYNC_ATTEMPTS) await wait(SYNC_DELAY_MS);
      if (stale()) return;
    }
    setState('pending');
  }, [refreshSubscription]);

  useEffect(() => {
    let cancelled = false;
    void sync(() => cancelled);
    return () => { cancelled = true; };
  }, [sync]);

  const syncing = state === 'syncing';
  const active = state === 'active';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full border-primary/30 bg-card/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {syncing && <Loader2 className="h-8 w-8 text-primary animate-spin" />}
            {active && <CheckCircle2 className="h-10 w-10 text-primary" />}
            {state === 'pending' && <Clock className="h-8 w-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl">
            {active ? 'Paiement confirmé !' : 'Activation en cours…'}
          </CardTitle>
          <CardDescription>
            {syncing && 'Nous synchronisons votre abonnement.'}
            {active && 'Merci pour votre confiance. Votre abonnement est actif.'}
            {state === 'pending' &&
              "Votre paiement est en cours de traitement. L'activation peut prendre quelques minutes : réessayez dans un instant."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {active && subscription && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Crown className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wide text-sm">
                Plan {subscription.plan}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2">
            {state === 'pending' && (
              <Button onClick={() => void sync(() => false)}>Réessayer</Button>
            )}
            <Button asChild variant={state === 'pending' ? 'outline' : 'default'}>
              <Link to="/">Accéder à mon espace</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/pricing">Voir mon plan</Link>
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground pt-2">
            Un reçu vous sera envoyé par email par Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
