import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Play } from "lucide-react";
import { TrainingVideo } from "@/hooks/useTrainingVideos";
import { useState } from "react";

interface VideoCardProps {
  video: TrainingVideo;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export const VideoCard = ({ video, onDelete, canDelete }: VideoCardProps) => {
  const [playing, setPlaying] = useState(false);

  const getYoutubeEmbedUrl = (url: string) => {
    const videoId = /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w-]{11})/.exec(url)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const categoryLabels: Record<string, string> = {
    general: "Général",
    combat: "Combat",
    strength: "Force",
    cardio: "Cardio",
    flexibility: "Flexibilité",
    technique: "Technique",
  };

  const techniqueLabels: Record<string, string> = {
    pied: "🦶 Pieds",
    poings: "👊 Poings",
    combo: "🥊 Combo",
  };

  const difficultyLabels: Record<string, string> = {
    debutant: "⭐ Débutant",
    intermediaire: "⭐⭐ Intermédiaire",
    avance: "⭐⭐⭐ Avancé",
    expert: "⭐⭐⭐⭐ Expert",
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{video.title}</CardTitle>
            {video.description && (
              <CardDescription className="mt-1">{video.description}</CardDescription>
            )}
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(video.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary">
            {categoryLabels[video.category]}
          </Badge>
          {video.technique_type && (
            <Badge variant="outline">
              {techniqueLabels[video.technique_type]}
            </Badge>
          )}
          {video.difficulty_level && (
            <Badge variant="outline" className="border-primary/50">
              {difficultyLabels[video.difficulty_level]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
          {video.video_type === 'youtube' && video.youtube_url ? (
            playing ? (
              <iframe
                src={getYoutubeEmbedUrl(video.youtube_url) || ''}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center cursor-pointer bg-gradient-to-br from-red-500 to-red-600"
                onClick={() => setPlaying(true)}
              >
                <Play className="h-16 w-16 text-white" />
              </div>
            )
          ) : video.video_url ? (
            <video
              src={video.video_url}
              controls
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
