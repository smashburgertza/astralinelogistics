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
      agent_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string
          created_at: string | null
          id: string
          postal_code: string | null
          region: Database["public"]["Enums"]["agent_region"]
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country: string
          created_at?: string | null
          id?: string
          postal_code?: string | null
          region: Database["public"]["Enums"]["agent_region"]
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string | null
          id?: string
          postal_code?: string | null
          region?: Database["public"]["Enums"]["agent_region"]
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          commission_type: string
          created_at: string | null
          description: string | null
          employee_id: string
          id: string
          is_active: boolean | null
          rate: number
          updated_at: string | null
        }
        Insert: {
          commission_type: string
          created_at?: string | null
          description?: string | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          rate: number
          updated_at?: string | null
        }
        Update: {
          commission_type?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          employee_id: string
          id: string
          invoice_id: string | null
          paid_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          employee_id: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          employee_id?: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          assigned_employee_id: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_employee_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_employee_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      estimates: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          estimate_number: string
          handling_fee: number | null
          id: string
          notes: string | null
          origin_region: Database["public"]["Enums"]["agent_region"]
          rate_per_kg: number
          shipment_id: string | null
          status: string | null
          subtotal: number
          total: number
          valid_until: string | null
          weight_kg: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          estimate_number: string
          handling_fee?: number | null
          id?: string
          notes?: string | null
          origin_region: Database["public"]["Enums"]["agent_region"]
          rate_per_kg: number
          shipment_id?: string | null
          status?: string | null
          subtotal: number
          total: number
          valid_until?: string | null
          weight_kg: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          estimate_number?: string
          handling_fee?: number | null
          id?: string
          notes?: string | null
          origin_region?: Database["public"]["Enums"]["agent_region"]
          rate_per_kg?: number
          shipment_id?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          valid_until?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          receipt_url: string | null
          region: Database["public"]["Enums"]["agent_region"] | null
          shipment_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          region?: Database["public"]["Enums"]["agent_region"] | null
          shipment_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          region?: Database["public"]["Enums"]["agent_region"] | null
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          due_date: string | null
          estimate_id: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          shipment_id: string | null
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          shipment_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          shipment_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          shipment_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          shipment_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          shipment_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          currency: string | null
          estimated_weight_kg: number | null
          id: string
          order_request_id: string | null
          product_name: string | null
          product_price: number | null
          product_url: string
          quantity: number
          subtotal: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          estimated_weight_kg?: number | null
          id?: string
          order_request_id?: string | null
          product_name?: string | null
          product_price?: number | null
          product_url: string
          quantity?: number
          subtotal?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          estimated_weight_kg?: number | null
          id?: string
          order_request_id?: string | null
          product_name?: string | null
          product_price?: number | null
          product_url?: string
          quantity?: number
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_request_id_fkey"
            columns: ["order_request_id"]
            isOneToOne: false
            referencedRelation: "order_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      order_requests: {
        Row: {
          created_at: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string
          estimated_shipping_cost: number
          grand_total: number
          handling_fee: number
          id: string
          notes: string | null
          status: string
          total_product_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string
          estimated_shipping_cost?: number
          grand_total?: number
          handling_fee?: number
          id?: string
          notes?: string | null
          status?: string
          total_product_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          estimated_shipping_cost?: number
          grand_total?: number
          handling_fee?: number
          id?: string
          notes?: string | null
          status?: string
          total_product_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content: Json | null
          description: string | null
          id: string
          is_visible: boolean | null
          section_key: string
          subtitle: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content?: Json | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          section_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: Json | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          section_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      parcels: {
        Row: {
          barcode: string
          created_at: string | null
          description: string | null
          dimensions: string | null
          id: string
          shipment_id: string
          weight_kg: number
        }
        Insert: {
          barcode: string
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          shipment_id: string
          weight_kg: number
        }
        Update: {
          barcode?: string
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          shipment_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcels_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          currency: string | null
          id: string
          invoice_id: string
          paid_at: string | null
          payment_method: string
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          currency?: string | null
          id?: string
          invoice_id: string
          paid_at?: string | null
          payment_method: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          currency?: string | null
          id?: string
          invoice_id?: string
          paid_at?: string | null
          payment_method?: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      region_pricing: {
        Row: {
          agent_rate_per_kg: number
          created_at: string | null
          currency: string
          customer_rate_per_kg: number
          handling_fee: number | null
          id: string
          region: Database["public"]["Enums"]["agent_region"]
          updated_at: string | null
        }
        Insert: {
          agent_rate_per_kg: number
          created_at?: string | null
          currency?: string
          customer_rate_per_kg: number
          handling_fee?: number | null
          id?: string
          region: Database["public"]["Enums"]["agent_region"]
          updated_at?: string | null
        }
        Update: {
          agent_rate_per_kg?: number
          created_at?: string | null
          currency?: string
          customer_rate_per_kg?: number
          handling_fee?: number | null
          id?: string
          region?: Database["public"]["Enums"]["agent_region"]
          updated_at?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          agent_id: string | null
          arrived_at: string | null
          collected_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivered_at: string | null
          description: string | null
          id: string
          in_transit_at: string | null
          origin_region: Database["public"]["Enums"]["agent_region"]
          status: Database["public"]["Enums"]["shipment_status"] | null
          total_weight_kg: number
          tracking_number: string
          updated_at: string | null
          warehouse_location: string | null
        }
        Insert: {
          agent_id?: string | null
          arrived_at?: string | null
          collected_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          in_transit_at?: string | null
          origin_region: Database["public"]["Enums"]["agent_region"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          total_weight_kg: number
          tracking_number: string
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Update: {
          agent_id?: string | null
          arrived_at?: string | null
          collected_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          in_transit_at?: string | null
          origin_region?: Database["public"]["Enums"]["agent_region"]
          status?: Database["public"]["Enums"]["shipment_status"] | null
          total_weight_kg?: number
          tracking_number?: string
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          employee_role: string | null
          id: string
          permissions: Json | null
          region: Database["public"]["Enums"]["agent_region"] | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          employee_role?: string | null
          id?: string
          permissions?: Json | null
          region?: Database["public"]["Enums"]["agent_region"] | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          employee_role?: string | null
          id?: string
          permissions?: Json | null
          region?: Database["public"]["Enums"]["agent_region"] | null
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
      generate_document_number: { Args: { prefix: string }; Returns: string }
      generate_tracking_number: { Args: never; Returns: string }
      get_user_region: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["agent_region"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_employee: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      agent_region: "europe" | "dubai" | "china" | "india"
      app_role: "super_admin" | "employee" | "agent" | "customer"
      shipment_status: "collected" | "in_transit" | "arrived" | "delivered"
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
      agent_region: ["europe", "dubai", "china", "india"],
      app_role: ["super_admin", "employee", "agent", "customer"],
      shipment_status: ["collected", "in_transit", "arrived", "delivered"],
    },
  },
} as const
