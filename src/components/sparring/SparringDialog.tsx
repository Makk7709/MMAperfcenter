import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SparringAnalysisV2 } from "./SparringAnalysisV2";

interface SparringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SparringDialog = ({ open, onOpenChange }: SparringDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto overflow-x-hidden border-korev-gold/25 bg-korev-deep p-4 sm:p-8">
      <DialogTitle className="sr-only">Analyse de sparring par IA</DialogTitle>
      <DialogDescription className="sr-only">
        Importez une vidéo de sparring pour obtenir statistiques, moments clés et conseils.
      </DialogDescription>
      <div aria-hidden className="korev-grid pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60" />
      <div className="relative">
        <SparringAnalysisV2 />
      </div>
    </DialogContent>
  </Dialog>
);
