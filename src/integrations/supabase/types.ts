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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mechanic_locations: {
        Row: {
          id: string
          latitude: number
          longitude: number
          mechanic_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          latitude?: number
          longitude?: number
          mechanic_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          latitude?: number
          longitude?: number
          mechanic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_locations_mechanic_id_fkey"
            columns: ["mechanic_id"]
            isOneToOne: true
            referencedRelation: "mechanic_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_profiles: {
        Row: {
          approval_status: string
          availability_status: string
          badge: string | null
          certification_urls: string[] | null
          created_at: string
          email: string | null
          experience_years: number | null
          full_name: string | null
          garage_location: string | null
          id: string
          is_blocked: boolean
          is_online: boolean
          lat: number | null
          lng: number | null
          nida_number: string | null
          phone: string | null
          profile_image_url: string | null
          rating: number | null
          specialties: string[]
          tier: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          availability_status?: string
          badge?: string | null
          certification_urls?: string[] | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          garage_location?: string | null
          id?: string
          is_blocked?: boolean
          is_online?: boolean
          lat?: number | null
          lng?: number | null
          nida_number?: string | null
          phone?: string | null
          profile_image_url?: string | null
          rating?: number | null
          specialties?: string[]
          tier?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          availability_status?: string
          badge?: string | null
          certification_urls?: string[] | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          garage_location?: string | null
          id?: string
          is_blocked?: boolean
          is_online?: boolean
          lat?: number | null
          lng?: number | null
          nida_number?: string | null
          phone?: string | null
          profile_image_url?: string | null
          rating?: number | null
          specialties?: string[]
          tier?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message: string
          receiver_id: string
          request_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          receiver_id: string
          request_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          receiver_id?: string
          request_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          car_category: string | null
          created_at: string
          description: string | null
          id: string
          location: Json | null
          mechanic_id: string
          problem: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          car_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: Json | null
          mechanic_id: string
          problem?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          car_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: Json | null
          mechanic_id?: string
          problem?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_resets: {
        Row: {
          attempts: number
          blocked_until: string | null
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          resend_count: number
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          resend_count?: number
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          resend_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_blocked: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          car_model: string | null
          car_year: string | null
          category: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          mechanic_id: string | null
          status: string
          updated_at: string
          vehicle_size: string
        }
        Insert: {
          car_model?: string | null
          car_year?: string | null
          category: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          mechanic_id?: string | null
          status?: string
          updated_at?: string
          vehicle_size?: string
        }
        Update: {
          car_model?: string | null
          car_year?: string | null
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          mechanic_id?: string | null
          status?: string
          updated_at?: string
          vehicle_size?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_mechanic_approval: {
        Args: { _approval_status: string; _profile_id: string }
        Returns: undefined
      }
      advance_service_request_status: {
        Args: { _next_status: string; _request_id: string }
        Returns: undefined
      }
      accept_service_request: {
        Args: { _mechanic_user_id: string; _request_id: string }
        Returns: undefined
      }
      admin_list_mechanic_profiles: {
        Args: never
        Returns: {
          approval_status: string
          availability_status: string
          badge: string | null
          certification_urls: string[] | null
          created_at: string
          email: string | null
          experience_years: number | null
          full_name: string | null
          garage_location: string | null
          id: string
          is_blocked: boolean
          is_online: boolean
          lat: number | null
          lng: number | null
          nida_number: string | null
          phone: string | null
          profile_image_url: string | null
          rating: number | null
          specialties: string[]
          tier: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "mechanic_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_expired_resets: { Args: never; Returns: undefined }
      get_own_mechanic_profile: {
        Args: never
        Returns: {
          approval_status: string
          availability_status: string
          badge: string | null
          certification_urls: string[] | null
          created_at: string
          email: string | null
          experience_years: number | null
          full_name: string | null
          garage_location: string | null
          id: string
          is_blocked: boolean
          is_online: boolean
          lat: number | null
          lng: number | null
          nida_number: string | null
          phone: string | null
          profile_image_url: string | null
          rating: number | null
          specialties: string[]
          tier: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "mechanic_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_mechanic_registration: {
        Args: {
          _email: string
          _experience_years: number
          _full_name: string
          _garage_location: string
          _lat: number
          _lng: number
          _nida_number: string
          _phone: string
          _profile_image_url?: string | null
          _specialties: string[]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "client" | "mechanic"
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
      app_role: ["admin", "client", "mechanic"],
    },
  },
} as const
