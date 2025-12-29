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
      account_balances: {
        Row: {
          account_id: string
          closing_balance: number | null
          currency: string | null
          fiscal_period_id: string | null
          id: string
          opening_balance: number | null
          total_credits: number | null
          total_debits: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          closing_balance?: number | null
          currency?: string | null
          fiscal_period_id?: string | null
          id?: string
          opening_balance?: number | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          closing_balance?: number | null
          currency?: string | null
          fiscal_period_id?: string | null
          id?: string
          opening_balance?: number | null
          total_credits?: number | null
          total_debits?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_fiscal_period_id_fkey"
            columns: ["fiscal_period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
        ]
      }
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
          region_id: string | null
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
          region_id?: string | null
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
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_addresses_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_regions: {
        Row: {
          created_at: string | null
          id: string
          region_code: string
          region_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          region_code: string
          region_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          region_code?: string
          region_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          can_have_consolidated_cargo: boolean
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_have_consolidated_cargo?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_have_consolidated_cargo?: boolean
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
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
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string
          chart_account_id: string | null
          created_at: string | null
          currency: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          opening_balance: number | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name: string
          chart_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string
          chart_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          balance: number | null
          bank_account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          is_reconciled: boolean | null
          journal_entry_id: string | null
          reconciled_at: string | null
          reference: string | null
          transaction_date: string
        }
        Insert: {
          balance?: number | null
          bank_account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          journal_entry_id?: string | null
          reconciled_at?: string | null
          reference?: string | null
          transaction_date: string
        }
        Update: {
          balance?: number | null
          bank_account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          journal_entry_id?: string | null
          reconciled_at?: string | null
          reference?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_costs: {
        Row: {
          amount: number
          batch_id: string
          cost_category: string
          created_at: string | null
          currency: string
          description: string | null
          entered_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          batch_id: string
          cost_category: string
          created_at?: string | null
          currency?: string
          description?: string | null
          entered_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string
          cost_category?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          entered_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_costs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cargo_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_batches: {
        Row: {
          arrival_week_end: string
          arrival_week_start: string
          batch_number: string
          cargo_type: string
          created_at: string | null
          created_by: string | null
          id: string
          origin_region: Database["public"]["Enums"]["agent_region"]
          region_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          arrival_week_end: string
          arrival_week_start: string
          batch_number: string
          cargo_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          origin_region: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          arrival_week_end?: string
          arrival_week_start?: string
          batch_number?: string
          cargo_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          origin_region?: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_batches_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_subtype: string | null
          account_type: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          normal_balance: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_subtype?: string | null
          account_type: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          normal_balance: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          normal_balance?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      container_pricing: {
        Row: {
          container_size: string
          created_at: string | null
          currency: string
          id: string
          price: number
          region: Database["public"]["Enums"]["agent_region"]
          region_id: string | null
          updated_at: string | null
        }
        Insert: {
          container_size: string
          created_at?: string | null
          currency?: string
          id?: string
          price: number
          region: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          updated_at?: string | null
        }
        Update: {
          container_size?: string
          created_at?: string | null
          currency?: string
          id?: string
          price?: number
          region?: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_pricing_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_exchange_rates: {
        Row: {
          currency_code: string
          currency_name: string
          id: string
          rate_to_tzs: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          currency_code: string
          currency_name: string
          id?: string
          rate_to_tzs: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          currency_code?: string
          currency_name?: string
          id?: string
          rate_to_tzs?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          assigned_employee_id: string | null
          company_name: string | null
          created_at: string | null
          customer_code: string | null
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          email: string | null
          id: string
          incharge_1_email: string | null
          incharge_1_name: string | null
          incharge_1_phone: string | null
          incharge_2_email: string | null
          incharge_2_name: string | null
          incharge_2_phone: string | null
          incharge_3_email: string | null
          incharge_3_name: string | null
          incharge_3_phone: string | null
          name: string
          notes: string | null
          phone: string | null
          tin: string | null
          updated_at: string | null
          user_id: string | null
          vrn: string | null
        }
        Insert: {
          address?: string | null
          assigned_employee_id?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_code?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          email?: string | null
          id?: string
          incharge_1_email?: string | null
          incharge_1_name?: string | null
          incharge_1_phone?: string | null
          incharge_2_email?: string | null
          incharge_2_name?: string | null
          incharge_2_phone?: string | null
          incharge_3_email?: string | null
          incharge_3_name?: string | null
          incharge_3_phone?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          tin?: string | null
          updated_at?: string | null
          user_id?: string | null
          vrn?: string | null
        }
        Update: {
          address?: string | null
          assigned_employee_id?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_code?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          email?: string | null
          id?: string
          incharge_1_email?: string | null
          incharge_1_name?: string | null
          incharge_1_phone?: string | null
          incharge_2_email?: string | null
          incharge_2_name?: string | null
          incharge_2_phone?: string | null
          incharge_3_email?: string | null
          incharge_3_name?: string | null
          incharge_3_phone?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          tin?: string | null
          updated_at?: string | null
          user_id?: string | null
          vrn?: string | null
        }
        Relationships: []
      }
      document_counters: {
        Row: {
          counter_key: string
          counter_value: number
          description: string | null
          id: string
          prefix: string | null
          updated_at: string | null
        }
        Insert: {
          counter_key: string
          counter_value?: number
          description?: string | null
          id?: string
          prefix?: string | null
          updated_at?: string | null
        }
        Update: {
          counter_key?: string
          counter_value?: number
          description?: string | null
          id?: string
          prefix?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_badges: {
        Row: {
          achieved_at: string
          badge_tier: string
          badge_type: string
          employee_id: string
          id: string
          metric_type: string
          rank_achieved: number
          time_period: string
          value_achieved: number
        }
        Insert: {
          achieved_at?: string
          badge_tier: string
          badge_type: string
          employee_id: string
          id?: string
          metric_type: string
          rank_achieved: number
          time_period: string
          value_achieved?: number
        }
        Update: {
          achieved_at?: string
          badge_tier?: string
          badge_type?: string
          employee_id?: string
          id?: string
          metric_type?: string
          rank_achieved?: number
          time_period?: string
          value_achieved?: number
        }
        Relationships: []
      }
      employee_milestones: {
        Row: {
          achieved_at: string
          employee_id: string
          id: string
          milestone_type: string
          milestone_value: string
          notified_at: string | null
        }
        Insert: {
          achieved_at?: string
          employee_id: string
          id?: string
          milestone_type: string
          milestone_value: string
          notified_at?: string | null
        }
        Update: {
          achieved_at?: string
          employee_id?: string
          id?: string
          milestone_type?: string
          milestone_value?: string
          notified_at?: string | null
        }
        Relationships: []
      }
      estimates: {
        Row: {
          converted_to_invoice_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_comments: string | null
          customer_id: string | null
          customer_response: string | null
          estimate_number: string
          estimate_type: string
          handling_fee: number | null
          id: string
          notes: string | null
          origin_region: Database["public"]["Enums"]["agent_region"]
          product_cost: number | null
          purchase_fee: number | null
          rate_per_kg: number
          responded_at: string | null
          shipment_id: string | null
          status: string | null
          subtotal: number
          total: number
          valid_until: string | null
          weight_kg: number
        }
        Insert: {
          converted_to_invoice_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_comments?: string | null
          customer_id?: string | null
          customer_response?: string | null
          estimate_number: string
          estimate_type?: string
          handling_fee?: number | null
          id?: string
          notes?: string | null
          origin_region: Database["public"]["Enums"]["agent_region"]
          product_cost?: number | null
          purchase_fee?: number | null
          rate_per_kg: number
          responded_at?: string | null
          shipment_id?: string | null
          status?: string | null
          subtotal: number
          total: number
          valid_until?: string | null
          weight_kg: number
        }
        Update: {
          converted_to_invoice_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_comments?: string | null
          customer_id?: string | null
          customer_response?: string | null
          estimate_number?: string
          estimate_type?: string
          handling_fee?: number | null
          id?: string
          notes?: string | null
          origin_region?: Database["public"]["Enums"]["agent_region"]
          product_cost?: number | null
          purchase_fee?: number | null
          rate_per_kg?: number
          responded_at?: string | null
          shipment_id?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          valid_until?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
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
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          category: string
          clarification_notes: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          denial_reason: string | null
          description: string | null
          id: string
          receipt_url: string | null
          region: Database["public"]["Enums"]["agent_region"] | null
          region_id: string | null
          shipment_id: string | null
          status: string
          submitted_by: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category: string
          clarification_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          denial_reason?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          region?: Database["public"]["Enums"]["agent_region"] | null
          region_id?: string | null
          shipment_id?: string | null
          status?: string
          submitted_by?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          category?: string
          clarification_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          denial_reason?: string | null
          description?: string | null
          id?: string
          receipt_url?: string | null
          region?: Database["public"]["Enums"]["agent_region"] | null
          region_id?: string | null
          shipment_id?: string | null
          status?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          end_date: string
          fiscal_year: number
          id: string
          period_name: string
          period_number: number
          period_type: string | null
          start_date: string
          status: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date: string
          fiscal_year: number
          id?: string
          period_name: string
          period_number: number
          period_type?: string | null
          start_date: string
          status?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date?: string
          fiscal_year?: number
          id?: string
          period_name?: string
          period_number?: number
          period_type?: string | null
          start_date?: string
          status?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          invoice_id: string
          item_type: string
          quantity: number
          unit_price: number
          weight_kg: number | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          invoice_id: string
          item_type: string
          quantity?: number
          unit_price?: number
          weight_kg?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string
          item_type?: string
          quantity?: number
          unit_price?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          agent_id: string | null
          amount: number
          amount_in_tzs: number | null
          amount_paid: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          due_date: string | null
          estimate_id: string | null
          id: string
          invoice_direction:
            | Database["public"]["Enums"]["invoice_direction_type"]
            | null
          invoice_number: string
          invoice_type: string
          notes: string | null
          paid_at: string | null
          payment_currency: string | null
          payment_method: string | null
          product_cost: number | null
          purchase_fee: number | null
          rate_per_kg: number | null
          shipment_id: string | null
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          agent_id?: string | null
          amount: number
          amount_in_tzs?: number | null
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_direction?:
            | Database["public"]["Enums"]["invoice_direction_type"]
            | null
          invoice_number: string
          invoice_type?: string
          notes?: string | null
          paid_at?: string | null
          payment_currency?: string | null
          payment_method?: string | null
          product_cost?: number | null
          purchase_fee?: number | null
          rate_per_kg?: number | null
          shipment_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          agent_id?: string | null
          amount?: number
          amount_in_tzs?: number | null
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_direction?:
            | Database["public"]["Enums"]["invoice_direction_type"]
            | null
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          paid_at?: string | null
          payment_currency?: string | null
          payment_method?: string | null
          product_cost?: number | null
          purchase_fee?: number | null
          rate_per_kg?: number | null
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
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          entry_date?: string
          entry_number: string
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          amount_in_tzs: number | null
          created_at: string | null
          credit_amount: number | null
          currency: string | null
          debit_amount: number | null
          description: string | null
          exchange_rate: number | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          amount_in_tzs?: number | null
          created_at?: string | null
          credit_amount?: number | null
          currency?: string | null
          debit_amount?: number | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          amount_in_tzs?: number | null
          created_at?: string | null
          credit_amount?: number | null
          currency?: string | null
          debit_amount?: number | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
          category: string | null
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
          category?: string | null
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
          category?: string | null
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
          picked_up_at: string | null
          picked_up_by: string | null
          shipment_id: string
          weight_kg: number
        }
        Insert: {
          barcode: string
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          picked_up_at?: string | null
          picked_up_by?: string | null
          shipment_id: string
          weight_kg: number
        }
        Update: {
          barcode?: string
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          picked_up_at?: string | null
          picked_up_by?: string | null
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
      region_delivery_times: {
        Row: {
          created_at: string | null
          delivery_time: string
          id: string
          region_id: string
          service_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_time: string
          id?: string
          region_id: string
          service_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_time?: string
          id?: string
          region_id?: string
          service_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "region_delivery_times_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_pricing: {
        Row: {
          agent_rate_per_kg: number
          cargo_type: string
          created_at: string | null
          currency: string
          customer_rate_per_kg: number
          handling_fee: number | null
          id: string
          region: Database["public"]["Enums"]["agent_region"]
          region_id: string | null
          service_type: string | null
          transit_point:
            | Database["public"]["Enums"]["transit_point_type"]
            | null
          updated_at: string | null
        }
        Insert: {
          agent_rate_per_kg: number
          cargo_type?: string
          created_at?: string | null
          currency?: string
          customer_rate_per_kg: number
          handling_fee?: number | null
          id?: string
          region: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          service_type?: string | null
          transit_point?:
            | Database["public"]["Enums"]["transit_point_type"]
            | null
          updated_at?: string | null
        }
        Update: {
          agent_rate_per_kg?: number
          cargo_type?: string
          created_at?: string | null
          currency?: string
          customer_rate_per_kg?: number
          handling_fee?: number | null
          id?: string
          region?: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          service_type?: string | null
          transit_point?:
            | Database["public"]["Enums"]["transit_point_type"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "region_pricing_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string
          created_at: string | null
          default_currency: string | null
          display_order: number | null
          flag_emoji: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          default_currency?: string | null
          display_order?: number | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          default_currency?: string | null
          display_order?: number | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      settlement_items: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          invoice_id: string
          settlement_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id: string
          settlement_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          invoice_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          agent_id: string
          amount_in_tzs: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          settlement_number: string
          settlement_type: string
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          amount_in_tzs?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          settlement_number: string
          settlement_type: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          amount_in_tzs?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          settlement_number?: string
          settlement_type?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      shipment_cost_allocations: {
        Row: {
          allocated_amount: number
          allocation_method: string
          batch_cost_id: string
          created_at: string | null
          currency: string
          id: string
          shipment_id: string
        }
        Insert: {
          allocated_amount?: number
          allocation_method?: string
          batch_cost_id: string
          created_at?: string | null
          currency?: string
          id?: string
          shipment_id: string
        }
        Update: {
          allocated_amount?: number
          allocation_method?: string
          batch_cost_id?: string
          created_at?: string | null
          currency?: string
          id?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_cost_allocations_batch_cost_id_fkey"
            columns: ["batch_cost_id"]
            isOneToOne: false
            referencedRelation: "batch_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_cost_allocations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          agent_cargo_weight_kg: number | null
          agent_id: string | null
          arrived_at: string | null
          batch_id: string | null
          billing_party:
            | Database["public"]["Enums"]["billing_party_type"]
            | null
          collected_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          delivered_at: string | null
          description: string | null
          id: string
          in_transit_at: string | null
          is_draft: boolean
          origin_region: Database["public"]["Enums"]["agent_region"]
          profit: number | null
          rate_per_kg: number | null
          region_id: string | null
          shipment_owner:
            | Database["public"]["Enums"]["shipment_owner_type"]
            | null
          status: Database["public"]["Enums"]["shipment_status"] | null
          total_cost: number | null
          total_revenue: number | null
          total_weight_kg: number
          tracking_number: string
          transit_point:
            | Database["public"]["Enums"]["transit_point_type"]
            | null
          updated_at: string | null
          warehouse_location: string | null
        }
        Insert: {
          agent_cargo_weight_kg?: number | null
          agent_id?: string | null
          arrived_at?: string | null
          batch_id?: string | null
          billing_party?:
            | Database["public"]["Enums"]["billing_party_type"]
            | null
          collected_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          in_transit_at?: string | null
          is_draft?: boolean
          origin_region: Database["public"]["Enums"]["agent_region"]
          profit?: number | null
          rate_per_kg?: number | null
          region_id?: string | null
          shipment_owner?:
            | Database["public"]["Enums"]["shipment_owner_type"]
            | null
          status?: Database["public"]["Enums"]["shipment_status"] | null
          total_cost?: number | null
          total_revenue?: number | null
          total_weight_kg: number
          tracking_number: string
          transit_point?:
            | Database["public"]["Enums"]["transit_point_type"]
            | null
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Update: {
          agent_cargo_weight_kg?: number | null
          agent_id?: string | null
          arrived_at?: string | null
          batch_id?: string | null
          billing_party?:
            | Database["public"]["Enums"]["billing_party_type"]
            | null
          collected_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          in_transit_at?: string | null
          is_draft?: boolean
          origin_region?: Database["public"]["Enums"]["agent_region"]
          profit?: number | null
          rate_per_kg?: number | null
          region_id?: string | null
          shipment_owner?:
            | Database["public"]["Enums"]["shipment_owner_type"]
            | null
          status?: Database["public"]["Enums"]["shipment_status"] | null
          total_cost?: number | null
          total_revenue?: number | null
          total_weight_kg?: number
          tracking_number?: string
          transit_point?:
            | Database["public"]["Enums"]["transit_point_type"]
            | null
          updated_at?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "cargo_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_calculator_charges: {
        Row: {
          applies_to: string
          cargo_type: string
          charge_key: string
          charge_name: string
          charge_type: string
          charge_value: number
          created_at: string | null
          currency: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          region: Database["public"]["Enums"]["agent_region"]
          region_id: string | null
          service_type: string | null
          updated_at: string | null
        }
        Insert: {
          applies_to?: string
          cargo_type?: string
          charge_key: string
          charge_name: string
          charge_type?: string
          charge_value?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          region?: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          service_type?: string | null
          updated_at?: string | null
        }
        Update: {
          applies_to?: string
          cargo_type?: string
          charge_key?: string
          charge_name?: string
          charge_type?: string
          charge_value?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          region?: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          service_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_calculator_charges_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_for_me_charges: {
        Row: {
          applies_to: string
          charge_key: string
          charge_name: string
          charge_type: string
          charge_value: number
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          applies_to?: string
          charge_key: string
          charge_name: string
          charge_type?: string
          charge_value?: number
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          applies_to?: string
          charge_key?: string
          charge_name?: string
          charge_type?: string
          charge_value?: number
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          rate: number
          tax_code: string
          tax_name: string
          tax_type: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rate: number
          tax_code: string
          tax_name: string
          tax_type?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rate?: number
          tax_code?: string
          tax_name?: string
          tax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      teaser_conversion_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          session_id: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          session_id: string
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transit_routes: {
        Row: {
          additional_cost: number | null
          created_at: string | null
          currency: string | null
          estimated_days: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          region_id: string
          transit_point: Database["public"]["Enums"]["transit_point_type"]
          updated_at: string | null
        }
        Insert: {
          additional_cost?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          region_id: string
          transit_point: Database["public"]["Enums"]["transit_point_type"]
          updated_at?: string | null
        }
        Update: {
          additional_cost?: number | null
          created_at?: string | null
          currency?: string | null
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          region_id?: string
          transit_point?: Database["public"]["Enums"]["transit_point_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transit_routes_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
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
          region_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          employee_role?: string | null
          id?: string
          permissions?: Json | null
          region?: Database["public"]["Enums"]["agent_region"] | null
          region_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          employee_role?: string | null
          id?: string
          permissions?: Json | null
          region?: Database["public"]["Enums"]["agent_region"] | null
          region_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_duty_rates: {
        Row: {
          applies_to: string
          created_at: string | null
          description: string | null
          display_order: number
          engine_cc_max: number | null
          engine_cc_min: number | null
          id: string
          is_active: boolean
          rate_key: string
          rate_name: string
          rate_type: string
          rate_value: number
          updated_at: string | null
          vehicle_age_min: number | null
          vehicle_category: string | null
        }
        Insert: {
          applies_to?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          engine_cc_max?: number | null
          engine_cc_min?: number | null
          id?: string
          is_active?: boolean
          rate_key: string
          rate_name: string
          rate_type?: string
          rate_value?: number
          updated_at?: string | null
          vehicle_age_min?: number | null
          vehicle_category?: string | null
        }
        Update: {
          applies_to?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          engine_cc_max?: number | null
          engine_cc_min?: number | null
          id?: string
          is_active?: boolean
          rate_key?: string
          rate_name?: string
          rate_type?: string
          rate_value?: number
          updated_at?: string | null
          vehicle_age_min?: number | null
          vehicle_category?: string | null
        }
        Relationships: []
      }
      vehicle_pricing: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          price: number
          region: Database["public"]["Enums"]["agent_region"]
          region_id: string | null
          shipping_method: string
          updated_at: string | null
          vehicle_type: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          id?: string
          price: number
          region: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          shipping_method: string
          updated_at?: string | null
          vehicle_type: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          price?: number
          region?: Database["public"]["Enums"]["agent_region"]
          region_id?: string | null
          shipping_method?: string
          updated_at?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_pricing_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_balance_summary: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          net_balance: number | null
          paid_from_agent: number | null
          paid_to_agent: number | null
          pending_from_agent: number | null
          pending_to_agent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      allocate_batch_costs: { Args: { p_batch_id: string }; Returns: undefined }
      generate_batch_number: { Args: never; Returns: string }
      generate_customer_code: { Args: never; Returns: string }
      generate_document_number: { Args: { prefix: string }; Returns: string }
      generate_estimate_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_journal_number: { Args: never; Returns: string }
      generate_settlement_number: { Args: never; Returns: string }
      generate_tracking_number: { Args: never; Returns: string }
      get_next_sequence: { Args: { p_counter_key: string }; Returns: string }
      get_or_create_batch: {
        Args: {
          _cargo_type?: string
          _origin_region: Database["public"]["Enums"]["agent_region"]
        }
        Returns: string
      }
      get_region_id_by_code: { Args: { _code: string }; Returns: string }
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
      user_has_region: {
        Args: {
          _region: Database["public"]["Enums"]["agent_region"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_region: "europe" | "dubai" | "china" | "india" | "usa" | "uk"
      app_role: "super_admin" | "employee" | "agent" | "customer"
      billing_party_type:
        | "customer_direct"
        | "agent_collect"
        | "astraline_internal"
      customer_type: "individual" | "corporate"
      invoice_direction_type: "to_agent" | "from_agent"
      shipment_owner_type: "astraline" | "agent"
      shipment_status: "collected" | "in_transit" | "arrived" | "delivered"
      transit_point_type: "direct" | "nairobi" | "zanzibar"
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
      agent_region: ["europe", "dubai", "china", "india", "usa", "uk"],
      app_role: ["super_admin", "employee", "agent", "customer"],
      billing_party_type: [
        "customer_direct",
        "agent_collect",
        "astraline_internal",
      ],
      customer_type: ["individual", "corporate"],
      invoice_direction_type: ["to_agent", "from_agent"],
      shipment_owner_type: ["astraline", "agent"],
      shipment_status: ["collected", "in_transit", "arrived", "delivered"],
      transit_point_type: ["direct", "nairobi", "zanzibar"],
    },
  },
} as const
