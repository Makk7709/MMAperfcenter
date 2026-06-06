import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscription';

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredPlan: SubscriptionPlan;
  children?: ReactNode;
}

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  free: 'Free',
  pro: 'Pro - Guerrier',
  elite: 'Elite - Compétiteur',
  sensei: 'Senseï - Coach',
};

export const PaywallDialog = ({
  open,
  onOpenChange,
  feature,
  requiredPlan,
  children,
}: PaywallDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle>Fonctionnalité premium</DialogTitle>
          <DialogDescription className="text-base">
            Cette fonctionnalité est réservée aux utilisateurs du plan{' '}
            <span className="font-semibold text-foreground">
              {PLAN_NAMES[requiredPlan]}
            </span>.
          </DialogDescription>
        </DialogHeader>

        {children && (
          <div className="my-4 p-4 bg-muted rounded-lg">
            {children}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate('/pricing');
            }}
            className="w-full gap-2"
          >
            <Crown className="h-4 w-4" />
            Débloquer maintenant
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Peut-être plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
