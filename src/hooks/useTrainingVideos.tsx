import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";
import { extractFilePathFromUrl } from "@/utils/storageUtils";

const BUCKET = 'training-videos';
// Signed URLs outlive the cached list: it is refetched before they expire.
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;
const LIST_STALE_MS = 60 * 60 * 1000;

// video_url holds the object path; rows created before the bucket went
// private may still hold a public URL.
const storagePathOf = (videoUrl: string): string =>
  extractFilePathFromUrl(videoUrl, BUCKET) ?? videoUrl;

export interface TrainingVideo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_type: 'upload' | 'youtube';
  video_url?: string;
  youtube_url?: string;
  duration_seconds?: number;
  category: 'general' | 'combat' | 'strength' | 'cardio' | 'flexibility' | 'technique';
  technique_type?: 'pied' | 'poings' | 'combo';
  difficulty_level?: 'debutant' | 'intermediaire' | 'avance' | 'expert';
  thumbnail_url?: string;
  /** Signed URL for uploaded videos, resolved when the list is loaded. */
  playback_url?: string;
  created_at: string;
  updated_at: string;
}

export const useTrainingVideos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useQuery({
    queryKey: ['training-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = data as TrainingVideo[];

      const paths = rows
        .filter(v => v.video_type === 'upload' && v.video_url)
        .map(v => storagePathOf(v.video_url!));
      if (paths.length === 0) return rows;

      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (signError) throw signError;

      const urlByPath = new Map(signed.filter(s => s.signedUrl).map(s => [s.path, s.signedUrl]));
      return rows.map(v =>
        v.video_type === 'upload' && v.video_url
          ? { ...v, playback_url: urlByPath.get(storagePathOf(v.video_url)) }
          : v
      );
    },
    enabled: !!user,
    staleTime: LIST_STALE_MS,
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async ({ file, title, description, category, techniqueType, difficultyLevel }: {
      file: File;
      title: string;
      description?: string;
      category: string;
      techniqueType?: string;
      difficultyLevel?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('training_videos')
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          video_type: 'upload',
          video_url: fileName,
          technique_type: techniqueType as Enums<"technique_type">,
          difficulty_level: difficultyLevel as Enums<"difficulty_level">,
        });

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([fileName]);
        throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      toast.success("Vidéo uploadée avec succès!");
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload de la vidéo");
    },
  });

  const addYoutubeVideoMutation = useMutation({
    mutationFn: async ({ youtubeUrl, title, description, category, techniqueType, difficultyLevel }: {
      youtubeUrl: string;
      title: string;
      description?: string;
      category: string;
      techniqueType?: string;
      difficultyLevel?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('training_videos')
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          video_type: 'youtube',
          youtube_url: youtubeUrl,
          technique_type: techniqueType as Enums<"technique_type">,
          difficulty_level: difficultyLevel as Enums<"difficulty_level">,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      toast.success("Vidéo YouTube ajoutée avec succès!");
    },
    onError: (error) => {
      console.error('Add YouTube video error:', error);
      toast.error("Erreur lors de l'ajout de la vidéo YouTube");
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const video = videos?.find(v => v.id === videoId);
      
      if (video?.video_type === 'upload' && video.video_url) {
        await supabase.storage
          .from(BUCKET)
          .remove([storagePathOf(video.video_url)]);
      }

      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      toast.success("Vidéo supprimée avec succès!");
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error("Erreur lors de la suppression");
    },
  });

  return {
    videos,
    isLoading,
    uploadVideo: uploadVideoMutation.mutate,
    addYoutubeVideo: addYoutubeVideoMutation.mutate,
    deleteVideo: deleteVideoMutation.mutate,
    isUploading: uploadVideoMutation.isPending,
    isAdding: addYoutubeVideoMutation.isPending,
  };
};
