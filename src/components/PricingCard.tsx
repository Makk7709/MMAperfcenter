import { Check, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface PricingCardProps {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isPopular?: boolean;
  features: string[];
  onSubscribe: () => void;
  isCurrentPlan?: boolean;
  billingPeriod: 'monthly' | 'yearly';
}

export const PricingCard = ({
  name,
  description,
  monthlyPrice,
  yearlyPrice,
  isPopular,
  features,
  onSubscribe,
  isCurrentPlan,
  billingPeriod
}: PricingCardProps) => {
  const price = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const savings = billingPeriod === 'yearly' && monthlyPrice > 0
    ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
    : 0;

  return (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'border-primary bg-primary/5' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          Plus populaire
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground">
          Votre plan actuel
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}€</span>
          <span className="text-muted-foreground">
            /{billingPeriod === 'monthly' ? 'mois' : 'an'}
          </span>
          {savings > 0 && (
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs">
                Économisez {savings}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? 'default' : 'outline'}
          onClick={onSubscribe}
          disabled={isCurrentPlan && price > 0}
        >
          {isCurrentPlan ? 'Plan actuel' : price === 0 ? 'Commencer gratuitement' : 'S\'abonner'}
        </Button>
      </CardFooter>
    </Card>
  );
};
