import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  ArrowLeft
} from "lucide-react";

export const MeuteCard = () => {
  const { user } = useAuth();
  const {
    meutes,
    pendingInvitations,
    loading,
    selectedMeute,
    setSelectedMeute,
    meuteMembers,
    meuteActivities,
    createMeute,
    inviteMember,
    respondToInvitation
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
          <h3 className="font-semibold">Meute</h3>
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
                      placeholder="Email de l'utilisateur..."
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      type="email"
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
                    {getInitials(member.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {member.profile?.full_name || "Inconnu"}
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
      </Card>
    );
  }

  // Meutes List View
  return (
    <Card className="liquid-glass-solid border-0 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Meute</h3>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une meute</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Nom de la meute..."
                value={newMeuteName}
                onChange={(e) => setNewMeuteName(e.target.value)}
              />
              <Input
                placeholder="Description (optionnel)..."
                value={newMeuteDesc}
                onChange={(e) => setNewMeuteDesc(e.target.value)}
              />
              <Button 
                onClick={handleCreateMeute} 
                disabled={isCreating || !newMeuteName.trim()}
                className="w-full"
              >
                {isCreating ? "Création..." : "Créer la meute"}
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
              <span className="flex-1 text-sm font-medium">{inv.meute_name}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                onClick={() => respondToInvitation(inv.id, true)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => respondToInvitation(inv.id, false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Meutes List */}
      {meutes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune meute</p>
          <p className="text-xs mt-1">Créez votre première meute!</p>
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
