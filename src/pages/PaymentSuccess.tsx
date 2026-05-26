import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { subscription, refetch } = useSubscription();
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        // Forcer la synchro côté serveur via Stripe
        await supabase.functions.invoke('check-subscription');
      } catch (e) {
        console.error('check-subscription failed', e);
      } finally {
        if (!cancelled) {
          await refetch?.();
          setSyncing(false);
        }
      }
    };
    sync();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full border-primary/30 bg-card/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {syncing ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {syncing ? 'Activation en cours…' : 'Paiement confirmé !'}
          </CardTitle>
          <CardDescription>
            {syncing
              ? 'Nous synchronisons votre abonnement.'
              : 'Merci pour votre confiance. Votre abonnement est actif.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!syncing && subscription?.plan && subscription.plan !== 'free' && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Crown className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wide text-sm">
                Plan {subscription.plan}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate('/')} disabled={syncing}>
              Accéder à mon espace
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
