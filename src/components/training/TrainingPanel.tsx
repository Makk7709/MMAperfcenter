import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Dumbbell, Play, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { CampCard, ConsistencyCard, LoadCard, RecordsCard } from "./PerformanceOverview";
import { StartSessionTrigger } from "./StartSessionTrigger";
import { useActiveWorkout, useTrainingProgress } from "@/hooks/useTraining";
import { SESSION_PATH, SESSION_TYPE_LABELS } from "@/lib/training/session";

export function TrainingPanel() {
  const navigate = useNavigate();
  const { workout } = useActiveWorkout();
  const { data: progress, isLoading, isError } = useTrainingProgress();

  const stats = [
    { label: "Cette semaine", value: progress?.consistency.thisWeek ?? 0, unit: "séances" },
    { label: "Série en cours", value: progress?.streakDays ?? 0, unit: "jours" },
    { label: "Au total", value: progress?.totalSessions ?? 0, unit: "séances" },
  ];

  return (
    <div className="space-y-4">
      {workout ? (
        <section className="korev-frame korev-chamfer p-5 [--chamfer:16px] sm:p-6">
          <Eyebrow parts={["Séance", "En cours"]} bullet />
          <h3 className="korev-display mt-3 text-3xl">{workout.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {SESSION_TYPE_LABELS[workout.session_type]} · démarrée il y a{" "}
            {formatDistanceToNowStrict(new Date(workout.started_at), { locale: fr })}
          </p>
          <Button className="mt-5 w-full sm:w-auto" size="lg" onClick={() => navigate(SESSION_PATH)}>
            <Play className="h-4 w-4 fill-current" />
            Reprendre la séance
          </Button>
        </section>
      ) : (
        <section className="korev-frame korev-chamfer relative overflow-hidden p-5 [--chamfer:16px] sm:p-6">
          <Eyebrow parts={["Préparation", "Physique"]} bullet />
          <h3 className="korev-display mt-3 text-3xl sm:text-4xl">Une séance, tout suivi.</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Rounds chronométrés, séries et charges, repos minuté : tout est enregistré et alimente votre constance, votre charge et vos records.
          </p>
          <StartSessionTrigger>
            {({ onClick, loading }) => (
              <Button className="mt-5 w-full sm:w-auto" size="lg" onClick={onClick} disabled={loading}>
                <Play className="h-4 w-4 fill-current" />
                Nouvelle séance
              </Button>
            )}
          </StartSessionTrigger>
        </section>
      )}

      <dl className="grid grid-cols-3 gap-px border border-border bg-border">
        {stats.map((s) => (
          <div key={s.label} className="bg-card px-3 py-4">
            <dt className="korev-eyebrow text-[10px]">{s.label}</dt>
            <dd className="korev-metric mt-1.5 text-3xl leading-none">
              {isLoading ? "–" : s.value}
              <span className="ml-1 text-xs font-normal text-muted-foreground">{s.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      {isError && (
        <p className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
          Impossible de charger vos indicateurs pour le moment. Vos séances restent enregistrées.
        </p>
      )}

      {progress && (
        <>
          <CampCard camp={progress.camp} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ConsistencyCard consistency={progress.consistency} />
            <LoadCard load={progress.load} />
          </div>
          <RecordsCard records={progress.records} />
        </>
      )}

      <section className="liquid-glass-solid p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="korev-eyebrow">Dernières séances</p>
          <Link to="/history" className="inline-flex items-center gap-1 text-xs text-korev-gold hover:underline">
            Historique <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {progress && progress.recent.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Aucune séance enregistrée pour l'instant.</p>
        )}
        <ul className="mt-3 divide-y divide-border">
          {progress?.recent.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-korev-gold/30 text-korev-gold">
                {r.rounds_completed > 0 ? <Timer className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {SESSION_TYPE_LABELS[r.session_type]} ·{" "}
                  {r.completed_at && formatDistanceToNowStrict(new Date(r.completed_at), { locale: fr, addSuffix: true })}
                </p>
              </div>
              <p className="korev-metric shrink-0 text-right text-sm">
                {r.duration_minutes} <span className="text-xs text-muted-foreground">min</span>
                {r.total_volume_kg > 0 && (
                  <span className="block text-xs text-muted-foreground">{r.total_volume_kg.toLocaleString("fr-FR")} kg</span>
                )}
                {r.total_volume_kg === 0 && r.rounds_completed > 0 && (
                  <span className="block text-xs text-muted-foreground">{r.rounds_completed} rounds</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
