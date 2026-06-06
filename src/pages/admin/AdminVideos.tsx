import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTrainingVideos, TrainingVideo } from "@/hooks/useTrainingVideos";
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Loader2, 
  Plus,
  MoreHorizontal,
  Trash2,
  Eye,
  EyeOff,
  Video,
  Youtube
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddVideoDialog } from "@/components/AddVideoDialog";

const CATEGORY_LABELS: Record<string, string> = {
  combat: "Combat",
  general: "Général",
  strength: "Force",
  cardio: "Cardio",
  flexibility: "Flexibilité",
  technique: "Technique",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  debutant: "⭐ Débutant",
  intermediaire: "⭐⭐ Intermédiaire",
  avance: "⭐⭐⭐ Avancé",
  expert: "⭐⭐⭐⭐ Expert",
};

// Champs additionnels exposés côté admin (jointure coach + métadonnées de visibilité/vues)
type AdminVideoRow = TrainingVideo & {
  coach_name?: string;
  visibility?: string;
  views_count?: number;
};

export default function AdminVideos() {
  const { videos, isLoading, deleteVideo } = useTrainingVideos();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState<TrainingVideo | null>(null);

  const filteredVideos = videos?.filter(video => {
    const matchesSearch = !searchQuery || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || 
      video.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleDelete = () => {
    if (deletingVideo) {
      deleteVideo(deletingVideo.id);
      setDeletingVideo(null);
    }
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
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Vidéos</h1>
            <p className="text-muted-foreground mt-1">
              {videos?.length || 0} vidéos d'entraînement
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une vidéo
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vidéo</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Visibilité</TableHead>
                <TableHead>Vues</TableHead>
                <TableHead>Ajoutée le</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVideos?.map((video) => {
                const row = video as AdminVideoRow;
                return (
                <TableRow key={video.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        {video.video_type === "youtube" ? (
                          <Youtube className="h-5 w-5 text-red-500" />
                        ) : (
                          <Video className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{video.title}</p>
                        {row.coach_name && (
                          <p className="text-sm text-muted-foreground">Coach: {row.coach_name}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORY_LABELS[video.category] || video.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {video.difficulty_level ? (
                      <span className="text-sm">
                        {DIFFICULTY_LABELS[video.difficulty_level] || video.difficulty_level}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.visibility === "public" ? "secondary" : "default"}>
                      {row.visibility === "public" ? (
                        <><Eye className="h-3 w-3 mr-1" /> Public</>
                      ) : (
                        <><EyeOff className="h-3 w-3 mr-1" /> Premium</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.views_count || 0}
                  </TableCell>
                  <TableCell>
                    {format(new Date(video.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setDeletingVideo(video)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
              {filteredVideos?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune vidéo trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Dialog */}
        <AddVideoDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

        {/* Delete Confirm Dialog */}
        <Dialog open={!!deletingVideo} onOpenChange={() => setDeletingVideo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer la vidéo</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer la vidéo "<strong>{deletingVideo?.title}</strong>" ?
                Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingVideo(null)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
