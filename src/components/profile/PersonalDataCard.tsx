import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deleteAccount, DELETE_CONFIRMATION_WORD, downloadJson, exportAccountData } from "@/lib/accountData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PersonalDataCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  if (!user) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAccountData(user.id);
      downloadJson(`korev-donnees-${new Date().toISOString().slice(0, 10)}.json`, data);
    } catch (error) {
      console.error("Account export failed:", error);
      toast.error("L'export de vos données a échoué");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount(confirmation);
      localStorage.removeItem(`gamification_xp_${user.id}`);
      localStorage.removeItem(`gamification_badges_${user.id}`);
      queryClient.clear();
      // The user no longer exists server-side: only the local session is left.
      await supabase.auth.signOut({ scope: "local" });
      toast.success("Votre compte a été supprimé");
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La suppression du compte a échoué");
      setDeleting(false);
    }
  };

  return (
    <Card className="glass border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Données personnelles
        </CardTitle>
        <CardDescription>
          Téléchargez une copie de vos données ou supprimez définitivement votre compte.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-3">
        <Button type="button" variant="outline" className="gap-2" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exporter mes données
        </Button>

        <AlertDialog onOpenChange={(open) => !open && setConfirmation("")}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" /> Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Votre abonnement sera résilié immédiatement, sans remboursement de la période en cours.
                Vos séances, analyses, vidéos, journal et données nutritionnelles seront effacés.
                Cette action est irréversible. Tapez {DELETE_CONFIRMATION_WORD} pour confirmer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={DELETE_CONFIRMATION_WORD}
              autoComplete="off"
              disabled={deleting}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || confirmation !== DELETE_CONFIRMATION_WORD}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Supprimer définitivement
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
