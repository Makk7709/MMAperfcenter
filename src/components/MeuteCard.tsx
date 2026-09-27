import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMeutes } from "@/hooks/useMeutes";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Users, 
  Plus, 
  UserPlus, 
  Crown, 
  Check, 
  X, 
  ChevronRight,
  Flame,
  Trophy,
  ArrowLeft,
  LogOut,
  Trash2
} from "lucide-react";

export const MeuteCard = () => {
  const { user } = useAuth();
  const {
    meutes,
    pendingInvitations,
    loading,
    loadError,
    refreshMeutes,
    selectedMeute,
    setSelectedMeute,
    meuteMembers,
    meuteActivities,
    createMeute,
    inviteMember,
    respondToInvitation,
    leaveMeute,
    deleteMeute
  } = useMeutes();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newMeuteName, setNewMeuteName] = useState("");
  const [newMeuteDesc, setNewMeuteDesc] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const handleCreateMeute = async () => {
    if (!newMeuteName.trim()) return;
    setIsCreating(true);
    const result = await createMeute(newMeuteName, newMeuteDesc);
    setIsCreating(false);
    if (result) {
      setNewMeuteName("");
      setNewMeuteDesc("");
      setShowCreateDialog(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedMeute) return;
    setIsInviting(true);
    const success = await inviteMember(selectedMeute.id, inviteEmail);
    setIsInviting(false);
    if (success) {
      setInviteEmail("");
      setShowInviteDialog(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "workout_completed": return <Trophy className="h-4 w-4 text-primary" />;
      case "joined": return <UserPlus className="h-4 w-4 text-accent" />;
      default: return <Flame className="h-4 w-4 text-orange-500" />;
    }
  };

  if (loading) {
    return (
      <Card className="liquid-glass-solid border-0 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Team</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Selected Meute View
  if (selectedMeute) {
    const isOwner = selectedMeute.owner_id === user?.id;
    
    return (
      <Card className="liquid-glass-solid border-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => setSelectedMeute(null)}
              aria-label="Retour à mes teams"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-lg">{selectedMeute.name}</h3>
                {isOwner && <Crown className="h-4 w-4 text-yellow-300" />}
              </div>
              <p className="text-white/80 text-sm">{meuteMembers.length} membres</p>
            </div>
            {isOwner && (
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    Inviter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inviter un membre</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="E-mail du compte KOREV…"
                      aria-label="E-mail de la personne à inviter"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                      type="email"
                      autoComplete="off"
                      maxLength={254}
                    />
                    <Button 
                      onClick={handleInvite} 
                      disabled={isInviting || !inviteEmail.trim()}
                      className="w-full"
                    >
                      {isInviting ? "Envoi..." : "Envoyer l'invitation"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="p-4 border-b border-border/50">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Membres</p>
          <div className="flex flex-wrap gap-2">
            {meuteMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(member.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {member.display_name || "Membre"}
                </span>
                {member.role === "owner" && (
                  <Crown className="h-3 w-3 text-primary" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activities */}
        <ScrollArea className="h-[200px] p-4">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Activité récente</p>
          {meuteActivities.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Flame className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune activité pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meuteActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">{getActivityIcon(activity.activity_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border/50 flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive">
                {isOwner ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                {isOwner ? "Supprimer la team" : "Quitter la team"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isOwner ? `Supprimer « ${selectedMeute.name} » ?` : `Quitter « ${selectedMeute.name} » ?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isOwner
                    ? "La team, ses membres et son activité seront supprimés pour tout le monde."
                    : "Vous ne verrez plus l'activité de cette team. Une nouvelle invitation sera nécessaire pour revenir."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => (isOwner ? deleteMeute(selectedMeute.id) : leaveMeute(selectedMeute.id))}
                >
                  {isOwner ? "Supprimer" : "Quitter"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    );
  }

  // Meutes List View
  return (
    <Card className="liquid-glass-solid border-0 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Team</h3>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" aria-label="Créer une team">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Nom de la team…"
                aria-label="Nom de la team"
                maxLength={60}
                value={newMeuteName}
                onChange={(e) => setNewMeuteName(e.target.value)}
              />
              <Input
                placeholder="Description (optionnel)…"
                aria-label="Description de la team"
                maxLength={280}
                value={newMeuteDesc}
                onChange={(e) => setNewMeuteDesc(e.target.value)}
              />
              <Button 
                onClick={handleCreateMeute} 
                disabled={isCreating || !newMeuteName.trim()}
                className="w-full"
              >
                {isCreating ? "Création..." : "Créer la team"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Invitations</p>
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Users className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{inv.meute_name}</p>
                {inv.invited_by_name && (
                  <p className="text-xs text-muted-foreground truncate">Invité par {inv.invited_by_name}</p>
                )}
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                onClick={() => respondToInvitation(inv.id, true)}
                aria-label={`Accepter l'invitation de ${inv.meute_name}`}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => respondToInvitation(inv.id, false)}
                aria-label={`Refuser l'invitation de ${inv.meute_name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Meutes List */}
      {loadError ? (
        <div className="text-center py-8 text-muted-foreground space-y-3">
          <p className="text-sm">Impossible de charger vos teams.</p>
          <Button variant="outline" size="sm" onClick={() => refreshMeutes()}>Réessayer</Button>
        </div>
      ) : meutes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune team</p>
          <p className="text-xs mt-1">Créez votre première team !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meutes.map((meute) => (
            <button
              key={meute.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
              onClick={() => setSelectedMeute(meute)}
            >
              <Avatar className="h-10 w-10 bg-gradient-primary">
                <AvatarFallback className="bg-transparent text-primary-foreground font-bold">
                  {getInitials(meute.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{meute.name}</p>
                  {meute.owner_id === user?.id && (
                    <Crown className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {meute.description || "Pas de description"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
