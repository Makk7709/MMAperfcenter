import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, X, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SparringAnalysisV2 } from "@/components/sparring";

export const SparringAnalysisFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Tooltip on hover */}
        <div
          className={`
            liquid-glass rounded-xl px-4 py-2.5
            transition-all duration-300 origin-bottom-right
            ${isHovered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}
          `}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold whitespace-nowrap text-foreground">Analyse IA de Sparring</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Unique sur le marché</p>
        </div>

        {/* FAB wrapper with rotating glow */}
        <div className="relative">
          {/* BETA badge — clear, readable, outside the spinning ring */}
          <span
            className="absolute -top-2 -left-3 z-30 px-2 py-0.5 text-[10px] font-extrabold tracking-widest
                       bg-primary text-primary-foreground rounded-md shadow-[0_0_12px_hsl(var(--primary)/0.7)]
                       border border-primary-foreground/20 rotate-[-8deg] select-none"
          >
            BETA
          </span>

          <Button
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Analyse IA de Sparring (Beta)"
            className="glow-ring h-16 w-16 rounded-full liquid-glass-solid
                       bg-background/40 backdrop-blur-xl
                       hover:scale-110 transition-transform duration-300
                       relative overflow-visible group p-0"
          >
            <Video className="h-7 w-7 text-primary relative z-10 drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)] group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <SparringAnalysisV2 />
        </DialogContent>
      </Dialog>
    </>
  );
};
