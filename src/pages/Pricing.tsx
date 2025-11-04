import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PricingCard } from "@/components/PricingCard";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Pour découvrir l\'application',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '3 plannings IA par mois',
      'Scan codes-barres limité',
      'Journal d\'hydratation simple',
      'Accès aux exercices de base'
    ]
  },
  {
    id: 'pro',
    name: 'Pro (Guerrier)',
    description: 'Pour les pratiquants réguliers',
    monthlyPrice: 14.90,
    yearlyPrice: 119,
    isPopular: true,
    features: [
      'Plannings IA illimités',
      'Calcul macros & suggestions repas',
      'Scan codes-barres illimité',
      'Journal d\'entraînement complet',
      'Statistiques avancées',
      'Support standard'
    ]
  },
  {
    id: 'elite',
    name: 'Elite (Compétiteur)',
    description: 'Pour les athlètes avancés',
    monthlyPrice: 29.90,
    yearlyPrice: 239,
    features: [
      'Tout du plan Pro',
      'Vidéos d\'entraînement IA',
      'Analyse récupération avancée',
      'Nutrition avancée',
      'Support IA prioritaire',
      'Conseils personnalisés'
    ]
  },
  {
    id: 'sensei',
    name: 'Senseï (Coach/Club)',
    description: 'Pour les coachs et clubs',
    monthlyPrice: 69,
    yearlyPrice: 699,
    features: [
      'Tout du plan Elite',
      'Gestion multi-athlètes',
      'Statistiques collectives',
      'Export PDF professionnel',
      'IA de suivi collectif',
      'Support prioritaire dédié'
    ]
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const { currentPlan } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async (planId: string, price: number) => {
    if (price === 0) {
      toast.info("Vous êtes déjà sur le plan gratuit");
      return;
    }

    try {
      toast.loading("Redirection vers le paiement...");
      
      // TODO: Implement Stripe checkout
      toast.info("Intégration Stripe à venir");
      
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error("Erreur lors de la création de la session de paiement");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Trouvez le plan parfait pour atteindre vos objectifs
          </p>

          <Tabs
            value={billingPeriod}
            onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}
            className="inline-block"
          >
            <TabsList>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly">
                Annuel
                <span className="ml-2 text-xs text-primary">(Économisez jusqu'à 20%)</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              description={plan.description}
              monthlyPrice={plan.monthlyPrice}
              yearlyPrice={plan.yearlyPrice}
              isPopular={plan.isPopular}
              features={plan.features}
              onSubscribe={() => handleSubscribe(
                plan.id,
                billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
              )}
              isCurrentPlan={currentPlan === plan.id}
              billingPeriod={billingPeriod}
            />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Questions fréquentes
          </h2>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            <div>
              <h3 className="font-semibold mb-2">Puis-je changer de plan à tout moment ?</h3>
              <p className="text-muted-foreground">
                Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. 
                Les changements prennent effet immédiatement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Comment fonctionne la facturation ?</h3>
              <p className="text-muted-foreground">
                Vous êtes facturé mensuellement ou annuellement selon votre choix. 
                L'abonnement annuel offre une réduction significative.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Puis-je annuler mon abonnement ?</h3>
              <p className="text-muted-foreground">
                Oui, vous pouvez annuler votre abonnement à tout moment. 
                Vous conserverez l'accès jusqu'à la fin de votre période de facturation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
