import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Video } from "lucide-react";
import { AddVideoDialog } from "@/components/AddVideoDialog";
import { VideoCard } from "@/components/VideoCard";
import { useTrainingVideos } from "@/hooks/useTrainingVideos";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TrainingVideos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { videos, isLoading, deleteVideo } = useTrainingVideos();
  const { user } = useAuth();

  const filteredVideos = videos?.filter(video => 
    categoryFilter === "all" || video.category === categoryFilter
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="h-8 w-8" />
              Vidéos d'Entraînement
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre bibliothèque de vidéos d'entraînement
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une vidéo
          </Button>
        </div>

        <div className="mb-6">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              <SelectItem value="general">Général</SelectItem>
              <SelectItem value="combat">Combat</SelectItem>
              <SelectItem value="strength">Force</SelectItem>
              <SelectItem value="cardio">Cardio</SelectItem>
              <SelectItem value="flexibility">Flexibilité</SelectItem>
              <SelectItem value="technique">Technique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredVideos && filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={deleteVideo}
                canDelete={video.user_id === user?.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune vidéo trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {categoryFilter === "all" 
                ? "Commencez par ajouter votre première vidéo d'entraînement"
                : "Aucune vidéo dans cette catégorie"}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une vidéo
            </Button>
          </div>
        )}
      </main>

      <AddVideoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
