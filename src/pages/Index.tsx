import { useState, useRef } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { QuickStatsCards } from "@/components/QuickStatsCards";
import { QuickActions } from "@/components/QuickActions";
import { NutritionTracker } from "@/components/NutritionTracker";
import { WorkoutLogger } from "@/components/WorkoutLogger";
import { RoundTimer } from "@/components/RoundTimer";
import { MeuteCard } from "@/components/MeuteCard";
import { MMANewsBanner } from "@/components/MMANewsBanner";
import { AICoachChat } from "@/components/AICoachChat";
import { SparringShowcase } from "@/components/SparringShowcase";
import { SparringAnalysisFAB } from "@/components/SparringAnalysisFAB";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { 
  Brain, 
  Crown, 
  Users, 
  Star,
  Zap
} from "lucide-react";
import heroImage from "@/assets/mma-fighter-hero.jpg";

const Index = () => {
  const { user, signOut } = useAuth();
  const isPremium = true;
  const [activeTab, setActiveTab] = useState("nutrition");
  const aiCoachRef = useRef<HTMLDivElement>(null);

  const scrollToAICoach = () => {
    aiCoachRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Fighter';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader userName={userName} isPremium={isPremium} onSignOut={handleSignOut} />
      
      {/* MMA News Banner */}
      <MMANewsBanner />
      
      {/* Hero Section - Premium Black & Gold */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-gold-accent opacity-30" />
        <img 
          src={heroImage} 
          alt="MMA Fighter Training" 
          className="absolute inset-0 w-full h-full object-cover object-[70%_25%] md:object-[65%_30%] lg:object-[60%_30%] xl:object-[55%_35%] 2xl:object-[50%_35%] opacity-30"
        />
        
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />
        
        <div className="relative container px-4 py-20">
          <div className="max-w-3xl">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-primary tracking-tight mb-2">
                KOREV AI
              </h2>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 bg-primary" />
              <span className="text-sm font-semibold tracking-wider text-primary uppercase">
                Performance Center
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="text-foreground">MMA</span>
              <span className="text-primary"> Performance</span>
              {isPremium && (
                <Crown className="inline h-10 w-10 ml-3 text-primary drop-shadow-glow" />
              )}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl">
              Préparation compétition MMA • Analyse vidéo IA • Programmes sur mesure
              <br />
              <span className="text-foreground/80">Boxe • Kickboxing • Grappling • Nutrition de combat</span>
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="default" 
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary group"
                onClick={scrollToAICoach}
              >
                <Brain className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                Coach IA MMA
              </Button>
              
              {!isPremium && (
                <Button 
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 shadow-glow"
                >
                  <Star className="h-5 w-5 mr-2" />
                  Champion Access
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sparring Showcase Section */}
      <SparringShowcase />
      <div className="container px-4 py-12">
        {/* Quick Stats with subtle gold accents */}
        <section className="mb-10 relative">
          <div className="absolute -top-6 left-0 right-0 h-px bg-gradient-gold-accent" />
          <QuickStatsCards />
        </section>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - AI Coach & Actions */}
          <div className="lg:col-span-1 space-y-6">
            <div ref={aiCoachRef}>
              <AICoachChat />
            </div>
            
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-primary opacity-5 rounded-lg blur" />
              <QuickActions onSwitchTab={setActiveTab} />
            </div>
            
            <MeuteCard />
          </div>

          {/* Center/Right Columns - Main Tracking */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-card border border-border/50 p-1">
                <TabsTrigger 
                  value="nutrition"
                  className="data-[state=active]:bg-gradient-secondary data-[state=active]:shadow-sm"
                >
                  Nutrition Combat
                </TabsTrigger>
                <TabsTrigger 
                  value="workout"
                  className="data-[state=active]:bg-gradient-secondary data-[state=active]:shadow-sm"
                >
                  Préparation Physique
                </TabsTrigger>
                <TabsTrigger 
                  value="combat"
                  className="data-[state=active]:bg-gradient-secondary data-[state=active]:shadow-sm"
                >
                  Technique MMA
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="nutrition" className="space-y-6">
                <NutritionTracker />
              </TabsContent>
              
              <TabsContent value="workout" className="space-y-6">
                <WorkoutLogger />
              </TabsContent>
              
              <TabsContent value="combat" className="space-y-6">
                <RoundTimer />
                <div className="relative overflow-hidden bg-gradient-card rounded-lg border border-border/50 shadow-card">
                  <div className="absolute inset-0 bg-gradient-gold-accent opacity-10" />
                  <div className="relative text-center py-16 px-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-primary/10 border border-primary/20">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-foreground">
                      Technique MMA & Combat
                    </h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                      Striking • Grappling • Wrestling • BJJ
                      <br />
                      <span className="text-sm">Analyse vidéo IA des combats</span>
                    </p>
                    <Button 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary group"
                    >
                      <Zap className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                      Démarrer Session Combat
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Floating Action Button */}
      <SparringAnalysisFAB />
    </div>
  );
};

export default Index;
