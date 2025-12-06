import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Lock, 
  Zap, 
  TrendingUp,
  Check,
  Sparkles
} from 'lucide-react';
import { 
  useFeatureAccess, 
  FeatureKey, 
  FEATURE_CONFIG, 
  PLAN_INFO,
  PlanType 
} from '@/hooks/useFeatureAccess';

interface FeaturePaywallProps {
  feature: FeatureKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccessGranted?: () => void;
}

const planIcons: Record<PlanType, React.ReactNode> = {
  free: <Zap className="h-5 w-5" />,
  pro: <TrendingUp className="h-5 w-5" />,
  elite: <Sparkles className="h-5 w-5" />,
  sensei: <Crown className="h-5 w-5" />,
};

const planColors: Record<PlanType, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/20 text-primary',
  elite: 'bg-purple-500/20 text-purple-400',
  sensei: 'bg-gradient-to-r from-primary/20 to-orange-500/20 text-primary',
};

export const FeaturePaywall = ({ 
  feature, 
  open, 
  onOpenChange,
  onAccessGranted 
}: FeaturePaywallProps) => {
  const navigate = useNavigate();
  const { currentPlan, checkAccess, useFeatureWithTracking } = useFeatureAccess();
  const [accessInfo, setAccessInfo] = useState<{
    hasAccess: boolean;
    currentUsage: number;
    limit: number;
    isUnlimited: boolean;
    remainingUsage: number;
    requiredPlan: PlanType;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const featureConfig = FEATURE_CONFIG[feature];
  const requiredPlanInfo = accessInfo ? PLAN_INFO[accessInfo.requiredPlan] : null;

  useEffect(() => {
    const loadAccessInfo = async () => {
      setLoading(true);
      const info = await checkAccess(feature);
      setAccessInfo(info);
      setLoading(false);
    };

    if (open) {
      loadAccessInfo();
    }
  }, [open, feature, checkAccess]);

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  const handleUseFeature = async () => {
    const result = await useFeatureWithTracking(feature);
    if (result.allowed) {
      onOpenChange(false);
      onAccessGranted?.();
    } else {
      // Refresh access info
      const info = await checkAccess(feature);
      setAccessInfo(info);
    }
  };

  if (loading || !accessInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-primary">Chargement...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si accès autorisé et illimité, fermer le dialog et notifier
  if (accessInfo.hasAccess && accessInfo.isUnlimited) {
    onAccessGranted?.();
    onOpenChange(false);
    return null;
  }

  const progressPercent = accessInfo.limit > 0 
    ? (accessInfo.currentUsage / accessInfo.limit) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {accessInfo.hasAccess ? (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{featureConfig.name}</DialogTitle>
              <DialogDescription>{featureConfig.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Plan Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre plan actuel</span>
            <Badge className={planColors[currentPlan]}>
              {planIcons[currentPlan]}
              <span className="ml-1.5">{PLAN_INFO[currentPlan].name}</span>
            </Badge>
          </div>

          {/* Usage Progress (for limited features) */}
          {accessInfo.limit > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilisation ce mois</span>
                <span className="font-medium">
                  {accessInfo.currentUsage} / {accessInfo.limit}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {accessInfo.remainingUsage === 0 ? (
                <p className="text-xs text-destructive">
                  Limite mensuelle atteinte. Passez au plan supérieur pour continuer.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {accessInfo.remainingUsage} utilisation(s) restante(s) ce mois
                </p>
              )}
            </div>
          )}

          {/* No access - Show upgrade prompt */}
          {!accessInfo.hasAccess && requiredPlanInfo && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  Disponible avec {requiredPlanInfo.name}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Débloquez cette fonctionnalité et bien plus avec le plan {requiredPlanInfo.name} 
                à partir de {requiredPlanInfo.price}.
              </p>
              <ul className="text-sm space-y-1.5">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Accès illimité à {featureConfig.name}</span>
                </li>
                {accessInfo.requiredPlan === 'sensei' && (
                  <>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Gestion multi-athlètes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Export PDF des rapports</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {accessInfo.hasAccess ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleUseFeature} className="flex-1">
                <Zap className="h-4 w-4 mr-2" />
                Utiliser ({accessInfo.remainingUsage} restant)
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Plus tard
              </Button>
              <Button onClick={handleUpgrade} className="flex-1 bg-gradient-primary">
                <Crown className="h-4 w-4 mr-2" />
                {requiredPlanInfo?.cta || 'Passer Premium'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Hook pour utiliser facilement le paywall dans les composants
export const usePaywall = () => {
  const [paywallState, setPaywallState] = useState<{
    open: boolean;
    feature: FeatureKey | null;
    onSuccess?: () => void;
  }>({
    open: false,
    feature: null,
    onSuccess: undefined,
  });

  const checkAndShowPaywall = async (
    feature: FeatureKey, 
    onSuccess?: () => void
  ) => {
    setPaywallState({
      open: true,
      feature,
      onSuccess,
    });
  };

  const closePaywall = () => {
    setPaywallState(prev => ({ ...prev, open: false }));
  };

  const handleAccessGranted = () => {
    paywallState.onSuccess?.();
    closePaywall();
  };

  const PaywallDialog = () => {
    if (!paywallState.feature) return null;
    
    return (
      <FeaturePaywall
        feature={paywallState.feature}
        open={paywallState.open}
        onOpenChange={closePaywall}
        onAccessGranted={handleAccessGranted}
      />
    );
  };

  return {
    checkAndShowPaywall,
    PaywallDialog,
  };
};
