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
            bg-card border border-primary/30 rounded-lg px-4 py-2 shadow-lg
            transition-all duration-300 origin-bottom-right
            ${isHovered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}
          `}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium whitespace-nowrap">Analyse IA de Sparring</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-500 rounded">BETA</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Unique sur le marché</p>
        </div>

        {/* FAB Button */}
        <Button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            h-16 w-16 rounded-full shadow-lg
            bg-gradient-to-br from-primary via-primary to-primary/80
            hover:shadow-primary/50 hover:shadow-xl
            transition-all duration-300 hover:scale-110
            relative overflow-hidden group
          `}
        >
          {/* Pulse animation ring */}
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
          <span className="absolute inset-1 rounded-full animate-pulse bg-primary/20" />
          
          {/* Icon */}
          <Video className="h-7 w-7 text-primary-foreground relative z-10 group-hover:scale-110 transition-transform" />
          
          {/* Beta badge */}
          <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold bg-amber-500 text-black rounded z-20">
            BETA
          </span>
        </Button>
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
