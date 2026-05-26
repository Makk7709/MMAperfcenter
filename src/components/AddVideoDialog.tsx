import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Youtube, Loader2 } from "lucide-react";
import { useTrainingVideos } from "@/hooks/useTrainingVideos";

interface AddVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddVideoDialog = ({ open, onOpenChange }: AddVideoDialogProps) => {
  const { uploadVideo, addYoutubeVideo, isUploading, isAdding } = useTrainingVideos();
  
  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    title: "",
    description: "",
    category: "combat",
    techniqueType: "none",
    difficultyLevel: "none",
  });

  const [youtubeData, setYoutubeData] = useState({
    url: "",
    title: "",
    description: "",
    category: "combat",
    techniqueType: "none",
    difficultyLevel: "none",
  });

  const handleUploadSubmit = () => {
    if (uploadData.file && uploadData.title) {
      uploadVideo(uploadData, {
        onSuccess: () => {
          setUploadData({ 
            file: null, 
            title: "", 
            description: "", 
            category: "combat",
            techniqueType: "",
            difficultyLevel: "",
          });
          onOpenChange(false);
        },
      });
    }
  };

  const handleYoutubeSubmit = () => {
    if (youtubeData.url && youtubeData.title) {
      addYoutubeVideo({
        youtubeUrl: youtubeData.url,
        title: youtubeData.title,
        description: youtubeData.description,
        category: youtubeData.category,
        techniqueType: youtubeData.techniqueType,
        difficultyLevel: youtubeData.difficultyLevel,
      }, {
        onSuccess: () => {
          setYoutubeData({ 
            url: "", 
            title: "", 
            description: "", 
            category: "combat",
            techniqueType: "",
            difficultyLevel: "",
          });
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une vidéo d'entraînement</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="youtube">
              <Youtube className="mr-2 h-4 w-4" />
              Lien YouTube
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload fichier
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">URL YouTube *</Label>
              <Input
                id="youtube-url"
                value={youtubeData.url}
                onChange={(e) => setYoutubeData({ ...youtubeData, url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-title">Titre *</Label>
              <Input
                id="youtube-title"
                value={youtubeData.title}
                onChange={(e) => setYoutubeData({ ...youtubeData, title: e.target.value })}
                placeholder="Nom de la vidéo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-description">Description</Label>
              <Textarea
                id="youtube-description"
                value={youtubeData.description}
                onChange={(e) => setYoutubeData({ ...youtubeData, description: e.target.value })}
                placeholder="Description de l'exercice..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-category">Catégorie *</Label>
                <Select value={youtubeData.category} onValueChange={(value) => setYoutubeData({ ...youtubeData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combat">Combat</SelectItem>
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="strength">Force</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="flexibility">Flexibilité</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube-technique">Type de technique</Label>
                <Select value={youtubeData.techniqueType} onValueChange={(value) => setYoutubeData({ ...youtubeData, techniqueType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="pied">🦶 Pieds</SelectItem>
                    <SelectItem value="poings">👊 Poings</SelectItem>
                    <SelectItem value="combo">🥊 Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-difficulty">Niveau de difficulté</Label>
              <Select value={youtubeData.difficultyLevel} onValueChange={(value) => setYoutubeData({ ...youtubeData, difficultyLevel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="debutant">⭐ Débutant</SelectItem>
                  <SelectItem value="intermediaire">⭐⭐ Intermédiaire</SelectItem>
                  <SelectItem value="avance">⭐⭐⭐ Avancé</SelectItem>
                  <SelectItem value="expert">⭐⭐⭐⭐ Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleYoutubeSubmit} 
              disabled={!youtubeData.url || !youtubeData.title || isAdding}
              className="w-full"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <Youtube className="mr-2 h-4 w-4" />
                  Ajouter la vidéo YouTube
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="video-file">Fichier vidéo *</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-title">Titre *</Label>
              <Input
                id="upload-title"
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="Nom de la vidéo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-description">Description</Label>
              <Textarea
                id="upload-description"
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Description de l'exercice..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upload-category">Catégorie *</Label>
                <Select value={uploadData.category} onValueChange={(value) => setUploadData({ ...uploadData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="combat">Combat</SelectItem>
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="strength">Force</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="flexibility">Flexibilité</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-technique">Type de technique</Label>
                <Select value={uploadData.techniqueType} onValueChange={(value) => setUploadData({ ...uploadData, techniqueType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="pied">🦶 Pieds</SelectItem>
                    <SelectItem value="poings">👊 Poings</SelectItem>
                    <SelectItem value="combo">🥊 Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-difficulty">Niveau de difficulté</Label>
              <Select value={uploadData.difficultyLevel} onValueChange={(value) => setUploadData({ ...uploadData, difficultyLevel: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  <SelectItem value="debutant">⭐ Débutant</SelectItem>
                  <SelectItem value="intermediaire">⭐⭐ Intermédiaire</SelectItem>
                  <SelectItem value="avance">⭐⭐⭐ Avancé</SelectItem>
                  <SelectItem value="expert">⭐⭐⭐⭐ Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleUploadSubmit} 
              disabled={!uploadData.file || !uploadData.title || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader la vidéo
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};