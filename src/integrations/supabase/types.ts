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
      feature_usage: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          month: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          month?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          month?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      meute_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          meute_id: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          meute_id: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          meute_id?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meute_activities_meute_id_fkey"
            columns: ["meute_id"]
            isOneToOne: false
            referencedRelation: "meutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meute_activities_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      meute_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          joined_at: string | null
          meute_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          meute_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          meute_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meute_members_meute_id_fkey"
            columns: ["meute_id"]
            isOneToOne: false
            referencedRelation: "meutes"
            referencedColumns: ["id"]
          },
        ]
      }
      meutes: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
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
      organization_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"] | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"] | null
          token?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          monthly_render_quota: number | null
          name: string
          primary_color: string | null
          quota_reset_date: string | null
          renders_used_this_month: number | null
          slug: string
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          monthly_render_quota?: number | null
          name: string
          primary_color?: string | null
          quota_reset_date?: string | null
          renders_used_this_month?: number | null
          slug: string
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          monthly_render_quota?: number | null
          name?: string
          primary_color?: string | null
          quota_reset_date?: string | null
          renders_used_this_month?: number | null
          slug?: string
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          belt_rank: string | null
          body_fat_percent: number | null
          competition_level: string | null
          competitions_count: number | null
          created_at: string
          dietary_restrictions: string[] | null
          email: string | null
          equipment: string[] | null
          fitness_level: string | null
          full_name: string | null
          gender: string | null
          goal_deadline: string | null
          goals: string[] | null
          handedness: string | null
          height: number | null
          id: string
          injuries: string[] | null
          martial_arts_discipline: string | null
          morphotype: string | null
          preferred_session_duration: number | null
          primary_goal: string | null
          secondary_disciplines: string[] | null
          sleep_hours: number | null
          stress_level: number | null
          target_event: string | null
          training_location: string | null
          updated_at: string
          waist_cm: number | null
          weekly_availability: number | null
          weight: number | null
          years_practice: number | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          belt_rank?: string | null
          body_fat_percent?: number | null
          competition_level?: string | null
          competitions_count?: number | null
          created_at?: string
          dietary_restrictions?: string[] | null
          email?: string | null
          equipment?: string[] | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          goal_deadline?: string | null
          goals?: string[] | null
          handedness?: string | null
          height?: number | null
          id: string
          injuries?: string[] | null
          martial_arts_discipline?: string | null
          morphotype?: string | null
          preferred_session_duration?: number | null
          primary_goal?: string | null
          secondary_disciplines?: string[] | null
          sleep_hours?: number | null
          stress_level?: number | null
          target_event?: string | null
          training_location?: string | null
          updated_at?: string
          waist_cm?: number | null
          weekly_availability?: number | null
          weight?: number | null
          years_practice?: number | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          belt_rank?: string | null
          body_fat_percent?: number | null
          competition_level?: string | null
          competitions_count?: number | null
          created_at?: string
          dietary_restrictions?: string[] | null
          email?: string | null
          equipment?: string[] | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          goal_deadline?: string | null
          goals?: string[] | null
          handedness?: string | null
          height?: number | null
          id?: string
          injuries?: string[] | null
          martial_arts_discipline?: string | null
          morphotype?: string | null
          preferred_session_duration?: number | null
          primary_goal?: string | null
          secondary_disciplines?: string[] | null
          sleep_hours?: number | null
          stress_level?: number | null
          target_event?: string | null
          training_location?: string | null
          updated_at?: string
          waist_cm?: number | null
          weekly_availability?: number | null
          weight?: number | null
          years_practice?: number | null
        }
        Relationships: []
      }
      render_usage: {
        Row: {
          created_at: string | null
          id: string
          month: string | null
          organization_id: string | null
          render_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month?: string | null
          organization_id?: string | null
          render_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string | null
          organization_id?: string | null
          render_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "render_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      sparring_analyses: {
        Row: {
          analysis: Json | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
          video_name: string
          video_url: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          video_name: string
          video_url: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          video_name?: string
          video_url?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          category: string
          coach_name: string | null
          created_at: string
          description: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_seconds: number | null
          id: string
          technique_type: Database["public"]["Enums"]["technique_type"] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_type: string
          video_url: string | null
          views_count: number
          visibility: string
          youtube_url: string | null
        }
        Insert: {
          category?: string
          coach_name?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_seconds?: number | null
          id?: string
          technique_type?: Database["public"]["Enums"]["technique_type"] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_type: string
          video_url?: string | null
          views_count?: number
          visibility?: string
          youtube_url?: string | null
        }
        Update: {
          category?: string
          coach_name?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          duration_seconds?: number | null
          id?: string
          technique_type?: Database["public"]["Enums"]["technique_type"] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_type?: string
          video_url?: string | null
          views_count?: number
          visibility?: string
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
      check_organization_quota: {
        Args: { org_id: string }
        Returns: {
          can_render: boolean
          current_usage: number
          monthly_limit: number
          remaining: number
        }[]
      }
      check_subscription_access: {
        Args: { p_user_id: string }
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          has_access: boolean
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
        }[]
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
      get_feature_limit: {
        Args: {
          _feature: string
          _plan: Database["public"]["Enums"]["subscription_plan"]
        }
        Returns: number
      }
      get_feature_usage: {
        Args: { _feature_name: string; _user_id: string }
        Returns: number
      }
      get_meute_member_role: {
        Args: { _meute_id: string; _user_id: string }
        Returns: string
      }
      get_user_id_by_stripe_customer: {
        Args: { p_stripe_customer_id: string }
        Returns: string
      }
      has_feature_access: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_feature_usage: {
        Args: { _feature_name: string; _user_id: string }
        Returns: number
      }
      increment_organization_usage: {
        Args: { count?: number; org_id: string; user_id_param: string }
        Returns: undefined
      }
      increment_video_views: { Args: { video_id: string }; Returns: undefined }
      is_meute_member: {
        Args: { _meute_id: string; _user_id: string }
        Returns: boolean
      }
      is_meute_owner: {
        Args: { _meute_id: string; _user_id: string }
        Returns: boolean
      }
      is_webhook_processed: { Args: { p_event_id: string }; Returns: boolean }
      mark_webhook_processed: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json }
        Returns: undefined
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
      reset_monthly_organization_quotas: { Args: never; Returns: undefined }
      sync_stripe_subscription: {
        Args: {
          p_cancel_at_period_end: boolean
          p_current_period_end: string
          p_current_period_start: string
          p_plan: Database["public"]["Enums"]["subscription_plan"]
          p_status: string
          p_stripe_customer_id: string
          p_stripe_price_id: string
          p_stripe_subscription_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "coach"
      difficulty_level: "debutant" | "intermediaire" | "avance" | "expert"
      organization_role: "owner" | "admin" | "member"
      subscription_plan: "free" | "pro" | "elite" | "sensei"
      subscription_tier: "starter" | "pro" | "enterprise"
      technique_type: "pied" | "poings" | "combo"
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
      app_role: ["admin", "user", "coach"],
      difficulty_level: ["debutant", "intermediaire", "avance", "expert"],
      organization_role: ["owner", "admin", "member"],
      subscription_plan: ["free", "pro", "elite", "sensei"],
      subscription_tier: ["starter", "pro", "enterprise"],
      technique_type: ["pied", "poings", "combo"],
    },
  },
} as const
