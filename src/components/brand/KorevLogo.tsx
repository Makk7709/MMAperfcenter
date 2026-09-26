import logoUrl from "@/assets/korev-logo.webp";
import { cn } from "@/lib/utils";

interface KorevLogoProps {
  className?: string;
  /** Adds the "Performance Center" product line under the mark. */
  withProduct?: boolean;
}

export const KorevLogo = ({ className, withProduct = false }: KorevLogoProps) => (
  <div className={cn("inline-flex flex-col items-start gap-1", className)}>
    <img src={logoUrl} alt="KOREV AI" className="h-full w-auto select-none" draggable={false} />
    {withProduct && <span className="korev-eyebrow text-[10px] text-korev-gold/90">Performance Center</span>}
  </div>
);
