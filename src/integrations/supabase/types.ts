export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      community_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_activities_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      Document: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string
          created_at: string
          id: string
          instructions: string | null
          muscle_groups: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          instructions?: string | null
          muscle_groups?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          instructions?: string | null
          muscle_groups?: string[] | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          created_at: string
          daily_calories: number
          daily_carbs_g: number
          daily_fat_g: number
          daily_protein_g: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_calories?: number
          daily_carbs_g?: number
          daily_fat_g?: number
          daily_protein_g?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_calories?: number
          daily_carbs_g?: number
          daily_fat_g?: number
          daily_protein_g?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          date: string
          fat_g: number
          food_name: string
          id: string
          meal_type: string
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          date?: string
          fat_g?: number
          food_name: string
          id?: string
          meal_type: string
          protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          date?: string
          fat_g?: number
          food_name?: string
          id?: string
          meal_type?: string
          protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          fitness_level: string | null
          full_name: string | null
          gender: string | null
          goals: string[] | null
          height: number | null
          id: string
          martial_arts_discipline: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          goals?: string[] | null
          height?: number | null
          id: string
          martial_arts_discipline?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          goals?: string[] | null
          height?: number | null
          id?: string
          martial_arts_discipline?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      sets: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          reps: number
          set_number: number
          updated_at: string
          weight_kg: number | null
          workout_exercise_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reps: number
          set_number: number
          updated_at?: string
          weight_kg?: number | null
          workout_exercise_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reps?: number
          set_number?: number
          updated_at?: string
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_type: string
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_type: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_type?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          order_index: number
          rest_seconds: number | null
          updated_at: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_index?: number
          rest_seconds?: number | null
          updated_at?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_index?: number
          rest_seconds?: number | null
          updated_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_journal: {
        Row: {
          created_at: string
          date: string
          energy_level: number
          id: string
          mood: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          energy_level?: number
          id?: string
          mood?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          energy_level?: number
          id?: string
          mood?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          calories_burned: number | null
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          name: string
          started_at: string | null
          status: string | null
          total_volume_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name: string
          started_at?: string | null
          status?: string | null
          total_volume_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name?: string
          started_at?: string | null
          status?: string | null
          total_volume_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      create_notification: {
        Args: {
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
