import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { listMyContributions, withdrawContribution, type MyContribution } from "@/lib/movement/contribution";

const QUERY_KEY = ["movement-contributions"];

const PARTNER_STATUS: Record<MyContribution["partner_status"], string> = {
  none: "Ton mouvement seul",
  pending: "En attente de l'accord de ton partenaire",
  consented: "Avec l'accord de ton partenaire",
  withdrawn: "Ton partenaire a retiré son accord",
  expired: "Ton partenaire n'a pas donné son accord : son mouvement est effacé",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function MovementContributionsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const { data: contributions = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listMyContributions,
    enabled: !!user,
  });

  if (!user || (!isLoading && contributions.length === 0)) return null;

  const withdraw = async (item: MyContribution) => {
    setWithdrawing(item.id);
    try {
      await withdrawContribution(item.id);
      toast.success(item.role === "contributor" ? "Contribution retirée et effacée." : "Ton accord est retiré et ton mouvement effacé.");
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retrait impossible pour le moment.");
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" /> Mes contributions
        </CardTitle>
        <CardDescription>
          Mouvements partagés pour faire progresser l'analyse PRISM. Un retrait efface les données ; elles ne servent
          plus aux entraînements suivants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <ul className="divide-y divide-border/60">
            {contributions.map((item) => (
              <li key={`${item.id}-${item.role}`} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {item.role === "contributor" ? "Ma contribution" : "Partenaire d'un sparring"}
                    {item.discipline ? ` · ${item.discipline}` : ""} · {formatDate(item.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(item.frame_count / item.fps)} s de mouvement
                    {item.role === "contributor" && ` · ${item.label_count ?? 0} étiquettes PRISM, ${item.correction_count ?? 0} corrigées`}
                    {item.role === "contributor" && ` · ${PARTNER_STATUS[item.partner_status]}`}
                    {` · conservé jusqu'au ${formatDate(item.expires_at)}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={withdrawing === item.id}
                  onClick={() => void withdraw(item)}
                >
                  {withdrawing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
