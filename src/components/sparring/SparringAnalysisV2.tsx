import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  Upload, 
  Loader2, 
  Target, 
  TrendingUp, 
  AlertCircle,
  User,
  Users,
  Swords,
  Timer,
  ChevronDown,
  ChevronUp,
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Share2,
  Download,
  Trophy,
  Flame,
  Shield,
  Zap,
  BarChart3,
  Clock,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SparringPDFExport } from "./SparringPDFExport";
import { SparringShareDialog } from "./SparringShareDialog";
import { SparringProgressTracker } from "./SparringProgressTracker";
import { extractVideoFrames, formatFramesForAPI } from "@/utils/videoFrameExtractor";
import { retryWithBackoff, RetryableError } from "@/utils/retryWithBackoff";
import { convertToSignedUrl } from "@/utils/storageUtils";

// Types améliorés
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
  significant_strikes: number;
  head_strikes: number;
  body_strikes: number;
  leg_strikes: number;
  defense_rate: number;
}

interface Fighter {
  identifier: string;
  style: string;
  strengths: string[];
  weaknesses: string[];
  corner: "red" | "blue";
}

interface KeyMoment {
  timestamp: string;
  timestamp_seconds: number;
  type: "strike" | "takedown" | "submission_attempt" | "knockdown" | "dominant_position" | "escape";
  description: string;
  fighter: string;
  significance: "low" | "medium" | "high";
}

interface Round {
  number: number;
  start_time: string;
  end_time: string;
  winner_suggestion: string;
  key_events: string[];
}

interface SparringAnalysisData {
  summary: string;
  duration_estimate: string;
  duration_seconds: number;
  fighters: Fighter[];
  statistics: {
    fighter_1: FighterStats;
    fighter_2: FighterStats;
  };
  key_moments: KeyMoment[];
  rounds: Round[];
  techniques_observed: {
    technique: string;
    fighter: string;
    execution: string;
    timestamp_approx: string;
  }[];
  recommendations: {
    fighter_1: string[];
    fighter_2: string[];
  };
  overall_analysis: string;
  performance_scores: {
    fighter_1: {
      overall: number;
      striking: number;
      grappling: number;
      defense: number;
      cardio: number;
    };
    fighter_2: {
      overall: number;
      striking: number;
      grappling: number;
      defense: number;
      cardio: number;
    };
  };
  analysis_quality?: {
    confidence: number;
    stats_confidence: number;
    video_quality: 'poor' | 'fair' | 'good' | 'excellent';
    warnings: string[];
  };
  discipline?: string;
  applicable_metrics?: string[];
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

// Composant Score circulaire
const CircularScore = ({ 
  score, 
  label, 
  size = "md",
  color = "primary"
}: { 
  score: number; 
  label: string;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "green" | "yellow" | "red";
}) => {
  const sizes = {
    sm: { container: "w-16 h-16", text: "text-lg", label: "text-[10px]" },
    md: { container: "w-24 h-24", text: "text-2xl", label: "text-xs" },
    lg: { container: "w-32 h-32", text: "text-4xl", label: "text-sm" }
  };
  
  const colors = {
    primary: "text-primary",
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500"
  };

  const strokeColor = {
    primary: "stroke-primary",
    green: "stroke-green-500",
    yellow: "stroke-yellow-500",
    red: "stroke-red-500"
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("relative", sizes[size].container)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/30"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-1000 ease-out", strokeColor[color])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", sizes[size].text, colors[color])}>{score}</span>
        <span className={cn("text-muted-foreground", sizes[size].label)}>{label}</span>
      </div>
    </div>
  );
};

// Composant Body Heatmap
const BodyHeatmap = ({ 
  headStrikes, 
  bodyStrikes, 
  legStrikes 
}: { 
  headStrikes: number;
  bodyStrikes: number;
  legStrikes: number;
}) => {
  const total = headStrikes + bodyStrikes + legStrikes;
  const getIntensity = (value: number) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    if (percent > 50) return "bg-red-500/80";
    if (percent > 30) return "bg-orange-500/70";
    if (percent > 15) return "bg-yellow-500/60";
    return "bg-green-500/40";
  };

  return (
    <div className="relative w-32 h-48 mx-auto">
      {/* Body silhouette */}
      <svg viewBox="0 0 100 150" className="w-full h-full">
        {/* Head */}
        <circle cx="50" cy="15" r="12" className={cn("transition-colors", getIntensity(headStrikes))} />
        {/* Body */}
        <ellipse cx="50" cy="55" rx="25" ry="30" className={cn("transition-colors", getIntensity(bodyStrikes))} />
        {/* Left leg */}
        <ellipse cx="38" cy="115" rx="10" ry="35" className={cn("transition-colors", getIntensity(legStrikes))} />
        {/* Right leg */}
        <ellipse cx="62" cy="115" rx="10" ry="35" className={cn("transition-colors", getIntensity(legStrikes))} />
      </svg>
      {/* Labels */}
      <div className="absolute top-2 right-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/80" />
          <span>Tête: {headStrikes}</span>
        </div>
      </div>
      <div className="absolute top-1/3 right-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500/70" />
          <span>Corps: {bodyStrikes}</span>
        </div>
      </div>
      <div className="absolute bottom-4 right-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <span>Jambes: {legStrikes}</span>
        </div>
      </div>
    </div>
  );
};

// Composant Timeline des moments clés
const KeyMomentsTimeline = ({ 
  moments, 
  duration,
  onSeek 
}: { 
  moments: KeyMoment[];
  duration: number;
  onSeek: (time: number) => void;
}) => {
  const getTypeIcon = (type: KeyMoment["type"]) => {
    switch (type) {
      case "strike": return <Swords className="h-3 w-3" />;
      case "takedown": return <ArrowDown className="h-3 w-3" />;
      case "submission_attempt": return <Target className="h-3 w-3" />;
      case "knockdown": return <Zap className="h-3 w-3" />;
      case "dominant_position": return <Shield className="h-3 w-3" />;
      case "escape": return <ArrowUp className="h-3 w-3" />;
      default: return <Star className="h-3 w-3" />;
    }
  };

  const getTypeColor = (significance: KeyMoment["significance"]) => {
    switch (significance) {
      case "high": return "bg-red-500 text-white";
      case "medium": return "bg-yellow-500 text-black";
      case "low": return "bg-blue-500 text-white";
    }
  };

  return (
    <div className="space-y-2">
      {/* Timeline bar */}
      <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
        {moments.map((moment, i) => {
          const position = duration > 0 ? (moment.timestamp_seconds / duration) * 100 : 0;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSeek(moment.timestamp_seconds)}
                  className={cn(
                    "absolute top-1 w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-125 cursor-pointer",
                    getTypeColor(moment.significance)
                  )}
                  style={{ left: `calc(${position}% - 12px)` }}
                >
                  {getTypeIcon(moment.type)}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{moment.timestamp}</p>
                <p className="text-xs">{moment.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Haute importance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Moyenne</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Basse</span>
        </div>
      </div>
    </div>
  );
};

// Composant Stat Comparison Bar
const StatComparisonBar = ({
  label,
  fighter1Value,
  fighter2Value,
  fighter1Name,
  fighter2Name,
  unit = "",
  showPercentage = false
}: {
  label: string;
  fighter1Value: number;
  fighter2Value: number;
  fighter1Name: string;
  fighter2Name: string;
  unit?: string;
  showPercentage?: boolean;
}) => {
  const total = fighter1Value + fighter2Value;
  const f1Percent = total > 0 ? (fighter1Value / total) * 100 : 50;
  const f2Percent = total > 0 ? (fighter2Value / total) * 100 : 50;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-red-400">{fighter1Value}{unit}</span>
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-blue-400">{fighter2Value}{unit}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden">
        <div 
          className="bg-red-500 transition-all duration-500" 
          style={{ width: `${f1Percent}%` }}
        />
        <div 
          className="bg-blue-500 transition-all duration-500" 
          style={{ width: `${f2Percent}%` }}
        />
      </div>
    </div>
  );
};

// Composant principal
export const SparringAnalysisV2 = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // États
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysis, setCurrentAnalysis] = useState<SparringAnalysisData | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [previousAnalyses, setPreviousAnalyses] = useState<AnalysisRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFighter, setSelectedFighter] = useState<0 | 1>(0);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [currentVideoName, setCurrentVideoName] = useState<string>("");
  const [discipline, setDiscipline] = useState<string>("auto");

  // Sync default discipline from profile
  useEffect(() => {
    if (profile?.martial_arts_discipline && discipline === "auto") {
      setDiscipline(profile.martial_arts_discipline);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.martial_arts_discipline]);

  // Charger les analyses précédentes
  useEffect(() => {
    const loadAnalyses = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('sparring_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setPreviousAnalyses((data || []) as unknown as AnalysisRecord[]);
      } catch (err) {
        console.error('Error fetching analyses:', err);
      }
    };

    loadAnalyses();
  }, [user]);

  // Simuler la progression de l'analyse
  useEffect(() => {
    if (analyzing) {
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setAnalysisProgress(0);
    }
  }, [analyzing]);

  if (authLoading) {
    return (
      <Card className="liquid-glass-solid border-border/50">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="liquid-glass-solid border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Connectez-vous pour utiliser l'analyse de sparring IA
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validation - only check format, not size (we extract frames client-side now)
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez MP4, MOV, WebM ou AVI.');
      return;
    }

    // Max 500MB for source video (we only extract frames)
    const maxSizeMB = 500;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    const fileSizeMB = file.size / (1024 * 1024);
    console.log(`[Sparring] Starting analysis: ${file.name} (${fileSizeMB.toFixed(2)} MB)`);
    toast.info(`🎬 Extraction des frames de la vidéo...`);

    try {
      // Step 1: Extract frames from video client-side
      console.log('[Sparring] Extracting frames from video...');
      setUploadProgress(10);
      
      const extractedFrames = await extractVideoFrames(file, {
        frameInterval: 1.0,  // Plus dense pour capturer les actions rapides (était 1.5s)
        maxFrames: 60,       // 60 frames pour couvrir ~60% de plus de la vidéo (était 32)
        quality: 0.70,      // Légèrement réduit pour garder la payload raisonnable
        maxWidth: 1280,
      });
      
      console.log(`[Sparring] Extracted ${extractedFrames.length} frames`);
      setUploadProgress(40);
      
      if (extractedFrames.length < 3) {
        throw new Error('Vidéo trop courte. Minimum 6 secondes requis.');
      }

      // Format frames for API
      const { frames, totalDuration } = formatFramesForAPI(extractedFrames);
      console.log(`[Sparring] Video duration: ${totalDuration}s`);
      
      toast.info(`📸 ${extractedFrames.length} frames extraites. Analyse en cours...`);
      setUploadProgress(50);

      // Step 2: Create analysis record
      const { data: analysisRecord, error: recordError } = await supabase
        .from('sparring_analyses')
        .insert({
          user_id: user.id,
          video_url: '', // No video upload needed anymore
          video_name: file.name,
          status: 'pending'
        })
        .select('id')
        .single();

      if (recordError) throw recordError;

      const recordId = analysisRecord?.id as string | undefined;
      
      setUploading(false);
      setAnalyzing(true);
      setUploadProgress(60);
      
      // Step 3: Send frames to AI for analysis with retry logic
      console.log('[Sparring] Sending frames to AI...');
      
      const result = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase.functions.invoke('analyze-sparring', {
            body: {
              frames,
              totalDuration,
              analysisId: recordId,
              videoName: file.name,
              qualityMode: 'pro', // 'pro' (gemini-2.5-pro) | 'fast' (flash)
              discipline: discipline === 'auto' ? (profile?.martial_arts_discipline ?? null) : discipline,
            }
          });

          if (error) {
            // Check if this is a retryable error
            const errorMessage = error.message || '';
            if (errorMessage.includes('429') || errorMessage.includes('rate limit') || 
                errorMessage.includes('500') || errorMessage.includes('timeout')) {
              throw new RetryableError(errorMessage);
            }
            throw new Error(errorMessage);
          }

          if (!data?.success) {
            const errorMsg = data?.error || 'Erreur d\'analyse';
            // Rate limits and server errors are retryable
            if (errorMsg.includes('Limite') || errorMsg.includes('429') || errorMsg.includes('500')) {
              throw new RetryableError(errorMsg);
            }
            throw new Error(errorMsg);
          }

          return data;
        },
        {
          maxRetries: 3,
          initialDelayMs: 3000,
          backoffMultiplier: 2,
          maxDelayMs: 15000,
          onRetry: (attempt, error, nextDelayMs) => {
            console.log(`[Sparring] Retry ${attempt}, error: ${error.message}, next delay: ${nextDelayMs}ms`);
            toast.warning(`⏳ Tentative ${attempt}/3 échouée. Nouvelle tentative dans ${Math.round(nextDelayMs/1000)}s...`);
          },
          onSuccess: (_data, attempts) => {
            if (attempts > 1) {
              console.log(`[Sparring] Success after ${attempts} attempts`);
            }
          },
          onFailure: (errors, attempts) => {
            console.error(`[Sparring] Failed after ${attempts} attempts:`, errors);
          }
        }
      );

      if (result.success && result.data) {
        setCurrentAnalysis(result.data.analysis);
        setCurrentAnalysisId(recordId || null);
        setCurrentVideoName(file.name);
        setCurrentVideoUrl(URL.createObjectURL(file)); // Use local URL for playback
        setAnalysisProgress(100);
        toast.success('✅ Analyse terminée ! Découvrez vos statistiques de combat.');
        // Refresh previous analyses
        if (user) {
          const { data } = await supabase
            .from('sparring_analyses')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          setPreviousAnalyses((data || []) as unknown as AnalysisRecord[]);
        }
      } else {
        throw result.finalError || new Error('Erreur d\'analyse après plusieurs tentatives');
      }

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'analyse';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Limite') || errorMessage.includes('429')) {
        toast.error('🚫 Trop de requêtes. Attendez 1 minute et réessayez.');
      } else if (errorMessage.includes('Crédits') || errorMessage.includes('402')) {
        toast.error('💳 Crédits IA insuffisants. Contactez le support.');
      } else if (errorMessage.includes('volumineux') || errorMessage.includes('413')) {
        toast.error('📦 Vidéo trop grande. Essayez une vidéo plus courte.');
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const loadAnalysis = async (record: AnalysisRecord) => {
    if (record.analysis) {
      setCurrentAnalysis(record.analysis);
      setCurrentAnalysisId(record.id);
      setCurrentVideoName(record.video_name);
      setShowHistory(false);
      
      // Convert public URL to signed URL for security (1 hour expiration)
      if (record.video_url) {
        const signedUrl = await convertToSignedUrl(record.video_url, 'sparring-videos', 3600);
        setCurrentVideoUrl(signedUrl);
      } else {
        setCurrentVideoUrl(null);
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getPerformanceColor = (score: number): "primary" | "green" | "yellow" | "red" => {
    if (score >= 80) return "green";
    if (score >= 60) return "primary";
    if (score >= 40) return "yellow";
    return "red";
  };

  // Render Upload Section
  const renderUploadSection = () => (
    <div className="space-y-6">
      {/* Discipline selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
        <div className="flex-1">
          <Label className="text-sm font-semibold">Discipline analysée</Label>
          <p className="text-xs text-muted-foreground">
            Spécialise l'IA (stats adaptées, métriques non pertinentes masquées).
          </p>
        </div>
        <Select value={discipline} onValueChange={setDiscipline} disabled={uploading || analyzing}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Choisir une discipline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (depuis mon profil)</SelectItem>
            <SelectItem value="Boxe anglaise">Boxe anglaise</SelectItem>
            <SelectItem value="Kickboxing">Kickboxing</SelectItem>
            <SelectItem value="Muay Thai">Muay Thai</SelectItem>
            <SelectItem value="MMA">MMA</SelectItem>
            <SelectItem value="BJJ">BJJ / Grappling</SelectItem>
            <SelectItem value="Judo">Judo / Lutte</SelectItem>
            <SelectItem value="Karaté">Karaté</SelectItem>
            <SelectItem value="Taekwondo">Taekwondo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={cn(
        "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300",
        "hover:border-primary/50 hover:bg-primary/5",
        uploading || analyzing ? "border-primary/30 bg-primary/5" : "border-border/50"
      )}>
        <Input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={handleVideoUpload}
          disabled={uploading || analyzing}
          className="hidden"
          id="video-upload-v2"
        />
        
        <Label 
          htmlFor="video-upload-v2" 
          className="cursor-pointer flex flex-col items-center gap-4"
        >
        {uploading ? (
            <>
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/30 animate-pulse" />
                <Upload className="absolute inset-0 m-auto h-8 w-8 text-primary animate-bounce" />
              </div>
              <div className="space-y-2">
                <span className="text-lg font-medium">Upload en cours...</span>
                <Progress value={uploadProgress} className="w-48 mx-auto" />
                <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}% - Veuillez patienter</p>
              </div>
            </>
          ) : analyzing ? (
            <>
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary animate-spin" style={{ borderTopColor: 'transparent' }} />
                <Loader2 className="absolute inset-0 m-auto h-10 w-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <span className="text-lg font-medium">Analyse IA en cours...</span>
                <p className="text-sm text-muted-foreground">
                  Notre IA examine chaque mouvement, compte les coups et identifie les techniques
                </p>
                <Progress value={analysisProgress} className="w-64 mx-auto" />
                <p className="text-xs text-muted-foreground">{Math.round(analysisProgress)}% complété</p>
              </div>
            </>
          ) : (
            <>
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Video className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Upload className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xl font-bold">Déposez votre vidéo de sparring</span>
                <p className="text-muted-foreground">
                  MP4, MOV, WebM, AVI • Maximum 100MB • Durée recommandée: 3-15 min
                </p>
              </div>
              <Button variant="outline" className="mt-2 pointer-events-none" type="button" tabIndex={-1} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Parcourir les fichiers
                </span>
              </Button>
            </>
          )}
        </Label>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Video, title: "Qualité vidéo", desc: "HD recommandé pour une meilleure analyse" },
          { icon: Users, title: "Cadrage", desc: "Les deux combattants doivent être visibles" },
          { icon: Clock, title: "Durée", desc: "3-15 minutes pour des stats optimales" }
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Icon className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render Analysis Results
  const renderAnalysisResults = () => {
    if (!currentAnalysis) return null;

    const fighter1 = currentAnalysis.fighters?.[0];
    const fighter2 = currentAnalysis.fighters?.[1];
    const stats1 = currentAnalysis.statistics?.fighter_1;
    const stats2 = currentAnalysis.statistics?.fighter_2;
    const scores1 = currentAnalysis.performance_scores?.fighter_1;
    const scores2 = currentAnalysis.performance_scores?.fighter_2;
    const applicable = currentAnalysis.applicable_metrics ?? ['striking', 'grappling', 'defense', 'cardio', 'technique'];
    const showStriking = applicable.includes('striking');
    const showGrappling = applicable.includes('grappling');
    const showDefense = applicable.includes('defense');
    const showCardio = applicable.includes('cardio');

    return (
      <div className="space-y-6">
        {/* Video Player with Timeline */}
        {currentVideoUrl && (
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                src={currentVideoUrl}
                className="w-full h-full"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleSeek(currentTime - 10)}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleSeek(currentTime + 10)}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 mx-4">
                    <Progress 
                      value={(currentTime / (currentAnalysis.duration_seconds || 300)) * 100} 
                      className="h-1"
                    />
                  </div>
                  <span className="text-white text-sm">
                    {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Key Moments Timeline */}
            {currentAnalysis.key_moments && currentAnalysis.key_moments.length > 0 && (
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Moments clés du combat
                </p>
                <KeyMomentsTimeline 
                  moments={currentAnalysis.key_moments}
                  duration={currentAnalysis.duration_seconds || 300}
                  onSeek={handleSeek}
                />
              </CardContent>
            )}
          </Card>
        )}

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="techniques">Techniques</TabsTrigger>
            <TabsTrigger value="recommendations">Conseils</TabsTrigger>
            <TabsTrigger value="progress">
              <TrendingUp className="h-4 w-4 mr-1" />
              Progression
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Performance Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Score de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8">
                  {/* Fighter 1 */}
                  <div className="text-center space-y-4">
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                      {fighter1?.identifier || "Combattant 1"}
                    </Badge>
                    {scores1 && (
                      <>
                        <CircularScore 
                          score={scores1.overall} 
                          label="Global"
                          size="lg"
                          color={getPerformanceColor(scores1.overall)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {showStriking && (
                            <div className="text-center">
                              <CircularScore score={scores1.striking} label="Striking" size="sm" />
                            </div>
                          )}
                          {showGrappling && (
                            <div className="text-center">
                              <CircularScore score={scores1.grappling} label="Grappling" size="sm" />
                            </div>
                          )}
                          {showDefense && (
                            <div className="text-center">
                              <CircularScore score={scores1.defense} label="Défense" size="sm" />
                            </div>
                          )}
                          {showCardio && (
                            <div className="text-center">
                              <CircularScore score={scores1.cardio} label="Cardio" size="sm" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Fighter 2 */}
                  <div className="text-center space-y-4">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {fighter2?.identifier || "Combattant 2"}
                    </Badge>
                    {scores2 && (
                      <>
                        <CircularScore 
                          score={scores2.overall} 
                          label="Global"
                          size="lg"
                          color={getPerformanceColor(scores2.overall)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {showStriking && (
                            <div className="text-center">
                              <CircularScore score={scores2.striking} label="Striking" size="sm" />
                            </div>
                          )}
                          {showGrappling && (
                            <div className="text-center">
                              <CircularScore score={scores2.grappling} label="Grappling" size="sm" />
                            </div>
                          )}
                          {showDefense && (
                            <div className="text-center">
                              <CircularScore score={scores2.defense} label="Défense" size="sm" />
                            </div>
                          )}
                          {showCardio && (
                            <div className="text-center">
                              <CircularScore score={scores2.cardio} label="Cardio" size="sm" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  Résumé du Combat
                  {currentAnalysis.duration_estimate && (
                    <Badge variant="outline" className="ml-auto">
                      <Timer className="h-3 w-3 mr-1" />
                      {currentAnalysis.duration_estimate}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {currentAnalysis.summary}
                </p>
                {currentAnalysis.analysis_quality && (() => {
                  const q = currentAnalysis.analysis_quality;
                  const conf = q.confidence;
                  const tone = conf >= 75 ? 'text-green-600 border-green-500/30 bg-green-500/10'
                    : conf >= 50 ? 'text-yellow-600 border-yellow-500/30 bg-yellow-500/10'
                    : 'text-red-600 border-red-500/30 bg-red-500/10';
                  const qualityLabel = { poor: 'Médiocre', fair: 'Correcte', good: 'Bonne', excellent: 'Excellente' }[q.video_quality];
                  return (
                    <div className={`rounded-lg border p-3 space-y-2 ${tone}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span>Fiabilité de l'analyse : {conf}/100</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-foreground">Stats: {q.stats_confidence}/100</Badge>
                          <Badge variant="outline" className="text-foreground">Vidéo: {qualityLabel}</Badge>
                        </div>
                      </div>
                      {q.warnings.length > 0 && (
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                          {q.warnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            {stats1 && stats2 && (
              <>
                {/* Comparison Bars */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Comparaison des Stats
                    </CardTitle>
                    <div className="flex justify-between text-sm">
                      <Badge variant="outline" className="bg-red-500/10 text-red-400">
                        {fighter1?.identifier || "Combattant 1"}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                        {fighter2?.identifier || "Combattant 2"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StatComparisonBar
                      label="Coups de poing"
                      fighter1Value={stats1.punches_landed}
                      fighter2Value={stats2.punches_landed}
                      fighter1Name={fighter1?.identifier || "F1"}
                      fighter2Name={fighter2?.identifier || "F2"}
                    />
                    <StatComparisonBar
                      label="Coups de pied"
                      fighter1Value={stats1.kicks_landed}
                      fighter2Value={stats2.kicks_landed}
                      fighter1Name={fighter1?.identifier || "F1"}
                      fighter2Name={fighter2?.identifier || "F2"}
                    />
                    <StatComparisonBar
                      label="Takedowns réussis"
                      fighter1Value={stats1.takedowns_successful}
                      fighter2Value={stats2.takedowns_successful}
                      fighter1Name={fighter1?.identifier || "F1"}
                      fighter2Name={fighter2?.identifier || "F2"}
                    />
                    <StatComparisonBar
                      label="Temps au sol"
                      fighter1Value={stats1.ground_time_percent}
                      fighter2Value={stats2.ground_time_percent}
                      fighter1Name={fighter1?.identifier || "F1"}
                      fighter2Name={fighter2?.identifier || "F2"}
                      unit="%"
                    />
                  </CardContent>
                </Card>

                {/* Body Heatmaps */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-red-400" />
                        Zones touchées - {fighter1?.identifier || "Combattant 1"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BodyHeatmap
                        headStrikes={stats1.head_strikes || 0}
                        bodyStrikes={stats1.body_strikes || 0}
                        legStrikes={stats1.leg_strikes || 0}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-400" />
                        Zones touchées - {fighter2?.identifier || "Combattant 2"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BodyHeatmap
                        headStrikes={stats2.head_strikes || 0}
                        bodyStrikes={stats2.body_strikes || 0}
                        legStrikes={stats2.leg_strikes || 0}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Stats Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Statistiques détaillées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {/* Fighter 1 Stats */}
                      <div className="space-y-2">
                        <Badge className="bg-red-500/20 text-red-400 mb-2">
                          {fighter1?.identifier || "Combattant 1"}
                        </Badge>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Précision poings</p>
                            <p className="font-bold">
                              {stats1.punches_thrown > 0 
                                ? Math.round((stats1.punches_landed / stats1.punches_thrown) * 100) 
                                : 0}%
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Précision pieds</p>
                            <p className="font-bold">
                              {stats1.kicks_thrown > 0 
                                ? Math.round((stats1.kicks_landed / stats1.kicks_thrown) * 100) 
                                : 0}%
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Takedown %</p>
                            <p className="font-bold">
                              {stats1.takedowns_attempted > 0 
                                ? Math.round((stats1.takedowns_successful / stats1.takedowns_attempted) * 100) 
                                : 0}%
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Défense</p>
                            <p className="font-bold">{stats1.defense_rate || 0}%</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Fighter 2 Stats */}
                      <div className="space-y-2">
                        <Badge className="bg-blue-500/20 text-blue-400 mb-2">
                          {fighter2?.identifier || "Combattant 2"}
                        </Badge>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Précision poings</p>
                            <p className="font-bold">
                              {stats2.punches_thrown > 0 
                                ? Math.round((stats2.punches_landed / stats2.punches_thrown) * 100) 
                                : 0}%
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Précision pieds</p>
                            <p className="font-bold">
                              {stats2.kicks_thrown > 0 
                                ? Math.round((stats2.kicks_landed / stats2.kicks_thrown) * 100) 
                                : 0}%
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Takedown %</p>
                            <p className="font-bold">
                              {stats2.takedowns_attempted > 0 
                                ? Math.round((stats2.takedowns_successful / stats2.takedowns_attempted) * 100) 
                                : 0}%
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-xs text-muted-foreground">Défense</p>
                            <p className="font-bold">{stats2.defense_rate || 0}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Techniques Tab */}
          <TabsContent value="techniques" className="space-y-6">
            {currentAnalysis.techniques_observed && currentAnalysis.techniques_observed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" />
                    Techniques Observées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {currentAnalysis.techniques_observed.map((tech, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              tech.execution.toLowerCase().includes('bien') ? "bg-green-500" : "bg-yellow-500"
                            )} />
                            <div>
                              <p className="font-medium">{tech.technique}</p>
                              <p className="text-xs text-muted-foreground">
                                {tech.fighter} • {tech.timestamp_approx}
                              </p>
                            </div>
                          </div>
                          <Badge variant={tech.execution.toLowerCase().includes('bien') ? 'default' : 'secondary'}>
                            {tech.execution}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Fighters Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              {currentAnalysis.fighters?.map((fighter, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className={cn("h-4 w-4", i === 0 ? "text-red-400" : "text-blue-400")} />
                      {fighter.identifier}
                    </CardTitle>
                    <CardDescription>{fighter.style}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                        <ArrowUp className="h-3 w-3" /> Points forts
                      </p>
                      <ul className="space-y-1">
                        {fighter.strengths?.map((s, j) => (
                          <li key={j} className="text-sm flex items-start gap-2">
                            <Star className="h-3 w-3 text-green-400 mt-1 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                        <ArrowDown className="h-3 w-3" /> Points à travailler
                      </p>
                      <ul className="space-y-1">
                        {fighter.weaknesses?.map((w, j) => (
                          <li key={j} className="text-sm flex items-start gap-2">
                            <AlertCircle className="h-3 w-3 text-red-400 mt-1 flex-shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            {currentAnalysis.recommendations && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fighter 1 Recommendations */}
                <Card className="border-red-500/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-red-400" />
                      Conseils - {fighter1?.identifier || "Combattant 1"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {currentAnalysis.recommendations.fighter_1?.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-red-400">{i + 1}</span>
                          </div>
                          <p className="text-sm">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Fighter 2 Recommendations */}
                <Card className="border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      Conseils - {fighter2?.identifier || "Combattant 2"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {currentAnalysis.recommendations.fighter_2?.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-400">{i + 1}</span>
                          </div>
                          <p className="text-sm">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Overall Analysis */}
            {currentAnalysis.overall_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Analyse Globale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {currentAnalysis.overall_analysis}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <SparringProgressTracker />
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <SparringPDFExport 
            analysis={currentAnalysis}
            videoName={currentVideoName}
            analysisDate={new Date().toISOString()}
          />
          {currentAnalysisId && (
            <SparringShareDialog 
              analysisId={currentAnalysisId}
              videoName={currentVideoName}
            />
          )}
          <Button 
            variant="default" 
            className="gap-2"
            onClick={() => {
              setCurrentAnalysis(null);
              setCurrentVideoUrl(null);
              setCurrentAnalysisId(null);
              setCurrentVideoName("");
            }}
          >
            <Video className="h-4 w-4" />
            Nouvelle analyse
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="liquid-glass-solid border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Video className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Analyse Sparring IA
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  PRO
                </Badge>
                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 font-semibold">
                  BETA
                </Badge>
              </CardTitle>
              <CardDescription>
                Statistiques de combat professionnelles par intelligence artificielle
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1 italic">
                ⚠️ Fonctionnalité en version bêta. Les résultats sont fournis à titre indicatif et peuvent contenir des imprécisions.
              </p>
            </div>
          </div>
          
          {previousAnalyses.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Historique ({previousAnalyses.length})
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* History Panel */}
        {showHistory && previousAnalyses.length > 0 && (
          <Card className="bg-background/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Analyses précédentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {previousAnalyses.map((record) => (
                    <Button
                      key={record.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => loadAnalysis(record)}
                      disabled={record.status !== 'completed'}
                    >
                      <Video className="h-5 w-5 mr-3 flex-shrink-0 text-primary" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-medium truncate">{record.video_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge 
                        variant={record.status === 'completed' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {record.status === 'completed' ? '✓ Terminé' : '⏳ En cours'}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {currentAnalysis ? renderAnalysisResults() : renderUploadSection()}
      </CardContent>
    </Card>
  );
};

export default SparringAnalysisV2;

