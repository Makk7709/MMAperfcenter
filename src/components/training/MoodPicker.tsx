import { cn } from "@/lib/utils";
import { MOODS } from "@/lib/training/moods";

/** Five-step feeling scale; the bars echo a signal meter instead of emojis. */
export function MoodPicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <div id={id} role="radiogroup" aria-label="Ressenti" className="grid grid-cols-5 gap-1.5">
      {MOODS.map((m) => {
        const selected = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 border px-1 py-2.5 transition-colors",
              selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-korev-deep/40 text-muted-foreground hover:border-primary/40",
            )}
          >
            <MoodBars level={m.level} active={selected} />
            <span className="text-[11px] font-medium leading-none">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MoodBars({ level, active = true, className }: { level: number; active?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-4 items-end gap-[3px]", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn("w-[3px]", i <= level ? (active ? "bg-primary" : "bg-muted-foreground/70") : "bg-muted")}
          style={{ height: `${30 + i * 14}%` }}
        />
      ))}
    </span>
  );
}
