import nutrition from "@/assets/section-nutrition-960.webp";
import nutritionSmall from "@/assets/section-nutrition-480.webp";
import analysis from "@/assets/section-analysis-960.webp";
import analysisSmall from "@/assets/section-analysis-480.webp";
import training from "@/assets/section-training-960.webp";
import trainingSmall from "@/assets/section-training-480.webp";
import team from "@/assets/section-team-960.webp";
import teamSmall from "@/assets/section-team-480.webp";
import sparring from "@/assets/sparring-training.webp";
import sparringSmall from "@/assets/sparring-training-480.webp";
import { cn } from "@/lib/utils";

const images = {
  nutrition: [nutritionSmall, nutrition],
  analysis: [analysisSmall, analysis],
  training: [trainingSmall, training],
  team: [teamSmall, team],
  combat: [sparringSmall, sparring],
} as const;

/** Decorative layer: parent must be relative + isolate. Adds no layout space. */
export function SectionArtwork({ kind, className }: {
  kind: keyof typeof images;
  className?: string;
}) {
  const [small, large] = images[kind];
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 -z-10 !m-0 h-full overflow-hidden rounded-[inherit]", className)}>
      <img
        src={large}
        srcSet={`${small} 480w, ${large} 960w`}
        sizes="(min-width: 1024px) 50vw, 100vw"
        width={960}
        height={540}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-right opacity-80 sm:object-contain"
      />
      <span className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/[0.65] to-card/20" />
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
    </span>
  );
}
