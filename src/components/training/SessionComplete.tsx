import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { WolfRankDisplay } from "@/components/gamification/WolfRankDisplay";
import { useTrainingProgress, type FinishedSession } from "@/hooks/useTraining";

export function SessionComplete({ session }: { session: FinishedSession }) {
  const navigate = useNavigate();
  const { data: progress } = useTrainingProgress();

  const metrics = [
    { label: "Durée", value: session.minutes, unit: "min" },
    { label: "Séries", value: session.setsCompleted, unit: "" },
    { label: "Volume", value: session.volumeKg.toLocaleString("fr-FR"), unit: "kg" },
    { label: "Rounds", value: session.rounds, unit: "" },
  ];

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center gap-6 px-4 py-10 animate-korev-rise">
      <div>
        <Eyebrow parts={["Séance", "Enregistrée"]} />
        <h1 className="korev-display mt-3 text-4xl sm:text-5xl">{session.name}</h1>
        <span className="korev-rule mt-4" />
      </div>

      <div className="korev-frame korev-chamfer p-5 [--chamfer:16px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="korev-eyebrow">XP gagnée</p>
            <p className="korev-metric text-6xl leading-none text-korev-gold">+{session.xp}</p>
          </div>
          <div className="text-right">
            <p className="korev-eyebrow">Dépense estimée</p>
            <p className="korev-metric text-2xl">
              {session.calories} <span className="text-sm text-muted-foreground">kcal</span>
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-4 gap-px border border-border bg-border">
          {metrics.map((m) => (
            <div key={m.label} className="bg-card px-2 py-3 text-center">
              <dt className="korev-eyebrow text-[10px]">{m.label}</dt>
              <dd className="korev-metric mt-1 text-xl">
                {m.value}
                {m.unit && <span className="ml-0.5 text-xs text-muted-foreground">{m.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Dépense calculée à partir du type de séance, de l'intensité, de la durée et du poids de votre profil.
        </p>
      </div>

      {progress && <WolfRankDisplay currentXP={progress.totalXP} variant="compact" />}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="sm:flex-1" onClick={() => navigate("/history")}>
          Voir l'historique
        </Button>
        <Button className="sm:flex-1" onClick={() => navigate("/")}>
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
}
