import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";
import { Loader2, Camera, X } from "lucide-react";
import type { NutritionLog } from "@/hooks/useNutrition";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { FeaturePaywall } from "./FeaturePaywall";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoodScanned: (food: Omit<NutritionLog, 'id'>) => void;
}

interface OpenFoodFactsProduct {
  product_name: string;
  nutriments: {
    'energy-kcal_100g': number;
    proteins_100g: number;
    carbohydrates_100g: number;
    fat_100g: number;
  };
  quantity?: string;
}

export const BarcodeScannerDialog = ({ 
  open, 
  onOpenChange,
  onFoodScanned 
}: BarcodeScannerDialogProps) => {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { gate, paywallOpen, setPaywallOpen } = useFeatureGate('barcode_scan');

  useEffect(() => {
    if (open && !codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }

    if (open && videoRef.current && !scanning) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const startScanning = async () => {
    if (!codeReaderRef.current || !videoRef.current) return;
    
    setScanning(true);
    try {
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const barcode = result.getText();
            await fetchProductInfo(barcode);
          }
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      toast.error("Erreur caméra", { 
        description: "Impossible d'accéder à la caméra" 
      });
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const fetchProductInfo = async (barcode: string) => {
    // Gate accès (free = 3/mois)
    const allowed = await gate();
    if (!allowed) {
      stopScanning();
      onOpenChange(false);
      return;
    }
    setLoading(true);
    stopScanning();

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product: OpenFoodFactsProduct = data.product;
        const serving = 100; // Default to 100g

        const nutritionLog: Omit<NutritionLog, 'id'> = {
          food_name: product.product_name || "Produit scanné",
          calories: Math.round((product.nutriments?.['energy-kcal_100g'] || 0) * (serving / 100)),
          protein_g: Math.round((product.nutriments?.proteins_100g || 0) * (serving / 100)),
          carbs_g: Math.round((product.nutriments?.carbohydrates_100g || 0) * (serving / 100)),
          fat_g: Math.round((product.nutriments?.fat_100g || 0) * (serving / 100)),
          meal_type: "snack",
          date: new Date().toISOString().split('T')[0],
        };

        onFoodScanned(nutritionLog);
        toast.success("Produit scanné !", { 
          description: product.product_name 
        });
        onOpenChange(false);
      } else {
        toast.error("Produit non trouvé", { 
          description: "Code-barres non reconnu dans la base de données" 
        });
        startScanning();
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Erreur réseau", { 
        description: "Impossible de récupérer les informations du produit" 
      });
      startScanning();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner Code-Barres
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Positionnez le code-barres dans le cadre
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <FeaturePaywall feature="barcode_scan" open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
};

