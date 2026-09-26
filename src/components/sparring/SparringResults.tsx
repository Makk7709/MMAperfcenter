import { useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SparringPDFExport } from "./SparringPDFExport";
import { SparringProgressTracker } from "./SparringProgressTracker";
import {
  MOMENT_LABELS,
  QUALITY_LABELS,
  fighterKeyOf,
  fighterLabel,
  formatClock,
  percent,
  type FighterKey,
  type SparringAnalysisData,
} from "./types";

const CORNER = {
  fighter_1: { text: "text-corner-red", bg: "bg-corner-red", border: "border-corner-red", label: "Coin rouge" },
  fighter_2: { text: "text-corner-blue", bg: "bg-corner-blue", border: "border-corner-blue", label: "Coin bleu" },
} as const;

const METRIC_LABELS: Record<string, string> = {
  striking: "Frappe",
  grappling: "Lutte",
  defense: "Défense",
  cardio: "Cardio",
  technique: "Technique",
};

const VIDEO_QUALITY_LABELS = { poor: "Médiocre", fair: "Correcte", good: "Bonne", excellent: "Excellente" } as const;

interface SparringResultsProps {
  analysis: SparringAnalysisData;
  videoUrl: string | null;
  videoName: string;
  analysisDate: string;
  onNewAnalysis: () => void;
}

// ---------------------------------------------------------------------------

const ScoreBar = ({ label, value, corner }: { label: string; value: number; corner: FighterKey }) => (
  <div className="space-y-1">
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="korev-metric text-sm">{value}</span>
    </div>
    <div className="h-1 bg-muted">
      <div className={cn("h-full transition-[width] duration-700", CORNER[corner].bg)} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const CornerCard = ({ analysis, corner, metrics }: { analysis: SparringAnalysisData; corner: FighterKey; metrics: string[] }) => {
  const scores = analysis.performance_scores?.[corner];
  const fighter = analysis.fighters?.[corner === "fighter_1" ? 0 : 1];
  const isAthlete = corner === "fighter_1" && analysis.athlete_identified;
  return (
    <div className={cn("relative min-w-0 space-y-4 border-t-2 bg-korev-panel/70 p-4 sm:p-5", CORNER[corner].border)}>
      <div className="min-h-[5.5rem] min-w-0">
        <p className={cn("korev-eyebrow", CORNER[corner].text)}>{CORNER[corner].label}{isAthlete && " · vous"}</p>
        <p className="mt-1 truncate font-display text-lg font-semibold sm:text-xl">{fighterLabel(analysis, corner)}</p>
        {fighter?.style && <p className="truncate text-xs text-muted-foreground">{fighter.style}</p>}
        {isAthlete && fighter?.identifier && <p className="truncate text-xs text-muted-foreground">{fighter.identifier}</p>}
      </div>
      {scores && (
        <>
          <div className="flex items-end gap-2">
            <span className="korev-metric text-5xl leading-none sm:text-6xl">{scores.overall}</span>
            <span className="korev-eyebrow pb-1">/ 100</span>
          </div>
          <div className="space-y-2.5">
            {metrics.map((m) => (
              <ScoreBar key={m} label={METRIC_LABELS[m] ?? m} value={scores[m as keyof typeof scores] ?? 0} corner={corner} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ReliabilityPanel = ({ analysis }: { analysis: SparringAnalysisData }) => {
  const q = analysis.analysis_quality;
  if (!q) return null;
  const tone = q.confidence >= 75 ? "text-emerald-400" : q.confidence >= 50 ? "text-korev-gold" : "text-destructive";
  const coverage = analysis.sampling?.coverage_percent;
  const missedAthlete = Boolean(analysis.athlete_description) && !analysis.athlete_identified;
  return (
    <div className="space-y-3 border border-border/70 bg-korev-panel/60 p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn("h-4 w-4", tone)} />
          <span className="korev-eyebrow">Fiabilité</span>
          <span className={cn("korev-metric text-lg", tone)}>{q.confidence}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
        <span className="text-xs text-muted-foreground">Statistiques : <span className="text-foreground">{q.stats_confidence}/100</span></span>
        <span className="text-xs text-muted-foreground">Image : <span className="text-foreground">{VIDEO_QUALITY_LABELS[q.video_quality] ?? q.video_quality}</span></span>
        {coverage != null && (
          <span className="text-xs text-muted-foreground">Temps observé : <span className="text-foreground">{coverage} %</span></span>
        )}
      </div>
      {(q.warnings.length > 0 || missedAthlete) && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {missedAthlete && (
            <li className="flex gap-2"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-korev-gold" />Vous n'avez pas été reconnu avec certitude : les conseils couvrent les deux combattants.</li>
          )}
          {q.warnings.slice(0, 3).map((w) => (
            <li key={w} className="flex gap-2"><span className="korev-bullet mt-1" aria-hidden />{w}</li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground/80">Bêta : les volumes de coups sont des estimations extrapolées, à lire comme des tendances.</p>
    </div>
  );
};

const ComparisonRow = ({ label, a, b, unit = "" }: { label: string; a: number; b: number; unit?: string }) => {
  const share = a + b > 0 ? (a / (a + b)) * 100 : 50;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="korev-metric text-corner-red">{a}{unit}</span>
        <span className="korev-eyebrow">{label}</span>
        <span className="korev-metric text-corner-blue">{b}{unit}</span>
      </div>
      <div className="flex h-1.5 gap-0.5">
        <div className="bg-corner-red transition-[width] duration-700" style={{ width: `${share}%` }} />
        <div className="flex-1 bg-corner-blue" />
      </div>
    </div>
  );
};

const TargetSplit = ({ analysis, corner }: { analysis: SparringAnalysisData; corner: FighterKey }) => {
  const s = analysis.statistics?.[corner];
  if (!s) return null;
  const zones = [
    ["Tête", s.head_strikes || 0, "bg-korev-gold-light"],
    ["Corps", s.body_strikes || 0, "bg-korev-gold"],
    ["Jambes", s.leg_strikes || 0, "bg-korev-gold-deep"],
  ] as const;
  const total = zones.reduce((sum, [, v]) => sum + v, 0);
  return (
    <div className="space-y-2">
      <p className={cn("korev-eyebrow", CORNER[corner].text)}>{fighterLabel(analysis, corner)} · cibles</p>
      <div className="flex h-2 gap-0.5 bg-muted">
        {total > 0 && zones.map(([label, v, color]) => (
          <div key={label} className={color} style={{ width: `${(v / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        {zones.map(([label, v, color]) => (
          <span key={label} className="flex items-center gap-1.5"><span className={cn("h-2 w-2", color)} />{label} {percent(v, total)} %</span>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

export const SparringResults = ({ analysis, videoUrl, videoName, analysisDate, onNewAnalysis }: SparringResultsProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState("moments");

  const applicable = analysis.applicable_metrics?.length ? analysis.applicable_metrics : ["striking", "grappling", "defense", "cardio"];
  const metrics = ["striking", "grappling", "defense", "cardio", "technique"].filter(
    (m) => applicable.includes(m) && (m !== "technique" || analysis.performance_scores?.fighter_1?.technique !== undefined),
  );
  const s1 = analysis.statistics?.fighter_1;
  const s2 = analysis.statistics?.fighter_2;
  const duration = analysis.duration_seconds || 1;
  const moments = analysis.key_moments ?? [];
  const techniques = analysis.techniques_observed ?? [];
  const rounds = (analysis.rounds ?? []).filter((r) => r.key_events?.length || r.winner_suggestion !== "Indéterminé");
  const athleteFirst: FighterKey[] = ["fighter_1", "fighter_2"];

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    void video.play().catch(() => undefined);
    video.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-6 animate-korev-rise">
      {/* Report header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="korev-eyebrow">PRISM / Rapport de sparring</p>
          <h3 className="mt-2 truncate font-display text-2xl font-semibold sm:text-3xl">{videoName || "Sparring"}</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {[analysis.discipline, analysis.duration_estimate, new Date(analysisDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SparringPDFExport analysis={analysis} videoName={videoName} analysisDate={analysisDate} />
          <Button onClick={onNewAnalysis} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Nouvelle analyse
          </Button>
        </div>
      </div>

      {/* Fight card */}
      <div className="relative grid grid-cols-2 gap-px bg-border/60">
        <CornerCard analysis={analysis} corner="fighter_1" metrics={metrics} />
        <CornerCard analysis={analysis} corner="fighter_2" metrics={metrics} />
        <span aria-hidden className="korev-display absolute left-1/2 top-[7.5rem] -translate-x-1/2 border border-korev-gold/40 bg-korev-deep px-1.5 py-1 text-xs text-korev-gold">VS</span>
      </div>

      {analysis.summary && <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{analysis.summary}</p>}

      <ReliabilityPanel analysis={analysis} />

      {/* Video + dated moments */}
      {videoUrl && (
        <div className="space-y-2">
          <div className="overflow-hidden border border-border/70 bg-black">
            <video ref={videoRef} src={videoUrl} controls playsInline className="max-h-[60vh] w-full">
              <track kind="captions" />
            </video>
          </div>
          {moments.length > 0 && (
            <div className="relative h-6 border border-border/60 bg-korev-panel" aria-label="Moments clés sur la vidéo">
              {moments.map((m) => {
                const key = fighterKeyOf(analysis, m.fighter);
                return (
                  <button
                    key={`${m.timestamp_seconds}-${m.description}`}
                    type="button"
                    title={`${formatClock(m.timestamp_seconds)} · ${m.description}`}
                    onClick={() => seek(m.timestamp_seconds)}
                    className={cn(
                      "absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-y-150",
                      key ? CORNER[key].bg : "bg-korev-gold",
                      m.significance === "high" && "h-5 w-2",
                    )}
                    style={{ left: `${Math.min(99, Math.max(1, (m.timestamp_seconds / duration) * 100))}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max min-w-full justify-start">
            <TabsTrigger value="moments">Moments clés</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="techniques">Techniques</TabsTrigger>
            <TabsTrigger value="advice">Conseils</TabsTrigger>
            {rounds.length > 0 && <TabsTrigger value="rounds">Rounds</TabsTrigger>}
            <TabsTrigger value="progress">Progression</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="moments" className="mt-4">
          {moments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun moment clé daté dans cette analyse.</p>
          ) : (
            <ol className="divide-y divide-border/60 border border-border/60">
              {moments.map((m) => {
                const key = fighterKeyOf(analysis, m.fighter);
                return (
                  <li key={`${m.timestamp_seconds}-${m.description}`}>
                    <button
                      type="button"
                      disabled={!videoUrl}
                      onClick={() => seek(m.timestamp_seconds)}
                      className="group flex w-full items-start gap-3 bg-korev-panel/40 p-3 text-left transition-colors enabled:hover:bg-korev-panel-2 disabled:cursor-default"
                    >
                      <span className={cn("mt-0.5 h-10 w-0.5 shrink-0", key ? CORNER[key].bg : "bg-korev-gold")} />
                      <span className="w-12 shrink-0 font-mono text-sm text-korev-gold">{formatClock(m.timestamp_seconds)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="korev-eyebrow text-[10px]">{MOMENT_LABELS[m.type] ?? m.type}</span>
                          {key && <span className={cn("text-xs", CORNER[key].text)}>{fighterLabel(analysis, key)}</span>}
                          {m.significance === "high" && <Badge variant="outline" className="border-korev-gold/50 text-[10px] text-korev-gold">Décisif</Badge>}
                        </span>
                        <span className="mt-0.5 block text-sm">{m.description}</span>
                      </span>
                      {videoUrl && <Play className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-korev-gold" />}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {!videoUrl && moments.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">La vidéo n'est pas conservée : réimportez-la pour revoir les moments.</p>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4 space-y-6">
          {s1 && s2 && (
            <>
              <div className="space-y-4 border border-border/60 bg-korev-panel/40 p-4">
                {applicable.includes("striking") && (
                  <>
                    <ComparisonRow label="Poings touchés" a={s1.punches_landed} b={s2.punches_landed} />
                    {(s1.kicks_thrown + s2.kicks_thrown > 0) && <ComparisonRow label="Pieds touchés" a={s1.kicks_landed} b={s2.kicks_landed} />}
                    <ComparisonRow label="Coups significatifs" a={s1.significant_strikes} b={s2.significant_strikes} />
                  </>
                )}
                {applicable.includes("grappling") && (s1.takedowns_attempted + s2.takedowns_attempted > 0) && (
                  <ComparisonRow label="Amenées au sol" a={s1.takedowns_successful} b={s2.takedowns_successful} />
                )}
                {applicable.includes("defense") && <ComparisonRow label="Défense" a={s1.defense_rate} b={s2.defense_rate} unit="%" />}
              </div>

              <div className="grid grid-cols-2 gap-px bg-border/60">
                {(["fighter_1", "fighter_2"] as const).map((key) => {
                  const s = analysis.statistics[key];
                  const tiles = [
                    ["Précision poings", `${percent(s.punches_landed, s.punches_thrown)} %`, applicable.includes("striking")],
                    ["Précision pieds", `${percent(s.kicks_landed, s.kicks_thrown)} %`, applicable.includes("striking") && s.kicks_thrown > 0],
                    ["Réussite au sol", `${percent(s.takedowns_successful, s.takedowns_attempted)} %`, applicable.includes("grappling") && s.takedowns_attempted > 0],
                    ["Coups lancés", String(s.punches_thrown + s.kicks_thrown), applicable.includes("striking")],
                  ] as const;
                  return (
                    <div key={key} className="space-y-3 bg-korev-panel/70 p-4">
                      <p className={cn("korev-eyebrow", CORNER[key].text)}>{fighterLabel(analysis, key)}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {tiles.filter(([, , show]) => show).map(([label, value]) => (
                          <div key={label}>
                            <p className="korev-metric text-2xl">{value}</p>
                            <p className="text-[11px] text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {applicable.includes("striking") && (
                <div className="grid gap-5 border border-border/60 bg-korev-panel/40 p-4 sm:grid-cols-2">
                  <TargetSplit analysis={analysis} corner="fighter_1" />
                  <TargetSplit analysis={analysis} corner="fighter_2" />
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="techniques" className="mt-4 space-y-6">
          {techniques.length > 0 && (
            <ul className="divide-y divide-border/60 border border-border/60">
              {techniques.map((t, i) => {
                const key = fighterKeyOf(analysis, t.fighter);
                const quality = t.quality ?? "average";
                return (
                  <li key={`${t.technique}-${t.fighter}-${i}`} className="flex items-start gap-3 bg-korev-panel/40 p-3">
                    <span className={cn("mt-1 h-2 w-2 shrink-0", key ? CORNER[key].bg : "bg-korev-gold")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{t.technique}</span>
                        {t.timestamp_seconds != null && <span className="font-mono text-xs text-korev-gold">{formatClock(t.timestamp_seconds)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {key ? fighterLabel(analysis, key) : t.fighter}
                        {t.execution && ` · ${t.execution}`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px]",
                        quality === "good" && "border-emerald-500/40 text-emerald-400",
                        quality === "average" && "border-korev-gold/40 text-korev-gold",
                        quality === "poor" && "border-destructive/50 text-destructive",
                      )}
                    >
                      {QUALITY_LABELS[quality]}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="grid gap-px bg-border/60 sm:grid-cols-2">
            {athleteFirst.map((key) => {
              const fighter = analysis.fighters?.[key === "fighter_1" ? 0 : 1];
              if (!fighter) return null;
              return (
                <div key={key} className="space-y-3 bg-korev-panel/70 p-4">
                  <p className={cn("korev-eyebrow", CORNER[key].text)}>{fighterLabel(analysis, key)}</p>
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-emerald-400"><ArrowUp className="h-3 w-3" />Points forts</p>
                    <ul className="space-y-1 text-sm">{fighter.strengths?.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-destructive"><ArrowDown className="h-3 w-3" />À travailler</p>
                    <ul className="space-y-1 text-sm">{fighter.weaknesses?.map((w) => <li key={w}>{w}</li>)}</ul>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="advice" className="mt-4 space-y-6">
          {athleteFirst.map((key) => {
            const recs = analysis.recommendations?.[key] ?? [];
            if (recs.length === 0) return null;
            const primary = key === "fighter_1" && analysis.athlete_identified;
            const secondary = key === "fighter_2" && analysis.athlete_identified;
            return (
              <div key={key} className={cn("space-y-3", secondary && "opacity-80")}>
                <p className={cn("korev-eyebrow", CORNER[key].text)}>
                  {primary ? "Vos axes de travail" : `Conseils · ${fighterLabel(analysis, key)}`}
                </p>
                <ol className="space-y-2">
                  {recs.map((rec, i) => (
                    <li key={rec} className={cn("flex gap-3 border border-border/60 bg-korev-panel/50 p-3", primary && "border-korev-gold/30")}>
                      <span className="korev-metric w-6 shrink-0 text-lg text-korev-gold">{String(i + 1).padStart(2, "0")}</span>
                      <p className="text-sm">{rec}</p>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
          {analysis.overall_analysis && (
            <div className="space-y-2 border-l-2 border-korev-gold/60 pl-4">
              <p className="korev-eyebrow">Lecture tactique</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{analysis.overall_analysis}</p>
            </div>
          )}
        </TabsContent>

        {rounds.length > 0 && (
          <TabsContent value="rounds" className="mt-4">
            <ol className="grid gap-px bg-border/60 sm:grid-cols-2">
              {rounds.map((r) => (
                <li key={r.number} className="space-y-2 bg-korev-panel/70 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="korev-display text-xl">Round {r.number}</span>
                    <span className="text-xs text-korev-gold">{r.winner_suggestion}</span>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {r.key_events?.map((e) => <li key={e} className="flex gap-2"><span className="korev-bullet mt-1.5" aria-hidden />{e}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
          </TabsContent>
        )}

        <TabsContent value="progress" className="mt-4">
          <SparringProgressTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
};
