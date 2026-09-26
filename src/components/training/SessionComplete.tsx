import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { PerformanceSummary } from "./PerformanceOverview";
import { useTrainingProgress, type FinishedSession } from "@/hooks/useTraining";
import { effortLabel, recordsBeaten, type NewRecord } from "@/lib/training/performance";

const num = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const recordText = (r: NewRecord) => {
  switch (r.kind) {
    case "weight":
      return { title: r.name, value: `${num(r.value)} kg`, previous: `${num(r.previous)} kg` };
    case "volume":
      return { title: "Volume de séance", value: `${num(r.value)} kg`, previous: `${num(r.previous)} kg` };
    case "rounds":
      return { title: "Rounds sur une séance", value: String(r.value), previous: String(r.previous) };
  }
};

export function SessionComplete({ session }: { session: FinishedSession }) {
  const navigate = useNavigate();
  const { data: progress } = useTrainingProgress();
  const records = progress ? recordsBeaten(progress.sessions, session.id) : [];

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
            <p className="korev-eyebrow">Charge de la séance</p>
            <p className="korev-metric text-6xl leading-none text-korev-gold">{session.load.toLocaleString("fr-FR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Effort {session.effort}/10 ({effortLabel(session.effort).toLowerCase()}) × {session.minutes} min
            </p>
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

      {records.length > 0 && (
        <section className="border border-korev-gold/40 bg-korev-gold/5 p-4" aria-label="Records battus">
          <p className="korev-eyebrow flex items-center gap-2 text-korev-gold">
            <Trophy className="h-3.5 w-3.5" />
            {records.length > 1 ? `${records.length} records battus` : "Record battu"}
          </p>
          <ul className="mt-2 divide-y divide-border">
            {records.map((r) => {
              const t = recordText(r);
              return (
                <li key={`${r.kind}-${t.title}`} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm">{t.title}</span>
                  <span className="shrink-0 text-right">
                    <span className="korev-metric text-base text-korev-gold">{t.value}</span>
                    <span className="ml-2 text-xs text-muted-foreground">avant {t.previous}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <PerformanceSummary progress={progress} />

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
