import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Trophy,
  Target,
  Swords,
  Shield,
  Flame,
  Calendar,
  BarChart3,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface PerformanceScores {
  overall: number;
  striking: number;
  grappling: number;
  defense: number;
  cardio: number;
}

interface AnalysisRecord {
  id: string;
  video_name: string;
  created_at: string;
  analysis: {
    performance_scores?: {
      fighter_1: PerformanceScores;
      fighter_2: PerformanceScores;
    };
    statistics?: {
      fighter_1: {
        punches_landed: number;
        punches_thrown: number;
        kicks_landed: number;
        kicks_thrown: number;
        defense_rate: number;
      };
      fighter_2: {
        punches_landed: number;
        punches_thrown: number;
        kicks_landed: number;
        kicks_thrown: number;
        defense_rate: number;
      };
    };
  } | null;
}

interface TrendIndicatorProps {
  current: number;
  previous: number;
  label: string;
  suffix?: string;
}

const TrendIndicator = ({ current, previous, label, suffix = "" }: TrendIndicatorProps) => {
  const diff = current - previous;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{current}{suffix}</p>
      </div>
      <div className={cn(
        "flex items-center gap-1 text-sm font-medium",
        isPositive ? "text-green-500" : isNeutral ? "text-muted-foreground" : "text-red-500"
      )}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : isNeutral ? (
          <Minus className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span>{isPositive ? "+" : ""}{diff}{suffix}</span>
      </div>
    </div>
  );
};

export const SparringProgressTracker = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [selectedFighter, setSelectedFighter] = useState<"fighter_1" | "fighter_2">("fighter_1");
  const [compareSession1, setCompareSession1] = useState<string | null>(null);
  const [compareSession2, setCompareSession2] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('sparring_analyses')
          .select('id, video_name, created_at, analysis')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        
        // Filter analyses that have performance scores
        const validAnalyses = (data || []).filter(
          (a): a is typeof a & { analysis: NonNullable<typeof a.analysis> } => 
            a.analysis !== null && 
            typeof a.analysis === 'object' &&
            'performance_scores' in (a.analysis as object)
        ) as unknown as AnalysisRecord[];
        
        setAnalyses(validAnalyses);
        
        // Auto-select first two for comparison
        if (validAnalyses.length >= 2) {
          setCompareSession1(validAnalyses[0].id);
          setCompareSession2(validAnalyses[1].id);
        } else if (validAnalyses.length === 1) {
          setCompareSession1(validAnalyses[0].id);
        }
      } catch (error) {
        console.error('Error fetching analyses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [user]);

  const getAnalysisById = (id: string | null) => {
    if (!id) return null;
    return analyses.find(a => a.id === id);
  };

  const session1 = getAnalysisById(compareSession1);
  const session2 = getAnalysisById(compareSession2);

  const getScores = (analysis: AnalysisRecord | null) => {
    if (!analysis?.analysis?.performance_scores) return null;
    return analysis.analysis.performance_scores[selectedFighter];
  };

  const getStats = (analysis: AnalysisRecord | null) => {
    if (!analysis?.analysis?.statistics) return null;
    return analysis.analysis.statistics[selectedFighter];
  };

  const scores1 = getScores(session1);
  const scores2 = getScores(session2);
  const stats1 = getStats(session1);
  const stats2 = getStats(session2);

  const calculateAccuracy = (landed: number, thrown: number) => {
    if (thrown === 0) return 0;
    return Math.round((landed / thrown) * 100);
  };

  // Calculate overall progress across all sessions
  const calculateOverallProgress = () => {
    if (analyses.length < 2) return null;
    
    const recentScores = getScores(analyses[0]);
    const oldestScores = getScores(analyses[analyses.length - 1]);
    
    if (!recentScores || !oldestScores) return null;
    
    return {
      overall: recentScores.overall - oldestScores.overall,
      striking: recentScores.striking - oldestScores.striking,
      grappling: recentScores.grappling - oldestScores.grappling,
      defense: recentScores.defense - oldestScores.defense,
      cardio: recentScores.cardio - oldestScores.cardio,
    };
  };

  const overallProgress = calculateOverallProgress();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse text-muted-foreground">Chargement des données...</div>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Pas encore d'analyses complétées.
            <br />
            Uploadez votre première vidéo de sparring pour commencer à suivre vos progrès !
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress Summary */}
      {overallProgress && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Progression Globale
            </CardTitle>
            <CardDescription>
              Évolution depuis votre première analyse ({analyses.length} sessions)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {[
                { key: 'overall', label: 'Global', icon: Trophy },
                { key: 'striking', label: 'Striking', icon: Swords },
                { key: 'grappling', label: 'Grappling', icon: Target },
                { key: 'defense', label: 'Défense', icon: Shield },
                { key: 'cardio', label: 'Cardio', icon: Flame },
              ].map(({ key, label, icon: Icon }) => {
                const value = overallProgress[key as keyof typeof overallProgress];
                const isPositive = value > 0;
                const isNeutral = value === 0;
                
                return (
                  <div 
                    key={key}
                    className={cn(
                      "text-center p-3 rounded-lg border",
                      isPositive ? "bg-green-500/10 border-green-500/30" : 
                      isNeutral ? "bg-muted/50 border-border" : 
                      "bg-red-500/10 border-red-500/30"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 mx-auto mb-1",
                      isPositive ? "text-green-500" : isNeutral ? "text-muted-foreground" : "text-red-500"
                    )} />
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn(
                      "text-lg font-bold",
                      isPositive ? "text-green-500" : isNeutral ? "text-muted-foreground" : "text-red-500"
                    )}>
                      {isPositive ? "+" : ""}{value}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Comparaison de Sessions
              </CardTitle>
              <CardDescription>
                Comparez vos performances entre deux sessions de sparring
              </CardDescription>
            </div>
            <Select value={selectedFighter} onValueChange={(v) => setSelectedFighter(v as "fighter_1" | "fighter_2")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Combattant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fighter_1">Combattant 1 (Rouge)</SelectItem>
                <SelectItem value="fighter_2">Combattant 2 (Bleu)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session Selectors */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="space-y-2">
              <label className="text-sm font-medium">Session récente</label>
              <Select value={compareSession1 || ""} onValueChange={setCompareSession1}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une session" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{a.video_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Session précédente</label>
              <Select value={compareSession2 || ""} onValueChange={setCompareSession2}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une session" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.filter(a => a.id !== compareSession1).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{a.video_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Results */}
          {scores1 && scores2 && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Scores de Performance
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <TrendIndicator 
                  current={scores1.overall} 
                  previous={scores2.overall} 
                  label="Global" 
                />
                <TrendIndicator 
                  current={scores1.striking} 
                  previous={scores2.striking} 
                  label="Striking" 
                />
                <TrendIndicator 
                  current={scores1.grappling} 
                  previous={scores2.grappling} 
                  label="Grappling" 
                />
                <TrendIndicator 
                  current={scores1.defense} 
                  previous={scores2.defense} 
                  label="Défense" 
                />
                <TrendIndicator 
                  current={scores1.cardio} 
                  previous={scores2.cardio} 
                  label="Cardio" 
                />
              </div>
            </div>
          )}

          {stats1 && stats2 && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Statistiques de Combat
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <TrendIndicator 
                  current={calculateAccuracy(stats1.punches_landed, stats1.punches_thrown)} 
                  previous={calculateAccuracy(stats2.punches_landed, stats2.punches_thrown)} 
                  label="Précision Poings" 
                  suffix="%"
                />
                <TrendIndicator 
                  current={calculateAccuracy(stats1.kicks_landed, stats1.kicks_thrown)} 
                  previous={calculateAccuracy(stats2.kicks_landed, stats2.kicks_thrown)} 
                  label="Précision Pieds" 
                  suffix="%"
                />
                <TrendIndicator 
                  current={stats1.defense_rate} 
                  previous={stats2.defense_rate} 
                  label="Taux Défense" 
                  suffix="%"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historique des Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {analyses.map((analysis, index) => {
                const scores = getScores(analysis);
                const prevAnalysis = analyses[index + 1];
                const prevScores = prevAnalysis ? getScores(prevAnalysis) : null;
                const diff = scores && prevScores ? scores.overall - prevScores.overall : 0;
                
                return (
                  <div 
                    key={analysis.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                        scores && scores.overall >= 80 ? "bg-green-500/20 text-green-500" :
                        scores && scores.overall >= 60 ? "bg-primary/20 text-primary" :
                        "bg-yellow-500/20 text-yellow-500"
                      )}>
                        {scores?.overall || "-"}
                      </div>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{analysis.video_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {prevScores && (
                      <Badge 
                        variant="outline"
                        className={cn(
                          diff > 0 ? "bg-green-500/10 text-green-500 border-green-500/30" :
                          diff < 0 ? "bg-red-500/10 text-red-500 border-red-500/30" :
                          "bg-muted text-muted-foreground"
                        )}
                      >
                        {diff > 0 ? "+" : ""}{diff} pts
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SparringProgressTracker;

