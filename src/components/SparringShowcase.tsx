import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Video, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Zap,
  Play,
  ChevronRight,
  Users
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SparringAnalysis } from "@/components/SparringAnalysis";

// Animated stats for demo
const demoStats = {
  fighter1: {
    name: "Combattant A",
    punches: { thrown: 47, landed: 32 },
    kicks: { thrown: 18, landed: 12 },
    takedowns: { attempted: 3, successful: 2 },
  },
  fighter2: {
    name: "Combattant B", 
    punches: { thrown: 52, landed: 28 },
    kicks: { thrown: 15, landed: 8 },
    takedowns: { attempted: 5, successful: 1 },
  }
};

export const SparringShowcase = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);
  const [currentStat, setCurrentStat] = useState(0);

  // Animate stats cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValue(0);
      setTimeout(() => {
        setAnimatedValue(100);
        setCurrentStat(prev => (prev + 1) % 3);
      }, 100);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Initial animation
  useEffect(() => {
    setTimeout(() => setAnimatedValue(100), 500);
  }, []);

  const statLabels = ["Précision coups de poing", "Précision coups de pied", "Taux de takedown"];
  const statValues = [
    Math.round((demoStats.fighter1.punches.landed / demoStats.fighter1.punches.thrown) * 100),
    Math.round((demoStats.fighter1.kicks.landed / demoStats.fighter1.kicks.thrown) * 100),
    Math.round((demoStats.fighter1.takedowns.successful / demoStats.fighter1.takedowns.attempted) * 100),
  ];

  return (
    <>
      <section className="relative overflow-hidden border-y border-primary/20 bg-gradient-to-br from-background via-card to-background">
        {/* Animated background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary/20 rounded-full animate-pulse"
              style={{
                top: `${20 + i * 15}%`,
                left: `${10 + i * 15}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + i * 0.5}s`
              }}
            />
          ))}
        </div>

        <div className="container px-4 py-16 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  EXCLUSIF
                </Badge>
                <Badge variant="outline" className="border-primary/30">
                  Powered by IA
                </Badge>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                <span className="text-foreground">Analyse</span>
                <span className="text-primary"> Sparring </span>
                <span className="text-foreground">par IA</span>
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                <strong className="text-foreground">Unique sur le marché.</strong> Notre IA analyse vos vidéos de sparring 
                et extrait automatiquement les statistiques de combat : coups portés, 
                précision, takedowns, temps au sol, et recommandations personnalisées.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button 
                  size="lg"
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 group"
                >
                  <Video className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Analyser mon Sparring
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Voir une démo
                </Button>
              </div>

              {/* Features list */}
              <div className="grid grid-cols-2 gap-4 pt-6">
                {[
                  { icon: Target, label: "Stats précises" },
                  { icon: Users, label: "2 combattants" },
                  { icon: TrendingUp, label: "Recommandations" },
                  { icon: Zap, label: "Analyse rapide" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Interactive Preview */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-2xl opacity-50" />
              
              <div className="relative bg-gradient-card border border-primary/20 rounded-2xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">sparring_23_nov.mp4</p>
                      <p className="text-xs text-muted-foreground">Durée: 5:32</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    Analysé
                  </Badge>
                </div>

                {/* Animated stats */}
                <div className="space-y-4">
                  <div className="p-4 bg-background/50 rounded-xl border border-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{statLabels[currentStat]}</span>
                      <span className="text-lg font-bold text-primary">
                        {Math.round(statValues[currentStat] * (animatedValue / 100))}%
                      </span>
                    </div>
                    <Progress 
                      value={statValues[currentStat] * (animatedValue / 100)} 
                      className="h-2 transition-all duration-1000"
                    />
                  </div>

                  {/* Fighter comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Combattant A</p>
                      <p className="text-2xl font-bold text-primary">{demoStats.fighter1.punches.landed}</p>
                      <p className="text-xs text-muted-foreground">coups portés</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Combattant B</p>
                      <p className="text-2xl font-bold text-foreground">{demoStats.fighter2.punches.landed}</p>
                      <p className="text-xs text-muted-foreground">coups portés</p>
                    </div>
                  </div>

                  {/* AI Insight */}
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">Insight IA:</span> Le combattant A 
                        montre une meilleure précision en striking (+14%). Recommandation: 
                        travailler les esquives et contre-attaques.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-2xl flex items-end justify-center pb-6 opacity-0 hover:opacity-100 transition-opacity">
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-primary text-primary-foreground shadow-lg"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Essayer maintenant
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Analyse de Sparring par IA
              <Badge className="ml-2 bg-primary/20 text-primary border-primary/30">
                EXCLUSIF
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <SparringAnalysis />
        </DialogContent>
      </Dialog>
    </>
  );
};
