import { useNavigate } from "react-router-dom";
import { BookOpen, Calendar, Dumbbell, PlayCircle, ScanLine, Swords, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StartSessionTrigger } from "@/components/training/StartSessionTrigger";

interface QuickActionsProps {
  onSwitchTab?: (tab: string) => void;
  /** Opens the barcode scanner of the nutrition tracker. */
  onScan?: () => void;
}

interface TileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}

const Tile = ({ title, description, icon: Icon, onClick, primary, disabled }: TileProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "korev-chamfer group flex h-24 flex-col items-center justify-center gap-1.5 p-3 text-center transition-[filter,background-color] [--chamfer:10px] disabled:opacity-60",
      primary
        ? "bg-gradient-primary text-primary-foreground hover:brightness-110"
        : "korev-frame text-foreground hover:brightness-125",
    )}
  >
    <Icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", !primary && "text-korev-gold")} />
    <span className="text-xs font-semibold leading-tight">{title}</span>
    <span className={cn("text-[10px] leading-tight", primary ? "opacity-80" : "text-muted-foreground")}>{description}</span>
  </button>
);

export const QuickActions = ({ onSwitchTab, onScan }: QuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <section className="liquid-glass-solid p-4 sm:p-5" aria-labelledby="quick-actions-title">
      <p id="quick-actions-title" className="korev-eyebrow mb-4">Actions rapides</p>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <StartSessionTrigger>
          {({ active, onClick, loading }) => (
            <Tile
              primary
              title="Séance"
              description={active ? "Reprendre" : "Démarrer"}
              icon={Dumbbell}
              onClick={onClick}
              disabled={loading}
            />
          )}
        </StartSessionTrigger>
        <Tile primary title="Scanner" description="Nutrition" icon={ScanLine} onClick={() => onScan?.()} />
        <Tile title="Vidéos" description="Entraînements" icon={PlayCircle} onClick={() => navigate("/training-videos")} />
        <Tile title="Combat" description="Techniques" icon={Swords} onClick={() => onSwitchTab?.("combat")} />
        <Tile title="Carnet" description="Notes" icon={BookOpen} onClick={() => navigate("/journal")} />
        <Tile title="Historique" description="Séances" icon={Calendar} onClick={() => navigate("/history")} />
      </div>
    </section>
  );
};
