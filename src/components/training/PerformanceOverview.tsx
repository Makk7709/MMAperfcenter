import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { cn } from "@/lib/utils";
import { fromDateKey } from "@/lib/dateKey";
import {
  CAMP_WEEKS,
  LOAD_ZONE_BOUNDS,
  MIN_HISTORY_DAYS,
  type Consistency,
  type FightCamp,
  type LoadZone,
  type Records,
  type TrainingLoad,
} from "@/lib/training/performance";
import type { TrainingProgress } from "@/hooks/useTraining";

const num = (v: number, digits = 0) => v.toLocaleString("fr-FR", { maximumFractionDigits: digits });
const shortDay = (key: string) => format(fromDateKey(key), "d MMM", { locale: fr });
const plural = (count: number, one: string, many: string) => `${num(count)} ${count > 1 ? many : one}`;

const LOAD_ZONES: Record<LoadZone, { label: string; tone: string; advice: string }> = {
  calibrating: {
    label: "Calibrage",
    tone: "text-muted-foreground",
    advice: "La charge compare votre semaine à votre moyenne : il faut trois semaines d'historique.",
  },
  low: {
    label: "Sous-charge",
    tone: "text-corner-blue",
    advice: "Semaine plus légère que votre habitude. Normal en récupération, à relancer sinon.",
  },
  optimal: {
    label: "Zone optimale",
    tone: "text-korev-gold",
    advice: "Charge de la semaine alignée sur votre moyenne des quatre dernières semaines.",
  },
  high: {
    label: "Charge élevée",
    tone: "text-orange-400",
    advice: "Semaine nettement au-dessus de votre moyenne : surveillez sommeil et récupération.",
  },
  danger: {
    label: "Risque de surmenage",
    tone: "text-corner-red",
    advice: "Hausse brutale de la charge : allégez les prochains jours pour limiter le risque de blessure.",
  },
};

// ---------------------------------------------------------------- gauges

const GAUGE_MAX = 2;
const pct = (ratio: number) => `${(Math.min(ratio, GAUGE_MAX) / GAUGE_MAX) * 100}%`;

function LoadGauge({ load }: { load: TrainingLoad }) {
  if (load.zone === "calibrating") {
    const done = MIN_HISTORY_DAYS - load.calibrationDaysLeft;
    return (
      <div className="space-y-1.5">
        <div
          role="progressbar"
          aria-label="Historique nécessaire au calcul de la charge"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={MIN_HISTORY_DAYS}
          className="h-1.5 overflow-hidden bg-muted"
        >
          <div className="h-full bg-foreground/40" style={{ width: `${(done / MIN_HISTORY_DAYS) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          Disponible dans {plural(load.calibrationDaysLeft, "jour", "jours")}.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="relative h-2" role="img" aria-label={`Ratio de charge ${load.ratio === null ? "non calculable" : num(load.ratio, 2)}`}>
        <div className="absolute inset-0 flex">
          <span className="bg-corner-blue/30" style={{ width: pct(LOAD_ZONE_BOUNDS.low) }} />
          <span className="bg-korev-gold/50" style={{ width: `calc(${pct(LOAD_ZONE_BOUNDS.optimal)} - ${pct(LOAD_ZONE_BOUNDS.low)})` }} />
          <span className="bg-orange-400/40" style={{ width: `calc(${pct(LOAD_ZONE_BOUNDS.high)} - ${pct(LOAD_ZONE_BOUNDS.optimal)})` }} />
          <span className="flex-1 bg-corner-red/40" />
        </div>
        {load.ratio !== null && (
          <span
            className="absolute -top-1 h-4 w-1 -translate-x-1/2 bg-foreground shadow-[0_0_0_2px_hsl(var(--background))]"
            style={{ left: pct(load.ratio) }}
          />
        )}
      </div>
      <div className="relative h-3 text-[10px] tabular-nums text-muted-foreground">
        {[LOAD_ZONE_BOUNDS.low, LOAD_ZONE_BOUNDS.optimal, LOAD_ZONE_BOUNDS.high].map((b) => (
          <span key={b} className="absolute -translate-x-1/2" style={{ left: pct(b) }}>{num(b, 1)}</span>
        ))}
      </div>
    </div>
  );
}

function WeekBars({ consistency }: { consistency: Consistency }) {
  const last = consistency.weeks.length - 1;
  return (
    <div className="grid grid-cols-4 gap-2" role="list" aria-label="Séances par semaine">
      {consistency.weeks.map((w, i) => {
        const reached = w.count >= consistency.target;
        return (
          <div key={w.start} role="listitem" className="flex flex-col items-center gap-1">
            <span className={cn("korev-metric text-sm", reached ? "text-korev-gold" : "text-foreground/80")}>{w.count}</span>
            <div className="relative h-12 w-full bg-muted">
              <div
                className={cn("absolute inset-x-0 bottom-0", reached ? "bg-gradient-primary" : "bg-foreground/35")}
                style={{ height: `${Math.min(1, w.count / consistency.target) * 100}%` }}
              />
            </div>
            <span className={cn("text-[10px] text-muted-foreground", i === last && "text-foreground")}>
              {i === last ? "Cette sem." : shortDay(w.start)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- cards

export function ConsistencyCard({ consistency }: { consistency: Consistency }) {
  return (
    <section className="liquid-glass-solid space-y-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="korev-eyebrow">Constance</p>
          <p className="korev-metric mt-1.5 text-3xl leading-none">
            {consistency.thisWeek}
            <span className="text-lg text-muted-foreground">/{consistency.target}</span>
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">séances cette semaine</span>
          </p>
        </div>
      </div>
      <WeekBars consistency={consistency} />
      <p className="text-xs text-muted-foreground">
        {consistency.finishedWeeks > 0
          ? `Objectif atteint ${consistency.weeksOnTarget} semaine${consistency.weeksOnTarget > 1 ? "s" : ""} sur ${consistency.finishedWeeks}.`
          : "Le bilan des semaines passées apparaîtra dès la semaine prochaine."}{" "}
        {consistency.targetFromProfile ? (
          "Objectif issu de votre disponibilité hebdomadaire."
        ) : (
          <>
            Objectif par défaut.{" "}
            <Link to="/profile" className="text-korev-gold hover:underline">Réglez votre disponibilité</Link>
          </>
        )}
      </p>
    </section>
  );
}

export function LoadCard({ load }: { load: TrainingLoad }) {
  const zone = LOAD_ZONES[load.zone];
  return (
    <section className="liquid-glass-solid space-y-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="korev-eyebrow">Charge d'entraînement</p>
          <p className={cn("mt-1.5 font-display text-xl font-semibold uppercase leading-tight", zone.tone)}>{zone.label}</p>
        </div>
        {load.ratio !== null && (
          <p className="text-right">
            <span className="korev-metric text-3xl leading-none">{num(load.ratio, 2)}</span>
            <span className="block text-[10px] text-muted-foreground">ratio 7 j / 28 j</span>
          </p>
        )}
      </div>
      <LoadGauge load={load} />
      <dl className="grid grid-cols-2 gap-px border border-border bg-border text-center">
        <div className="bg-card px-2 py-2.5">
          <dt className="korev-eyebrow text-[10px]">7 derniers jours</dt>
          <dd className="korev-metric mt-1 text-lg">{num(load.acute)}</dd>
        </div>
        <div className="bg-card px-2 py-2.5">
          <dt className="korev-eyebrow text-[10px]">Moyenne / semaine</dt>
          <dd className="korev-metric mt-1 text-lg">{num(load.chronic)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {zone.advice} Charge d'une séance = effort perçu (1 à 10) × minutes.
      </p>
    </section>
  );
}

export function CampCard({ camp }: { camp: FightCamp | null }) {
  if (!camp) {
    return (
      <Link
        to="/profile"
        className="liquid-glass-solid flex items-center justify-between gap-3 p-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Ajoutez une date de combat ou d'objectif dans votre profil pour suivre votre camp de préparation.</span>
        <ArrowRight className="h-4 w-4 shrink-0 text-korev-gold" />
      </Link>
    );
  }
  return (
    <section className="korev-frame korev-chamfer p-4 [--chamfer:14px] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow parts={camp.week ? ["Camp", `Semaine ${camp.week} sur ${CAMP_WEEKS}`] : ["Camp", "À venir"]} bullet={!!camp.week} />
          <p className="mt-2 truncate font-display text-xl font-semibold uppercase">{camp.event ?? "Objectif du profil"}</p>
          <p className="text-xs text-muted-foreground">{format(fromDateKey(camp.deadline), "EEEE d MMMM yyyy", { locale: fr })}</p>
        </div>
        <p className="korev-metric shrink-0 text-4xl leading-none text-korev-gold">
          {camp.daysLeft === 0 ? "J" : `J-${camp.daysLeft}`}
        </p>
      </div>
      {camp.week ? (
        <>
          <div className="mt-4 grid grid-cols-8 gap-1" aria-hidden>
            {Array.from({ length: CAMP_WEEKS }, (_, i) => (
              <span key={i} className={cn("h-1.5", i < camp.week! ? "bg-gradient-primary" : "bg-muted")} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {plural(camp.sessionsInCamp, "séance", "séances")} depuis le début du camp, le {shortDay(camp.startKey)}.
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Le camp de {CAMP_WEEKS} semaines commencera le {format(fromDateKey(camp.startKey), "d MMMM", { locale: fr })}.
        </p>
      )}
    </section>
  );
}

export function RecordsCard({ records }: { records: Records }) {
  const top = records.exercises.slice(0, 6);
  const highlights = [
    { label: "Rounds", value: records.rounds ? num(records.rounds.value) : "–", sub: records.rounds && shortDay(records.rounds.dateKey) },
    { label: "Volume", value: records.volume ? `${num(records.volume.value)} kg` : "–", sub: records.volume && shortDay(records.volume.dateKey) },
    { label: "Plus long enchaînement", value: records.longestStreak ? plural(records.longestStreak, "jour", "jours") : "–", sub: null },
  ];
  return (
    <section className="liquid-glass-solid p-4 sm:p-5">
      <p className="korev-eyebrow">Records personnels</p>
      <dl className="mt-3 grid grid-cols-3 gap-px border border-border bg-border text-center">
        {highlights.map((h) => (
          <div key={h.label} className="bg-card px-2 py-2.5">
            <dt className="korev-eyebrow text-[10px]">{h.label}</dt>
            <dd className="korev-metric mt-1 text-base">{h.value}</dd>
            {h.sub && <dd className="text-[10px] text-muted-foreground">{h.sub}</dd>}
          </div>
        ))}
      </dl>
      {top.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Vos records de charge apparaîtront après vos premières séries validées.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {top.map((r) => (
            <li key={r.exerciseId} className="flex items-baseline justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-sm">{r.name}</span>
              <span className="shrink-0 text-right">
                <span className="korev-metric text-sm">{num(r.weightKg, 1)} kg</span>
                <span className="text-xs text-muted-foreground"> × {r.reps}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">{shortDay(r.dateKey)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- summary

/** Condensed view for the dashboard column and the end-of-session screen. */
export function PerformanceSummary({ progress, error, className }: { progress: TrainingProgress | undefined; error?: boolean; className?: string }) {
  const zone = progress ? LOAD_ZONES[progress.load.zone] : null;
  return (
    <section className={cn("liquid-glass-solid space-y-4 p-4", className)} data-testid="performance-summary">
      <Eyebrow parts={["Performance", "Semaine"]} />
      {!progress ? (
        <p className="text-sm text-muted-foreground">{error ? "Indicateurs momentanément indisponibles." : "Chargement…"}</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="korev-eyebrow text-[10px]">Constance</p>
              <p className="korev-metric mt-1 text-2xl leading-none">
                {progress.consistency.thisWeek}
                <span className="text-base text-muted-foreground">/{progress.consistency.target}</span>
                <span className="ml-1 text-xs font-normal text-muted-foreground">séances</span>
              </p>
            </div>
            <div className="text-right">
              <p className="korev-eyebrow text-[10px]">Série</p>
              <p className="korev-metric mt-1 text-2xl leading-none">
                {progress.streakDays}
                <span className="ml-1 text-xs font-normal text-muted-foreground">j</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1" aria-hidden>
            {progress.consistency.weeks.map((w) => (
              <span key={w.start} className="h-1.5 bg-muted">
                <span
                  className={cn("block h-full", w.count >= progress.consistency.target ? "bg-gradient-primary" : "bg-foreground/35")}
                  style={{ width: `${Math.min(1, w.count / progress.consistency.target) * 100}%` }}
                />
              </span>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="korev-eyebrow text-[10px]">Charge</p>
              <p className={cn("text-sm font-semibold uppercase tracking-wide", zone!.tone)}>
                {zone!.label}
                {progress.load.ratio !== null && (
                  <span className="korev-metric ml-2 text-foreground">{num(progress.load.ratio, 2)}</span>
                )}
              </p>
            </div>
            <LoadGauge load={progress.load} />
          </div>
          {progress.camp && (
            <p className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">
                {progress.camp.week ? `Camp · sem. ${progress.camp.week}/${CAMP_WEEKS}` : "Objectif"}
                {progress.camp.event && ` · ${progress.camp.event}`}
              </span>
              <span className="korev-metric shrink-0 text-korev-gold">
                {progress.camp.daysLeft === 0 ? "J" : `J-${progress.camp.daysLeft}`}
              </span>
            </p>
          )}
        </>
      )}
    </section>
  );
}
