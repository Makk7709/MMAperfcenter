import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { QuickStatsCards } from "@/components/QuickStatsCards";
import { QuickActions } from "@/components/QuickActions";
import { NutritionTracker } from "@/components/NutritionTracker";
import { WorkoutLogger } from "@/components/WorkoutLogger";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { 
  Brain, 
  Crown, 
  Users, 
  BarChart3,
  Star
} from "lucide-react";
import heroImage from "@/assets/mma-fighter-hero.jpg";

const Index = () => {
  const { user, signOut } = useAuth();
  const isPremium = true; // Simulation premium user
  const [activeTab, setActiveTab] = useState("nutrition");
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Fighter';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader userName={userName} isPremium={isPremium} onSignOut={handleSignOut} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-black/20" />
        <img 
          src={heroImage} 
          alt="MMA Fighter Training" 
          className="absolute inset-0 w-full h-64 object-cover mix-blend-overlay"
        />
        <div className="relative container px-4 py-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold text-primary mb-4">
              MMA Performance Center
              {isPremium && <Crown className="inline h-8 w-8 ml-2 text-primary" />}
            </h1>
            <p className="text-xl text-foreground/90 mb-8">
              Préparation competition MMA, analyse vidéo IA, programmes personnalisés.
              Boxe • Kickboxing • Grappling • Nutrition de combat
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="hero" size="lg">
                <Brain className="h-5 w-5 mr-2" />
                Coach IA MMA
              </Button>
              <Button variant="secondary" size="lg">
                <BarChart3 className="h-5 w-5 mr-2" />
                Analyse Combat
              </Button>
              {!isPremium && (
                <Button className="bg-primary hover:bg-primary/80 text-primary-foreground" size="lg">
                  <Star className="h-5 w-5 mr-2" />
                  Champion Access
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container px-4 py-8">
        {/* Quick Stats */}
        <section className="mb-8">
          <QuickStatsCards />
        </section>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Actions & Tools */}
          <div className="lg:col-span-1 space-y-6">
            <QuickActions onSwitchTab={setActiveTab} />
            
            {/* Community Preview */}
            <div className="bg-gradient-card rounded-lg p-6 border-0 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-accent" />
                <h3 className="font-semibold">Communauté</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Mike a terminé son workout</p>
                    <p className="text-xs text-muted-foreground">il y a 5 min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-secondary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sarah a battu son PR!</p>
                    <p className="text-xs text-muted-foreground">il y a 12 min</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Voir toute l'activité
              </Button>
            </div>
          </div>

          {/* Center/Right Columns - Main Tracking */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="nutrition">Nutrition Combat</TabsTrigger>
                <TabsTrigger value="workout">Préparation Physique</TabsTrigger>
                <TabsTrigger value="combat">Technique MMA</TabsTrigger>
              </TabsList>
              
              <TabsContent value="nutrition" className="space-y-6">
                <NutritionTracker />
              </TabsContent>
              
              <TabsContent value="workout" className="space-y-6">
                <WorkoutLogger />
              </TabsContent>
              
              <TabsContent value="combat" className="space-y-6">
                <div className="text-center py-12 bg-gradient-card rounded-lg border-0 shadow-card">
                  <Users className="h-12 w-12 mx-auto text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-primary">Technique MMA & Combat</h3>
                  <p className="text-muted-foreground mb-6">
                    Striking • Grappling • Wrestling • BJJ • Analyse vidéo IA des combats
                  </p>
                  <Button variant="hero">
                    Démarrer Session Combat
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
