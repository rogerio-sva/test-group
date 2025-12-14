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
      campaign_groups: {
        Row: {
          campaign_id: string
          created_at: string
          current_members: number
          group_name: string
          group_phone: string
          id: string
          invite_link: string | null
          is_active: boolean
          member_limit: number
          priority: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          current_members?: number
          group_name: string
          group_phone: string
          id?: string
          invite_link?: string | null
          is_active?: boolean
          member_limit?: number
          priority?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          current_members?: number
          group_name?: string
          group_phone?: string
          id?: string
          invite_link?: string | null
          is_active?: boolean
          member_limit?: number
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_history: {
        Row: {
          content: string
          created_at: string
          error_message: string | null
          failed_sends: number
          id: string
          media_url: string | null
          message_type: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          successful_sends: number
          target_groups: Json
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          error_message?: string | null
          failed_sends?: number
          id?: string
          media_url?: string | null
          message_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          successful_sends?: number
          target_groups?: Json
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          error_message?: string | null
          failed_sends?: number
          id?: string
          media_url?: string | null
          message_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          successful_sends?: number
          target_groups?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_send_details: {
        Row: {
          created_at: string
          error_message: string | null
          group_name: string | null
          group_phone: string
          id: string
          message_history_id: string
          sent_at: string | null
          status: string
          zapi_message_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          group_name?: string | null
          group_phone: string
          id?: string
          message_history_id: string
          sent_at?: string | null
          status?: string
          zapi_message_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          group_name?: string | null
          group_phone?: string
          id?: string
          message_history_id?: string
          sent_at?: string | null
          status?: string
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_send_details_message_history_id_fkey"
            columns: ["message_history_id"]
            isOneToOne: false
            referencedRelation: "message_history"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_link_clicks: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          redirected_to_group: string | null
          referrer: string | null
          smart_link_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          redirected_to_group?: string | null
          referrer?: string | null
          smart_link_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          redirected_to_group?: string | null
          referrer?: string | null
          smart_link_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_link_clicks_smart_link_id_fkey"
            columns: ["smart_link_id"]
            isOneToOne: false
            referencedRelation: "smart_links"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_links: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          detect_device: boolean
          id: string
          is_active: boolean
          name: string
          redirect_delay: number
          slug: string
          total_clicks: number
          track_clicks: boolean
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          detect_device?: boolean
          id?: string
          is_active?: boolean
          name: string
          redirect_delay?: number
          slug: string
          total_clicks?: number
          track_clicks?: boolean
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          detect_device?: boolean
          id?: string
          is_active?: boolean
          name?: string
          redirect_delay?: number
          slug?: string
          total_clicks?: number
          track_clicks?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
