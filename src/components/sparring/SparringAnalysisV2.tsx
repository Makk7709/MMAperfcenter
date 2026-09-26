import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronRight, History, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { readFunctionError } from "@/lib/functionError";
import { FeaturePaywall } from "@/components/FeaturePaywall";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { convertToSignedUrl } from "@/utils/storageUtils";
import { extractMotionSheets } from "@/utils/motionSheetExtractor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SparringUploadPanel } from "./SparringUploadPanel";
import { SparringProcessing, type ProcessingStage } from "./SparringProcessing";
import { SparringResults } from "./SparringResults";
import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_SIZE_MB, type AnalysisRecord, type SparringAnalysisData } from "./types";

const ATHLETE_STORAGE_KEY = "korev.sparring.athlete";
const MIN_SHEETS = 3;

const validateVideoFile = (file: File): string | null => {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) return "Format non supporté. Utilisez MP4, MOV, WebM ou AVI.";
  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(0)} Mo). Maximum ${MAX_VIDEO_SIZE_MB} Mo.`;
  }
  return null;
};

const readStoredAthlete = () => {
  try {
    return localStorage.getItem(ATHLETE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  completed: { label: "Terminé", className: "border-korev-gold/40 text-korev-gold" },
  error: { label: "Échec", className: "border-destructive/50 text-destructive" },
};

export const SparringAnalysisV2 = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { gate, paywallOpen, setPaywallOpen } = useFeatureGate("sparring_analysis");

  const [stage, setStage] = useState<ProcessingStage | null>(null);
  const [extractProgress, setExtractProgress] = useState({ done: 0, total: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzeStartedAt, setAnalyzeStartedAt] = useState<number | null>(null);

  const [currentAnalysis, setCurrentAnalysis] = useState<SparringAnalysisData | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVideoName, setCurrentVideoName] = useState("");
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString());

  const [previousAnalyses, setPreviousAnalyses] = useState<AnalysisRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [discipline, setDiscipline] = useState("auto");
  const [athlete, setAthlete] = useState(readStoredAthlete);

  const busy = stage !== null;

  useEffect(() => {
    if (profile?.martial_arts_discipline && discipline === "auto") setDiscipline(profile.martial_arts_discipline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.martial_arts_discipline]);

  useEffect(() => {
    try {
      localStorage.setItem(ATHLETE_STORAGE_KEY, athlete);
    } catch {
      // Private mode: the description is simply not remembered.
    }
  }, [athlete]);

  const refreshPreviousAnalyses = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("sparring_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("Error fetching analyses:", error);
      return;
    }
    setPreviousAnalyses((data || []) as unknown as AnalysisRecord[]);
  }, [user]);

  useEffect(() => {
    void refreshPreviousAnalyses();
  }, [refreshPreviousAnalyses]);

  // The local video is played through a blob: URL, released when replaced.
  useEffect(() => {
    if (!currentVideoUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(currentVideoUrl);
  }, [currentVideoUrl]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-center text-muted-foreground">Connectez-vous pour utiliser l'analyse de sparring IA.</p>
      </div>
    );
  }

  const resetProcessing = () => {
    setStage(null);
    setExtractProgress({ done: 0, total: 0 });
    setPreviewUrl(null);
    setAnalyzeStartedAt(null);
  };

  const handleVideo = async (file: File) => {
    const validationError = validateVideoFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    // Read-only access check; the quota is consumed by the Edge Function.
    if (!(await gate())) return;

    setShowHistory(false);
    setStage("extract");
    let recordId: string | undefined;
    try {
      const { sheets, duration, burstSpacing } = await extractMotionSheets(file, {
        onProgress: (done, total) => setExtractProgress({ done, total }),
        onPreview: setPreviewUrl,
      });
      if (sheets.length < MIN_SHEETS) {
        throw new Error("Image trop sombre ou illisible : impossible d'extraire assez de planches.");
      }

      setStage("send");
      const { data: record, error: recordError } = await supabase
        .from("sparring_analyses")
        .insert({ user_id: user.id, video_url: "", video_name: file.name, status: "pending" })
        .select("id")
        .single();
      if (recordError) throw recordError;
      recordId = record?.id as string | undefined;

      setStage("analyze");
      setAnalyzeStartedAt(Date.now());
      // No client retry: the server already retries within its time budget,
      // and re-sending while it still runs would double the AI cost.
      const { data, error } = await supabase.functions.invoke("analyze-sparring", {
        body: {
          frames: sheets.map(({ base64, timestamps }) => ({ base64, timestamps })),
          layout: "sheet_2x2",
          burstSpacing,
          totalDuration: duration,
          analysisId: recordId,
          videoName: file.name,
          qualityMode: "pro",
          discipline: discipline === "auto" ? (profile?.martial_arts_discipline ?? null) : discipline,
          athlete: athlete.trim() || undefined,
        },
      });
      if (error) {
        const { message } = await readFunctionError(error, "Erreur d'analyse");
        throw new Error(message);
      }
      if (!data?.success) throw new Error(data?.error || "Erreur d'analyse");

      setCurrentAnalysis(data.analysis as SparringAnalysisData);
      setCurrentVideoName(file.name);
      setCurrentVideoUrl(URL.createObjectURL(file));
      setCurrentDate(new Date().toISOString());
      toast.success("Analyse terminée.");
      await refreshPreviousAnalyses();
    } catch (error) {
      console.error("Sparring analysis failed:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'analyse");
      // Rejected before the server took over (quota, size) or killed at its
      // time limit: the record would otherwise stay "in progress" forever.
      if (recordId) {
        await supabase
          .from("sparring_analyses")
          .update({ status: "error" })
          .eq("id", recordId)
          .in("status", ["pending", "processing"]);
        await refreshPreviousAnalyses();
      }
    } finally {
      resetProcessing();
    }
  };

  const loadAnalysis = async (record: AnalysisRecord) => {
    if (!record.analysis) return;
    setCurrentAnalysis(record.analysis);
    setCurrentVideoName(record.video_name);
    setCurrentDate(record.created_at);
    setShowHistory(false);
    setCurrentVideoUrl(record.video_url ? await convertToSignedUrl(record.video_url, "sparring-videos", 3600) : null);
  };

  const closeResults = () => {
    setCurrentAnalysis(null);
    setCurrentVideoUrl(null);
    setCurrentVideoName("");
  };

  let body: JSX.Element;
  if (stage) {
    body = (
      <SparringProcessing
        stage={stage}
        extractDone={extractProgress.done}
        extractTotal={extractProgress.total}
        previewUrl={previewUrl}
        analyzeStartedAt={analyzeStartedAt}
      />
    );
  } else if (currentAnalysis) {
    body = (
      <SparringResults
        analysis={currentAnalysis}
        videoUrl={currentVideoUrl}
        videoName={currentVideoName}
        analysisDate={currentDate}
        onNewAnalysis={closeResults}
      />
    );
  } else {
    body = (
      <SparringUploadPanel
        discipline={discipline}
        onDisciplineChange={setDiscipline}
        athlete={athlete}
        onAthleteChange={setAthlete}
        onFile={handleVideo}
        disabled={busy}
      />
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <Eyebrow parts={["PRISM", "Analyse vidéo IA"]} bullet />
          <h2 className="korev-display mt-3 flex items-center gap-3 text-3xl sm:text-4xl">
            Analyse de sparring
            <Badge variant="outline" className="border-korev-gold/50 font-mono text-[10px] tracking-[0.16em] text-korev-gold">BÊTA</Badge>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Statistiques, moments clés datés et axes de travail, estimés par IA à partir de votre vidéo.
          </p>
        </div>
        {previousAnalyses.length > 0 && !busy && (
          <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)} className="gap-2">
            {showHistory ? <X className="h-4 w-4" /> : <History className="h-4 w-4" />}
            Historique ({previousAnalyses.length})
          </Button>
        )}
      </header>

      {showHistory && (
        <ul className="divide-y divide-border/60 border border-border/60 animate-korev-rise">
          {previousAnalyses.map((record) => {
            const badge = STATUS_BADGE[record.status] ?? { label: "En cours", className: "border-border text-muted-foreground" };
            const openable = record.status === "completed" && !!record.analysis;
            return (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => loadAnalysis(record)}
                  disabled={!openable}
                  className="group flex w-full items-center gap-3 bg-korev-panel/40 p-3 text-left transition-colors enabled:hover:bg-korev-panel-2 disabled:cursor-default"
                >
                  <span className="korev-metric w-10 shrink-0 text-lg text-korev-gold">
                    {record.analysis?.performance_scores?.fighter_1?.overall ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{record.video_name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <Badge variant="outline" className={cn("shrink-0 text-[10px]", badge.className)}>{badge.label}</Badge>
                  {openable && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-korev-gold" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {body}
      <FeaturePaywall feature="sparring_analysis" open={paywallOpen} onOpenChange={setPaywallOpen} />
    </section>
  );
};

export default SparringAnalysisV2;
