import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Loader2, Video, Play, Filter } from "lucide-react";
import { VideoCard } from "@/components/VideoCard";
import { useTrainingVideos } from "@/hooks/useTrainingVideos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function TrainingVideos() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [techniqueFilter, setTechniqueFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const { videos, isLoading } = useTrainingVideos();

  const filteredVideos = videos?.filter(video => {
    const matchesCategory = categoryFilter === "all" || video.category === categoryFilter;
    const matchesTechnique = techniqueFilter === "all" || video.technique_type === techniqueFilter;
    const matchesDifficulty = difficultyFilter === "all" || video.difficulty_level === difficultyFilter;
    return matchesCategory && matchesTechnique && matchesDifficulty;
  }).sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "views") {
      return ((b as { views_count?: number }).views_count || 0) - ((a as { views_count?: number }).views_count || 0);
    }
    return 0;
  });

  const activeFiltersCount = [categoryFilter, techniqueFilter, difficultyFilter].filter(f => f !== "all").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Vidéothèque</h1>
              <p className="text-muted-foreground">
                {videos?.length || 0} vidéos d'entraînement disponibles
              </p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-card border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrer les vidéos</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""} actif{activeFiltersCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catégorie</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="combat">🥊 Combat</SelectItem>
                  <SelectItem value="general">📚 Général</SelectItem>
                  <SelectItem value="strength">💪 Force</SelectItem>
                  <SelectItem value="cardio">🏃 Cardio</SelectItem>
                  <SelectItem value="flexibility">🧘 Flexibilité</SelectItem>
                  <SelectItem value="technique">🎯 Technique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type de technique</label>
              <Select value={techniqueFilter} onValueChange={setTechniqueFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="pied">🦶 Pieds</SelectItem>
                  <SelectItem value="poings">👊 Poings</SelectItem>
                  <SelectItem value="combo">🔥 Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Niveau</label>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous niveaux</SelectItem>
                  <SelectItem value="debutant">⭐ Débutant</SelectItem>
                  <SelectItem value="intermediaire">⭐⭐ Intermédiaire</SelectItem>
                  <SelectItem value="avance">⭐⭐⭐ Avancé</SelectItem>
                  <SelectItem value="expert">⭐⭐⭐⭐ Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Trier par</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Plus récentes</SelectItem>
                  <SelectItem value="views">Plus vues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredVideos && filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={() => {}}
                canDelete={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl">
            <Video className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune vidéo trouvée</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {activeFiltersCount > 0
                ? "Aucune vidéo ne correspond aux filtres sélectionnés. Essayez de modifier vos critères."
                : "La vidéothèque est vide pour le moment. De nouvelles vidéos seront bientôt disponibles !"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
