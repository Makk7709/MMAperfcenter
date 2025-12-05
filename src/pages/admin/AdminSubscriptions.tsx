import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminUsers, AdminUser } from "@/hooks/useAdminUsers";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Loader2, 
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  pro: "Pro",
  elite: "Elite",
  sensei: "Sensei",
};

const PLAN_ORDER = ["free", "pro", "elite", "sensei"];

export default function AdminSubscriptions() {
  const { users, isLoading, updateSubscription } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [changingPlan, setChangingPlan] = useState<{ user: AdminUser; newPlan: string } | null>(null);

  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = planFilter === "all" || 
      user.subscription?.plan === planFilter;
    
    return matchesSearch && matchesPlan;
  });

  const planStats = {
    free: users?.filter(u => u.subscription?.plan === "free").length || 0,
    pro: users?.filter(u => u.subscription?.plan === "pro").length || 0,
    elite: users?.filter(u => u.subscription?.plan === "elite").length || 0,
    sensei: users?.filter(u => u.subscription?.plan === "sensei").length || 0,
  };

  const handlePlanChange = (user: AdminUser, newPlan: string) => {
    setChangingPlan({ user, newPlan });
  };

  const confirmPlanChange = () => {
    if (changingPlan) {
      updateSubscription({ userId: changingPlan.user.id, plan: changingPlan.newPlan });
      setChangingPlan(null);
    }
  };

  const isUpgrade = (currentPlan: string, newPlan: string) => {
    return PLAN_ORDER.indexOf(newPlan) > PLAN_ORDER.indexOf(currentPlan);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Gestion des Abonnements</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les plans et abonnements des utilisateurs
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(PLAN_LABELS).map(([plan, label]) => (
            <Card key={plan} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setPlanFilter(plan === planFilter ? "all" : plan)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{planStats[plan as keyof typeof planStats]}</p>
                  </div>
                  <CreditCard className={`h-8 w-8 ${plan === planFilter ? "text-primary" : "text-muted-foreground/30"}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les plans</SelectItem>
              <SelectItem value="free">Gratuit</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="elite">Elite</SelectItem>
              <SelectItem value="sensei">Sensei</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Plan actuel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Fin de période</TableHead>
                <TableHead>Renouvellement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.full_name || "Sans nom"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.subscription?.plan === "free" ? "secondary" : "default"}>
                      {PLAN_LABELS[user.subscription?.plan || "free"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.subscription?.status === "active" ? "default" : "destructive"}>
                      {user.subscription?.status === "active" ? "Actif" : user.subscription?.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.subscription?.current_period_end 
                      ? format(new Date(user.subscription.current_period_end), "dd MMM yyyy", { locale: fr })
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    {user.subscription?.cancel_at_period_end ? (
                      <span className="text-destructive flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        Non
                      </span>
                    ) : (
                      <span className="text-green-600 flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        Auto
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={user.subscription?.plan || "free"}
                      onValueChange={(newPlan) => handlePlanChange(user, newPlan)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Gratuit</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                        <SelectItem value="sensei">Sensei</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun abonnement trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Confirm Dialog */}
        <Dialog open={!!changingPlan} onOpenChange={() => setChangingPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {changingPlan && isUpgrade(changingPlan.user.subscription?.plan || "free", changingPlan.newPlan) ? (
                  <>
                    <ArrowUpCircle className="h-5 w-5 text-green-500" />
                    Upgrade de plan
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="h-5 w-5 text-orange-500" />
                    Downgrade de plan
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir changer le plan de <strong>{changingPlan?.user.full_name || changingPlan?.user.email}</strong> de{" "}
                <Badge variant="outline">{PLAN_LABELS[changingPlan?.user.subscription?.plan || "free"]}</Badge> vers{" "}
                <Badge>{PLAN_LABELS[changingPlan?.newPlan || "free"]}</Badge> ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangingPlan(null)}>
                Annuler
              </Button>
              <Button onClick={confirmPlanChange}>
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
