import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Camera, 
  ScanLine, 
  Dumbbell, 
  Brain, 
  Users, 
  Calendar,
  Plus,
  Play,
  Zap
} from "lucide-react";

interface QuickActionsProps {
  onSwitchTab?: (tab: string) => void;
}

export const QuickActions = ({ onSwitchTab }: QuickActionsProps) => {
  const navigate = useNavigate();
  
  const actions = [
    {
      title: "Scanner Aliment",
      description: "Code-barres nutrition",
      icon: ScanLine,
      variant: "default" as const,
      color: "bg-gradient-primary",
      onClick: () => {
        onSwitchTab?.("nutrition");
        toast.info("Scanner nutrition", { description: "Fonctionnalité à venir - utilisez l'ajout manuel pour le moment" });
      }
    },
    {
      title: "Upload Vidéo",
      description: "Analyse technique IA",
      icon: Camera,
      variant: "secondary" as const,
      color: "bg-gradient-secondary",
      onClick: () => {
        toast.info("Analyse vidéo IA", { description: "Fonctionnalité à venir - analyse des techniques de combat" });
      }
    },
    {
      title: "Nouveau Workout",
      description: "Démarrer séance",
      icon: Dumbbell,
      variant: "fitness" as const,
      color: "bg-accent",
      onClick: () => {
        onSwitchTab?.("workout");
        toast.success("Prêt à s'entraîner !", { description: "Démarrez votre workout dans l'onglet Préparation Physique" });
      }
    },
    {
      title: "Coach IA",
      description: "Assistant intelligent",
      icon: Brain,
      variant: "hero" as const,
      color: "bg-gradient-hero",
      onClick: () => {
        toast.info("Coach IA MMA", { description: "Votre assistant intelligent arrive bientôt" });
      }
    },
    {
      title: "Arts Martiaux",
      description: "Boxe, MMA, Grappling",
      icon: Users,
      variant: "outline" as const,
      color: "border-primary",
      onClick: () => {
        onSwitchTab?.("combat");
        toast.success("Technique MMA", { description: "Section combat activée" });
      }
    },
    {
      title: "Planifier",
      description: "Programme personnalisé",
      icon: Calendar,
      variant: "ghost" as const,
      color: "hover:bg-accent/10",
      onClick: () => navigate("/history")
    }
  ];

  return (
    <Card className="bg-gradient-card border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Actions Rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                className="h-20 flex-col gap-2 p-4 group"
                onClick={action.onClick}
              >
                <Icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                <div className="text-center">
                  <p className="text-xs font-semibold">{action.title}</p>
                  <p className="text-xs opacity-80">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
        
        {/* Quick Start Workout */}
        <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-primary-foreground">
                Prêt pour votre séance ?
              </h4>
              <p className="text-sm text-primary-foreground/80">
                Workout du jour : Haut du corps
              </p>
            </div>
            <Button 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => {
                onSwitchTab?.("workout");
                toast.success("C'est parti !", { description: "Démarrez votre entraînement maintenant" });
              }}
            >
              <Play className="h-4 w-4 mr-2" />
              Commencer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};