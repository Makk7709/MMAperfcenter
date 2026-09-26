import { cn } from "@/lib/utils";

interface EyebrowProps {
  /** Segments joined by a gold slash, e.g. ["KOREV", "Analyse vidéo"]. */
  parts: string[];
  className?: string;
  bullet?: boolean;
}

export const Eyebrow = ({ parts, className, bullet = false }: EyebrowProps) => (
  <p className={cn("korev-eyebrow flex flex-wrap items-center gap-x-2", className)}>
    {bullet && <span className="korev-bullet" aria-hidden />}
    {parts.map((part, i) => (
      <span key={part} className="inline-flex items-center gap-2">
        {i > 0 && <span className="text-korev-gold/60" aria-hidden>/</span>}
        <span className={i === parts.length - 1 ? "text-foreground/85" : undefined}>{part}</span>
      </span>
    ))}
  </p>
);
