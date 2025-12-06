import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Video, 
  Upload, 
  Loader2, 
  Target, 
  TrendingUp, 
  AlertCircle,
  User,
  Swords,
  Timer,
  ChevronDown,
  ChevronUp,
  History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FighterStats {
  punches_thrown: number;
  punches_landed: number;
  kicks_thrown: number;
  kicks_landed: number;
  takedowns_attempted: number;
  takedowns_successful: number;
  submissions_attempted: number;
  clinch_time_percent: number;
  ground_time_percent: number;
}

interface Fighter {
  identifier: string;
  style: string;
  strengths: string[];
  weaknesses: string[];
}

interface Technique {
  technique: string;
  fighter: string;
  execution: string;
  timestamp_approx: string;
}

interface SparringAnalysisData {
  summary: string;
  duration_estimate: string;
  fighters: Fighter[];
  statistics: {
    fighter_1: FighterStats;
    fighter_2: FighterStats;
  };
  techniques_observed: Technique[];
  recommendations: {
    fighter_1: string[];
    fighter_2: string[];
  };
  overall_analysis: string;
  raw_response?: boolean;
  error?: string;
}

interface AnalysisRecord {
  id: string;
  video_name: string;
  video_url: string;
  status: string;
  analysis: SparringAnalysisData | null;
  created_at: string;
}

export const SparringAnalysis = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<SparringAnalysisData | null>(null);
  const [previousAnalyses, setPreviousAnalyses] = useState<AnalysisRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedFighter, setExpandedFighter] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchPreviousAnalyses();
    }
  }, [user]);

  const fetchPreviousAnalyses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sparring_analyses' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching analyses:', error);
        return;
      }

      setPreviousAnalyses((data || []) as unknown as AnalysisRecord[]);
    } catch (err) {
      console.error('Error fetching analyses:', err);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez MP4, MOV, WebM ou AVI.');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Fichier trop volumineux. Maximum 100MB.');
      return;
    }

    setUploading(true);
    toast.info('Upload de la vidéo en cours...');

    try {
      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sparring-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sparring-videos')
        .getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;

      // Create analysis record
      const { data: analysisRecord, error: recordError } = await supabase
        .from('sparring_analyses' as any)
        .insert({
          user_id: user.id,
          video_url: videoUrl,
          video_name: file.name,
          status: 'pending'
        })
        .select()
        .single();

      if (recordError) throw recordError;

      setUploading(false);
      setAnalyzing(true);
      toast.info('Analyse IA en cours... Cela peut prendre quelques minutes.');

      // Trigger analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-sparring', {
        body: { 
          videoUrl,
          analysisId: (analysisRecord as any)?.id
        }
      });

      if (analysisError) throw analysisError;

      if (analysisResult?.success) {
        setCurrentAnalysis(analysisResult.analysis);
        toast.success('Analyse terminée !');
        fetchPreviousAnalyses();
      } else {
        throw new Error(analysisResult?.error || 'Erreur d\'analyse');
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'analyse');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const loadAnalysis = (record: AnalysisRecord) => {
    if (record.analysis) {
      setCurrentAnalysis(record.analysis);
      setShowHistory(false);
    }
  };

  const renderFighterStats = (stats: FighterStats, fighterName: string, index: number) => {
    const punchAccuracy = stats.punches_thrown > 0 
      ? Math.round((stats.punches_landed / stats.punches_thrown) * 100) 
      : 0;
    const kickAccuracy = stats.kicks_thrown > 0 
      ? Math.round((stats.kicks_landed / stats.kicks_thrown) * 100) 
      : 0;
    const takedownSuccess = stats.takedowns_attempted > 0 
      ? Math.round((stats.takedowns_successful / stats.takedowns_attempted) * 100) 
      : 0;

    return (
      <Collapsible 
        key={index}
        open={expandedFighter === index}
        onOpenChange={() => setExpandedFighter(expandedFighter === index ? null : index)}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <User className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">{fighterName}</span>
            </div>
            {expandedFighter === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Strikes */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Coups de poing</Label>
              <div className="flex justify-between text-sm">
                <span>Portés: {stats.punches_landed}/{stats.punches_thrown}</span>
                <Badge variant="outline">{punchAccuracy}%</Badge>
              </div>
              <Progress value={punchAccuracy} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Coups de pied</Label>
              <div className="flex justify-between text-sm">
                <span>Portés: {stats.kicks_landed}/{stats.kicks_thrown}</span>
                <Badge variant="outline">{kickAccuracy}%</Badge>
              </div>
              <Progress value={kickAccuracy} className="h-2" />
            </div>

            {/* Grappling */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Takedowns</Label>
              <div className="flex justify-between text-sm">
                <span>Réussis: {stats.takedowns_successful}/{stats.takedowns_attempted}</span>
                <Badge variant="outline">{takedownSuccess}%</Badge>
              </div>
              <Progress value={takedownSuccess} className="h-2" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Soumissions tentées</Label>
              <div className="text-2xl font-bold text-primary">
                {stats.submissions_attempted}
              </div>
            </div>

            {/* Time distribution */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Temps clinch</Label>
              <Progress value={stats.clinch_time_percent} className="h-2" />
              <span className="text-xs">{stats.clinch_time_percent}%</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Temps au sol</Label>
              <Progress value={stats.ground_time_percent} className="h-2" />
              <span className="text-xs">{stats.ground_time_percent}%</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Video className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Analyse Sparring IA</CardTitle>
              <CardDescription>
                Upload ta vidéo de sparring pour une analyse détaillée
              </CardDescription>
            </div>
          </div>
          {previousAnalyses.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              Historique
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
          <Input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
            onChange={handleVideoUpload}
            disabled={uploading || analyzing}
            className="hidden"
            id="video-upload"
          />
          <Label 
            htmlFor="video-upload" 
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <span className="text-muted-foreground">Upload en cours...</span>
              </>
            ) : analyzing ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <span className="text-muted-foreground">Analyse IA en cours...</span>
                <span className="text-xs text-muted-foreground">Cela peut prendre 1-2 minutes</span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="font-medium">Cliquez pour uploader une vidéo</span>
                <span className="text-xs text-muted-foreground">MP4, MOV, WebM, AVI • Max 100MB</span>
              </>
            )}
          </Label>
        </div>

        {/* History */}
        {showHistory && previousAnalyses.length > 0 && (
          <Card className="bg-background/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Analyses précédentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {previousAnalyses.map((record) => (
                    <Button
                      key={record.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2"
                      onClick={() => loadAnalysis(record)}
                      disabled={record.status !== 'completed'}
                    >
                      <Video className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="text-left truncate flex-1">
                        <p className="text-sm font-medium truncate">{record.video_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                        {record.status === 'completed' ? 'Terminé' : 'En cours'}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {currentAnalysis && (
          <div className="space-y-4">
            <Separator />
            
            {/* Summary */}
            <div className="p-4 bg-primary/10 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Résumé du combat</h3>
                {currentAnalysis.duration_estimate && (
                  <Badge variant="outline" className="ml-auto">
                    <Timer className="h-3 w-3 mr-1" />
                    {currentAnalysis.duration_estimate}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{currentAnalysis.summary}</p>
            </div>

            {/* Fighter Stats */}
            {currentAnalysis.statistics && (
              <Card className="bg-background/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Statistiques par combattant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {renderFighterStats(
                    currentAnalysis.statistics.fighter_1, 
                    currentAnalysis.fighters?.[0]?.identifier || 'Combattant 1',
                    0
                  )}
                  {renderFighterStats(
                    currentAnalysis.statistics.fighter_2, 
                    currentAnalysis.fighters?.[1]?.identifier || 'Combattant 2',
                    1
                  )}
                </CardContent>
              </Card>
            )}

            {/* Techniques Observed */}
            {currentAnalysis.techniques_observed?.length > 0 && (
              <Card className="bg-background/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Swords className="h-4 w-4" />
                    Techniques observées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {currentAnalysis.techniques_observed.map((tech, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-background rounded-lg">
                          <div>
                            <span className="font-medium text-sm">{tech.technique}</span>
                            <span className="text-xs text-muted-foreground ml-2">({tech.fighter})</span>
                          </div>
                          <Badge variant={tech.execution.includes('Bien') ? 'default' : 'secondary'}>
                            {tech.execution}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {currentAnalysis.recommendations && (
              <Card className="bg-background/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Recommandations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentAnalysis.recommendations.fighter_1?.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {currentAnalysis.fighters?.[0]?.identifier || 'Combattant 1'}
                      </Label>
                      <ul className="mt-1 space-y-1">
                        {currentAnalysis.recommendations.fighter_1.map((rec, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentAnalysis.recommendations.fighter_2?.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {currentAnalysis.fighters?.[1]?.identifier || 'Combattant 2'}
                      </Label>
                      <ul className="mt-1 space-y-1">
                        {currentAnalysis.recommendations.fighter_2.map((rec, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Overall Analysis */}
            {currentAnalysis.overall_analysis && (
              <div className="p-4 bg-background/50 rounded-xl">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Analyse globale
                </h4>
                <p className="text-sm text-muted-foreground">{currentAnalysis.overall_analysis}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
