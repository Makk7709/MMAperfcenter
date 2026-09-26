import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { toast } from "sonner";
import { Loader2, ScanLine, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { parseOffProduct, type FoodProduct } from "@/lib/nutrition";
import { FeaturePaywall } from "./FeaturePaywall";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the product described per 100 g; the caller chooses the quantity. */
  onProductFound: (product: FoodProduct) => void;
}

const OFF_FIELDS =
  "product_name,product_name_fr,brands,nutriments,serving_quantity";

export const BarcodeScannerDialog = ({
  open,
  onOpenChange,
  onProductFound,
}: BarcodeScannerDialogProps) => {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handlingRef = useRef(false);
  const { gate, paywallOpen, setPaywallOpen } = useFeatureGate("barcode_scan");
  const callbacks = useRef({ gate, onOpenChange, onProductFound });
  callbacks.current = { gate, onOpenChange, onProductFound };

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const lookup = useCallback(async (barcode: string) => {
    const { gate, onOpenChange, onProductFound } = callbacks.current;
    setLoading(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`,
      );
      const data = res.ok ? await res.json() : null;
      const product = data?.status === 1 ? parseOffProduct(data.product) : null;
      if (!product) {
        toast.error("Produit introuvable", {
          description:
            "Ce code-barres n'est pas dans Open Food Facts ou n'a pas de valeurs nutritionnelles.",
        });
        return false;
      }
      if (!(await gate())) {
        onOpenChange(false);
        return true;
      }
      onProductFound(product);
      onOpenChange(false);
      return true;
    } catch {
      toast.error("Connexion impossible", {
        description: "Vérifiez votre réseau puis réessayez.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !video) return;
    let cancelled = false;
    handlingRef.current = false;
    setCameraError(false);

    new BrowserMultiFormatReader()
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        video,
        (result) => {
          if (!result || handlingRef.current) return;
          handlingRef.current = true;
          stop();
          void lookup(result.getText()).then((done) => {
            if (!done && !cancelled) setAttempt((n) => n + 1);
          });
        },
      )
      .then((controls) => {
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) setCameraError(true);
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, video, attempt, lookup, stop]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <p className="korev-eyebrow">Nutrition</p>
            <DialogTitle className="flex items-center gap-2 font-display text-xl uppercase">
              <ScanLine className="h-5 w-5 text-korev-gold" />
              Scanner un code-barres
            </DialogTitle>
            <DialogDescription>
              Vous choisirez ensuite la quantité consommée.
            </DialogDescription>
          </DialogHeader>

          <div className="korev-chamfer relative aspect-[4/3] overflow-hidden bg-black [--chamfer:14px]">
            <video
              ref={setVideo}
              className="h-full w-full object-cover"
              muted
              playsInline
            >
              <track kind="captions" />
            </video>
            {!cameraError && (
              <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-24 -translate-y-1/2 border-2 border-korev-gold/80">
                <div className="absolute inset-x-0 top-1/2 h-px bg-primary/80" />
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
                <p>
                  Impossible d'accéder à la caméra. Autorisez-la dans votre
                  navigateur puis réessayez.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  Réessayer
                </Button>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2
                  className="h-8 w-8 animate-spin text-primary"
                  aria-label="Recherche du produit"
                />
              </div>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Placez le code-barres dans le cadre
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            Annuler
          </Button>
        </DialogContent>
      </Dialog>
      <FeaturePaywall
        feature="barcode_scan"
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
      />
    </>
  );
};
