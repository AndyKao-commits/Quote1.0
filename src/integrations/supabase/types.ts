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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      canned_responses: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          project_id: string
          quantity: number
          source: string
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          project_id: string
          quantity?: number
          source?: string
          unit?: string
          unit_price?: number
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          project_id?: string
          quantity?: number
          source?: string
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          category: string
          created_at: string
          id: string
          note: string | null
          project_id: string
          storage_path: string
          taken_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          project_id: string
          storage_path: string
          taken_at: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          project_id?: string
          storage_path?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_name: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          watermark_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          brand_name?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          watermark_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          brand_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          watermark_enabled?: boolean
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string
          created_at: string
          customer_name: string
          customer_phone: string | null
          expected_end_date: string | null
          id: string
          name: string
          note: string | null
          scope: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          expected_end_date?: string | null
          id?: string
          name: string
          note?: string | null
          scope?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          expected_end_date?: string | null
          id?: string
          name?: string
          note?: string | null
          scope?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          admin_reply: string | null
          ai_answer: string | null
          ai_enabled: boolean
          created_at: string
          id: string
          question: string
          replied_at: string | null
          status: string
          summary: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          ai_answer?: string | null
          ai_enabled?: boolean
          created_at?: string
          id?: string
          question: string
          replied_at?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          ai_answer?: string | null
          ai_enabled?: boolean
          created_at?: string
          id?: string
          question?: string
          replied_at?: string | null
          status?: string
          summary?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
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
      work_logs: {
        Row: {
          content: string
          created_at: string
          date: string
          hours: number
          id: string
          note: string | null
          project_id: string
          user_id: string
          workers: string | null
        }
        Insert: {
          content: string
          created_at?: string
          date: string
          hours?: number
          id?: string
          note?: string | null
          project_id: string
          user_id: string
          workers?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          hours?: number
          id?: string
          note?: string | null
          project_id?: string
          user_id?: string
          workers?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
