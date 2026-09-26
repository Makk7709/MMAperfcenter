import { useRef, useState } from "react";
import { Clock, ScanEye, Upload, Users, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_SIZE_MB } from "./types";

const DISCIPLINES = [
  ["auto", "Auto (depuis mon profil)"],
  ["Boxe anglaise", "Boxe anglaise"],
  ["Kickboxing", "Kickboxing"],
  ["Muay Thai", "Muay Thai"],
  ["MMA", "MMA"],
  ["BJJ", "BJJ / Grappling"],
  ["Judo", "Judo / Lutte"],
  ["Karaté", "Karaté"],
  ["Taekwondo", "Taekwondo"],
] as const;

const TIPS = [
  { icon: Video, title: "Caméra fixe", desc: "Trépied, plan large, bonne lumière" },
  { icon: Users, title: "Deux combattants", desc: "Visibles en entier la plupart du temps" },
  { icon: Clock, title: "1 à 5 minutes", desc: "Un round : l'analyse est plus dense" },
];

interface SparringUploadPanelProps {
  discipline: string;
  onDisciplineChange: (value: string) => void;
  athlete: string;
  onAthleteChange: (value: string) => void;
  onFile: (file: File) => void;
  disabled?: boolean;
}

export const SparringUploadPanel = ({
  discipline,
  onDisciplineChange,
  athlete,
  onAthleteChange,
  onFile,
  disabled = false,
}: SparringUploadPanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (file && !disabled) onFile(file);
  };

  return (
    <div className="space-y-5 animate-korev-rise">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="korev-eyebrow text-[11px] font-normal">Discipline</Label>
          <Select value={discipline} onValueChange={onDisciplineChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une discipline" />
            </SelectTrigger>
            <SelectContent>
              {DISCIPLINES.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sparring-athlete" className="korev-eyebrow text-[11px] font-normal">Comment vous reconnaître</Label>
          <Input
            id="sparring-athlete"
            value={athlete}
            onChange={(e) => onAthleteChange(e.target.value)}
            maxLength={160}
            placeholder="Ex. : short noir, gants rouges, à gauche"
            disabled={disabled}
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Facultatif : l'IA vous place alors en coin rouge et vous adresse directement ses conseils.
      </p>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Importer une vidéo de sparring"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group relative isolate flex cursor-pointer flex-col items-center gap-5 overflow-hidden px-6 py-12 text-center outline-none transition-[filter] duration-200",
          "korev-frame korev-chamfer [--chamfer:22px]",
          "focus-visible:brightness-125",
          dragging ? "brightness-125" : "hover:brightness-110",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div aria-hidden className="korev-grid absolute inset-0 -z-10 opacity-70" />
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-korev-gold/10 to-transparent transition-opacity",
            dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        />
        <div className="relative flex h-20 w-20 items-center justify-center border border-korev-gold/50 bg-korev-panel-2 shadow-glow">
          <ScanEye className="h-9 w-9 text-korev-gold" />
          <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center bg-gradient-primary">
            <Upload className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
        </div>
        <div className="space-y-2">
          <p className="korev-display text-2xl sm:text-3xl">
            {dragging ? "Déposez la vidéo" : "Déposez votre sparring"}
          </p>
          <p className="text-sm text-muted-foreground">
            ou <span className="text-korev-gold underline-offset-4 group-hover:underline">parcourez vos fichiers</span>
          </p>
          <p className="korev-eyebrow text-[10px]">MP4 · MOV · WebM · AVI — {MAX_VIDEO_SIZE_MB} Mo max</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
          disabled={disabled}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        La vidéo reste sur votre appareil : seules des planches d'images en sont extraites et envoyées à l'IA.
      </p>

      <ul className="grid gap-3 sm:grid-cols-3">
        {TIPS.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3 border border-border/60 bg-korev-panel/60 p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-korev-gold" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
