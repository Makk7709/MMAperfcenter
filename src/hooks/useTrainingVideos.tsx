import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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
      return data as TrainingVideo[];
    },
    enabled: !!user,
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
        .from('training-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('training-videos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('training_videos')
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          video_type: 'upload',
          video_url: publicUrl,
          technique_type: techniqueType as any,
          difficulty_level: difficultyLevel as any,
        } as any);

      if (insertError) throw insertError;
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
          technique_type: techniqueType as any,
          difficulty_level: difficultyLevel as any,
        } as any);

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
        const filePath = video.video_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('training-videos')
          .remove([filePath]);
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
