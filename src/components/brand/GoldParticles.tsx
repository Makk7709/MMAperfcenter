import { cn } from "@/lib/utils";

// Fixed layout so the scene is identical on every render (no hydration or
// re-render jitter). left/top in %, size in px, delay in s.
const PARTICLES = [
  [8, 18, 3, 0], [22, 64, 2, 1.8], [35, 30, 4, 3.1], [48, 78, 2, 0.6],
  [61, 12, 3, 2.4], [72, 52, 5, 4.2], [84, 26, 2, 1.1], [92, 70, 3, 3.6],
  [15, 88, 4, 5.0], [55, 42, 2, 2.9], [78, 90, 3, 0.3], [4, 48, 2, 4.7],
] as const;

export const GoldParticles = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
    {PARTICLES.map(([left, top, size, delay]) => (
      <span
        key={`${left}-${top}`}
        className="absolute rounded-full bg-korev-gold-light animate-korev-float motion-reduce:animate-none"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: size,
          height: size,
          animationDelay: `${delay}s`,
          boxShadow: `0 0 ${size * 4}px ${size}px hsl(var(--korev-gold) / 0.35)`,
        }}
      />
    ))}
  </div>
);
