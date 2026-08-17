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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      allocations: {
        Row: {
          auction_id: string
          created_at: string
          flag_note: string | null
          id: string
          ign: string
          item_id: string
          participant_id: string | null
          quantity: number
          queue_index: number
          status: Database["public"]["Enums"]["allocation_status"]
          superseded_at: string | null
          superseded_reason:
            | Database["public"]["Enums"]["removal_reason"]
            | null
          supersedes_id: string | null
          updated_at: string
        }
        Insert: {
          auction_id: string
          created_at?: string
          flag_note?: string | null
          id?: string
          ign: string
          item_id: string
          participant_id?: string | null
          quantity?: number
          queue_index?: number
          status?: Database["public"]["Enums"]["allocation_status"]
          superseded_at?: string | null
          superseded_reason?:
            | Database["public"]["Enums"]["removal_reason"]
            | null
          supersedes_id?: string | null
          updated_at?: string
        }
        Update: {
          auction_id?: string
          created_at?: string
          flag_note?: string | null
          id?: string
          ign?: string
          item_id?: string
          participant_id?: string | null
          quantity?: number
          queue_index?: number
          status?: Database["public"]["Enums"]["allocation_status"]
          superseded_at?: string | null
          superseded_reason?:
            | Database["public"]["Enums"]["removal_reason"]
            | null
          supersedes_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "auction_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_events: {
        Row: {
          actor: string | null
          auction_id: string
          created_at: string
          detail: string
          id: string
          kind: string
        }
        Insert: {
          actor?: string | null
          auction_id: string
          created_at?: string
          detail: string
          id?: string
          kind: string
        }
        Update: {
          actor?: string | null
          auction_id?: string
          created_at?: string
          detail?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_events_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_items: {
        Row: {
          added_items: number
          auction_id: string
          created_at: string
          id: string
          item_name: string
          max_per_bidder: number
          position: number
        }
        Insert: {
          added_items?: number
          auction_id: string
          created_at?: string
          id?: string
          item_name: string
          max_per_bidder?: number
          position?: number
        }
        Update: {
          added_items?: number
          auction_id?: string
          created_at?: string
          id?: string
          item_name?: string
          max_per_bidder?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "auction_items_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_participants: {
        Row: {
          auction_id: string
          created_at: string
          dropped: boolean
          id: string
          ign: string
          member_id: string | null
          needs_reconciliation: boolean
          tickets: number
        }
        Insert: {
          auction_id: string
          created_at?: string
          dropped?: boolean
          id?: string
          ign: string
          member_id?: string | null
          needs_reconciliation?: boolean
          tickets?: number
        }
        Update: {
          auction_id?: string
          created_at?: string
          dropped?: boolean
          id?: string
          ign?: string
          member_id?: string | null
          needs_reconciliation?: boolean
          tickets?: number
        }
        Relationships: [
          {
            foreignKeyName: "auction_participants_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          auction_date: string
          auction_type: Database["public"]["Enums"]["auction_type"]
          created_at: string
          id: string
          name: string
          pointer: number
          status: Database["public"]["Enums"]["auction_status"]
          updated_at: string
        }
        Insert: {
          auction_date?: string
          auction_type?: Database["public"]["Enums"]["auction_type"]
          created_at?: string
          id?: string
          name: string
          pointer?: number
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
        }
        Update: {
          auction_date?: string
          auction_type?: Database["public"]["Enums"]["auction_type"]
          created_at?: string
          id?: string
          name?: string
          pointer?: number
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
        }
        Relationships: []
      }
      guild_settings: {
        Row: {
          created_at: string
          id: boolean
          new_member_restriction_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          new_member_restriction_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          new_member_restriction_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          id: string
          job_class: Database["public"]["Enums"]["job_class"]
          join_date: string | null
          name: string
          position_at_removal: number | null
          removal_reason: Database["public"]["Enums"]["removal_reason"] | null
          removed_at: string | null
          restriction_lifted_at: string | null
          sort_order: number
          status: Database["public"]["Enums"]["member_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          job_class: Database["public"]["Enums"]["job_class"]
          join_date?: string | null
          name: string
          position_at_removal?: number | null
          removal_reason?: Database["public"]["Enums"]["removal_reason"] | null
          removed_at?: string | null
          restriction_lifted_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["member_status"]
        }
        Update: {
          created_at?: string
          id?: string
          job_class?: Database["public"]["Enums"]["job_class"]
          join_date?: string | null
          name?: string
          position_at_removal?: number | null
          removal_reason?: Database["public"]["Enums"]["removal_reason"] | null
          removed_at?: string | null
          restriction_lifted_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["member_status"]
        }
        Relationships: []
      }
      party_assignments: {
        Row: {
          created_at: string
          id: string
          member_id: string
          section: Database["public"]["Enums"]["raid_section"]
          slot_index: number
          team_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          section: Database["public"]["Enums"]["raid_section"]
          slot_index: number
          team_index: number
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          section?: Database["public"]["Enums"]["raid_section"]
          slot_index?: number
          team_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "party_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      allocation_status: "valid" | "warning" | "error" | "superseded"
      app_role: "admin"
      auction_status: "open" | "finalized" | "amended"
      auction_type: "guild_league" | "emperium_overrun" | "standard"
      job_class:
        | "Lord Knight"
        | "Paladin"
        | "Sniper"
        | "Minstrel"
        | "Gypsy"
        | "High Priest"
        | "Champion"
        | "Whitesmith"
        | "Biochemist"
        | "High Wizard"
        | "Professor"
        | "Doram"
        | "Gunslinger"
        | "Stalker"
        | "Assassin Cross"
      member_status: "active" | "removed"
      raid_section: "elite" | "sub"
      removal_reason: "rejoin" | "reassign" | "rejected" | "mia"
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
      allocation_status: ["valid", "warning", "error", "superseded"],
      app_role: ["admin"],
      auction_status: ["open", "finalized", "amended"],
      auction_type: ["guild_league", "emperium_overrun", "standard"],
      job_class: [
        "Lord Knight",
        "Paladin",
        "Sniper",
        "Minstrel",
        "Gypsy",
        "High Priest",
        "Champion",
        "Whitesmith",
        "Biochemist",
        "High Wizard",
        "Professor",
        "Doram",
        "Gunslinger",
        "Stalker",
        "Assassin Cross",
      ],
      member_status: ["active", "removed"],
      raid_section: ["elite", "sub"],
      removal_reason: ["rejoin", "reassign", "rejected", "mia"],
    },
  },
} as const
