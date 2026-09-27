import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Crown, Flame, Shield, Users } from 'lucide-react';
import { useSubscription, PLAN_FEATURES, PLAN_PRICES } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { readFunctionError } from '@/lib/functionError';

// No yearly Stripe prices exist yet: enabling this without adding yearly
// prices to create-checkout would bill the monthly price.
const YEARLY_BILLING_ENABLED = false;

const Pricing = () => {
  const navigate = useNavigate();
  const { subscription, loading, isError, refreshSubscription } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [withdrawalWaiver, setWithdrawalWaiver] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Shield,
      description: 'Pour découvrir l\'app',
      monthlyPrice: 0,
      yearlyPrice: 0,
      paid: false,
      features: PLAN_FEATURES.free,
      cta: 'Gratuit',
    },
    {
      id: 'pro',
      name: 'Pro - Guerrier',
      icon: Flame,
      description: 'Pour les pratiquants réguliers',
      monthlyPrice: PLAN_PRICES.pro.monthly,
      yearlyPrice: PLAN_PRICES.pro.yearly,
      paid: true,
      features: PLAN_FEATURES.pro,
      cta: 'Passer à Pro',
      popular: true,
    },
    {
      id: 'elite',
      name: 'Elite - Compétiteur',
      icon: Crown,
      description: 'Pour les athlètes avancés',
      monthlyPrice: PLAN_PRICES.elite.monthly,
      yearlyPrice: PLAN_PRICES.elite.yearly,
      paid: true,
      features: PLAN_FEATURES.elite,
      cta: 'Passer à Elite',
    },
    {
      id: 'sensei',
      name: 'Senseï - Coach',
      icon: Users,
      description: 'Pour les coachs et clubs',
      monthlyPrice: PLAN_PRICES.sensei.monthly,
      yearlyPrice: PLAN_PRICES.sensei.yearly,
      paid: true,
      features: PLAN_FEATURES.sensei,
      cta: 'Passer à Senseï',
    },
  ];

  const handleSubscribe = async (paid: boolean, planId: string) => {
    if (!paid) {
      toast.info('Vous êtes déjà sur le plan gratuit');
      return;
    }

    if (planId === subscription?.plan) {
      toast.info('Vous êtes déjà sur ce plan');
      return;
    }

    if (!withdrawalWaiver) {
      toast.error("Cochez la demande d'accès immédiat avant de payer");
      document.getElementById('withdrawal-waiver')?.focus();
      return;
    }

    try {
      setLoadingCheckout(planId);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: planId, withdrawalWaiver: true }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      const { message } = await readFunctionError(error, 'Erreur lors de la création du paiement');
      toast.error(message);
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      const { message } = await readFunctionError(error, 'Erreur lors de l\'ouverture du portail client');
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  // Without the current plan, a paying member would see "free" as current and could pay twice.
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Impossible de charger votre abonnement.</p>
        <div className="flex gap-2">
          <Button onClick={() => void refreshSubscription()}>Réessayer</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Boostez vos performances avec l'IA
          </p>
          
          {YEARLY_BILLING_ENABLED && (
            <div className="flex items-center justify-center gap-4 mb-8">
              <Label htmlFor="billing-toggle" className={isYearly ? '' : 'font-semibold'}>
                Mensuel
              </Label>
              <Switch
                id="billing-toggle"
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <Label htmlFor="billing-toggle" className={isYearly ? 'font-semibold' : ''}>
                Annuel
                <Badge variant="secondary" className="ml-2">
                  -20%
                </Badge>
              </Label>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const isCurrentPlan = subscription?.plan === plan.id;

            return (
              <Card 
                key={plan.id}
                className={`relative liquid-glass backdrop-blur-md bg-card/40 transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular 
                    ? 'border-primary shadow-lg shadow-primary/20' 
                    : 'border-border/50'
                } ${isCurrentPlan ? 'border-accent ring-2 ring-accent/40' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground font-semibold shadow-md">Plus populaire</Badge>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-accent text-accent-foreground font-semibold shadow-md">Votre plan</Badge>
                  </div>
                )}



                <CardHeader className={plan.popular || isCurrentPlan ? 'pt-12' : ''}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-6 w-6 text-primary" />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{price}€</span>
                    {plan.id !== 'free' && (
                      <span className="text-muted-foreground">
                        /{isYearly ? 'an' : 'mois'}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.paid, plan.id)}
                    disabled={isCurrentPlan || loadingCheckout !== null}
                  >
                    {isCurrentPlan ? 'Plan actuel' : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 mx-auto max-w-2xl flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-4">
          <Checkbox
            id="withdrawal-waiver"
            checked={withdrawalWaiver}
            onCheckedChange={(checked) => setWithdrawalWaiver(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="withdrawal-waiver" className="text-sm font-normal leading-relaxed text-muted-foreground">
            Je demande l'accès immédiat à mon abonnement et je renonce expressément à mon droit de
            rétractation de 14 jours dès son activation. J'accepte les{' '}
            <Link to="/legal" className="underline text-foreground">conditions générales de vente</Link>.
          </Label>
        </div>

        {subscription && subscription.plan !== 'free' && (
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              onClick={handleManageSubscription}
            >
              Gérer mon abonnement
            </Button>
          </div>
        )}

        <div className="mt-12 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
