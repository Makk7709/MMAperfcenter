import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Crown, Flame, Shield, Users } from 'lucide-react';
import { useSubscription, PLAN_FEATURES, PLAN_PRICES } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Pricing = () => {
  const navigate = useNavigate();
  const { subscription, loading } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Shield,
      description: 'Pour découvrir l\'app',
      monthlyPrice: 0,
      yearlyPrice: 0,
      priceId: null,
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
      priceId: 'price_1SQSL1DLrTr0qdOpfIx50iSu',
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
      priceId: 'price_1SQSLMDLrTr0qdOpffTBpoJL',
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
      priceId: 'price_1SQSM0DLrTr0qdOpYtZFR50d',
      features: PLAN_FEATURES.sensei,
      cta: 'Passer à Senseï',
    },
  ];

  const handleSubscribe = async (priceId: string | null, planId: string) => {
    if (!priceId) {
      toast.info('Vous êtes déjà sur le plan gratuit');
      return;
    }

    if (planId === subscription?.plan) {
      toast.info('Vous êtes déjà sur ce plan');
      return;
    }

    try {
      setLoadingCheckout(planId);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Erreur lors de l\'ouverture du portail client');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
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
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <Label htmlFor="billing-toggle" className={!isYearly ? 'font-semibold' : ''}>
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
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground font-semibold shadow-md">Plus populaire</Badge>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4 z-10">
                    <Badge className="bg-accent text-accent-foreground font-semibold shadow-md">Votre plan</Badge>
                  </div>
                )}


                <CardHeader>
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
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
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
                    onClick={() => handleSubscribe(plan.priceId, plan.id)}
                    disabled={isCurrentPlan || loadingCheckout === plan.id}
                  >
                    {isCurrentPlan ? 'Plan actuel' : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {subscription?.plan !== 'free' && (
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
