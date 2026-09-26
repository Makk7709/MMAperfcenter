import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell, Flag, Loader2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { ExerciseBlock } from "@/components/training/ExerciseBlock";
import { ExercisePickerDialog } from "@/components/training/ExercisePickerDialog";
import { FinishSessionDialog } from "@/components/training/FinishSessionDialog";
import { RestTimerBar } from "@/components/training/RestTimerBar";
import { RoundTimerPanel } from "@/components/training/RoundTimerPanel";
import { SessionComplete } from "@/components/training/SessionComplete";
import { StartSessionTrigger } from "@/components/training/StartSessionTrigger";
import { useActiveWorkout, type FinishedSession } from "@/hooks/useTraining";
import { useCountdown } from "@/hooks/useTimers";
import {
  formatClock,
  INTENSITY_LABELS,
  sessionMinutes,
  SESSION_TYPE_LABELS,
  summarizeSets,
} from "@/lib/training/session";

const useNowEverySecond = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

export default function TrainingSession() {
  const navigate = useNavigate();
  const session = useActiveWorkout();
  const { workout, isLoading, pending } = session;
  const rest = useCountdown();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finished, setFinished] = useState<FinishedSession | null>(null);
  const now = useNowEverySecond();

  const { setRoundsCompleted } = session;
  const onRoundsCompleted = useCallback((n: number) => void setRoundsCompleted(n), [setRoundsCompleted]);

  if (finished) {
    return (
      <Shell>
        <SessionComplete session={finished} />
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Chargement de la séance" />
        </div>
      </Shell>
    );
  }

  if (!workout) {
    return (
      <Shell>
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <Eyebrow parts={["Séance", "Aucune en cours"]} />
          <h1 className="korev-display text-4xl">Prêt à vous entraîner ?</h1>
          <p className="text-muted-foreground">Lancez une séance à rounds, de musculation ou les deux à la fois.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>Tableau de bord</Button>
            <StartSessionTrigger>{({ onClick }) => <Button onClick={onClick}>Nouvelle séance</Button>}</StartSessionTrigger>
          </div>
        </div>
      </Shell>
    );
  }

  const elapsedSeconds = Math.max(0, (now - new Date(workout.started_at).getTime()) / 1000);
  const sets = summarizeSets(workout.workout_exercises);
  const hasRounds = !!workout.planned_rounds && !!workout.round_seconds;

  const finish = async (input: Parameters<typeof session.finish>[0]) => {
    const result = await session.finish(input);
    if (result) {
      rest.stop();
      localStorage.removeItem(`korev.session.rounds.${workout.id}`);
      setFinishOpen(false);
      setFinished(result);
    }
  };

  const discard = async () => {
    if (!(await session.discard())) return;
    rest.stop();
    localStorage.removeItem(`korev.session.rounds.${workout.id}`);
    navigate("/");
  };

  return (
    <Shell>
      <header className="sticky top-0 z-30 border-b border-border bg-korev-deep/90 backdrop-blur-md">
        <div className="container flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" asChild aria-label="Retour au tableau de bord (la séance reste ouverte)">
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="korev-eyebrow truncate text-[10px]">
              {SESSION_TYPE_LABELS[workout.session_type]} / {INTENSITY_LABELS[workout.intensity]}
            </p>
            <h1 className="truncate font-display text-lg font-semibold uppercase leading-tight">{workout.name}</h1>
          </div>
          <div className="text-right">
            <p className="korev-eyebrow text-[10px]">Temps</p>
            <p className="korev-metric text-lg leading-tight" aria-label="Temps écoulé depuis le début de la séance">{formatClock(elapsedSeconds)}</p>
          </div>
          <Button size="sm" onClick={() => setFinishOpen(true)} disabled={pending}>
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">Terminer</span>
          </Button>
        </div>
      </header>

      <main className={`container max-w-3xl space-y-6 px-4 py-6 ${rest.active ? "pb-28" : "pb-12"}`}>
        {hasRounds && (
          <RoundTimerPanel
            key={workout.id}
            workoutId={workout.id}
            plan={{ rounds: workout.planned_rounds!, workSeconds: workout.round_seconds!, restSeconds: workout.rest_seconds ?? 60 }}
            savedRounds={workout.rounds_completed}
            onRoundsCompleted={onRoundsCompleted}
          />
        )}

        <section aria-labelledby="exercises-title" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="korev-eyebrow">{hasRounds ? "Complément" : "Programme"}</p>
              <h2 id="exercises-title" className="font-display text-xl font-semibold uppercase">Exercices</h2>
            </div>
            {sets.setsCompleted > 0 && (
              <p className="korev-eyebrow text-right">
                <span className="text-foreground">{sets.setsCompleted}</span> séries · <span className="text-foreground">{sets.volumeKg.toLocaleString("fr-FR")}</span> kg
              </p>
            )}
          </div>

          {workout.workout_exercises.length === 0 && (
            <div className="border border-dashed border-border px-5 py-8 text-center">
              <Dumbbell className="mx-auto h-6 w-6 text-korev-gold" />
              <p className="mt-3 font-medium">{hasRounds ? "Ajoutez du renforcement après vos rounds" : "Ajoutez votre premier exercice"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Chaque série validée lance le minuteur de repos.</p>
            </div>
          )}

          {workout.workout_exercises.map((we) => (
            <ExerciseBlock
              key={we.id}
              exercise={we}
              disabled={pending}
              onAddSet={() => void session.addSet(we.id)}
              onUpdateSet={(setId, values) => session.updateSet(we.id, setId, values)}
              onDeleteSet={(setId) => void session.deleteSet(we.id, setId)}
              onRemove={() => void session.removeExercise(we.id)}
              onSetDone={(seconds) => rest.start(seconds)}
            />
          ))}

          <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)} disabled={pending}>
            <Plus className="h-4 w-4" />
            Ajouter un exercice
          </Button>
        </section>

        <div className="flex justify-center pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={pending}>
                Abandonner la séance
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Abandonner cette séance ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Elle sera supprimée avec ses séries et n'apparaîtra ni dans l'historique ni dans vos statistiques.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuer la séance</AlertDialogCancel>
                <AlertDialogAction onClick={discard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Abandonner
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <ExercisePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onPick={(id) => void session.addExercise(id)} />
      <FinishSessionDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        minutes={sessionMinutes(workout.started_at, new Date(now))}
        rounds={workout.rounds_completed}
        sets={sets}
        pending={pending}
        onConfirm={finish}
      />
      <RestTimerBar active={rest.active} remaining={rest.remaining} total={rest.total} onAdd={rest.add} onSkip={rest.stop} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-korev-deep">
      <div className="korev-grid pointer-events-none fixed inset-0 opacity-60" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}
