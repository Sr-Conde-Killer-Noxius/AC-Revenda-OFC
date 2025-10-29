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
      active_payment_gateway: {
        Row: {
          gateway_name: string
          id: number
          updated_at: string | null
        }
        Insert: {
          gateway_name: string
          id?: number
          updated_at?: string | null
        }
        Update: {
          gateway_name?: string
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_financial_entries: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          description: string
          id: string
          subscriber_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          value: number
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          subscriber_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          value: number
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          subscriber_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          value?: number
        }
        Relationships: []
      }
      automations: {
        Row: {
          client_ids: string[]
          created_at: string
          days_offset: number
          id: string
          scheduled_time: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_ids: string[]
          created_at?: string
          days_offset: number
          id?: string
          scheduled_time?: string
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_ids?: string[]
          created_at?: string
          days_offset?: number
          id?: string
          scheduled_time?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          due_date: string
          email: string | null
          id: string
          name: string
          next_billing_date: string
          notes: string | null
          phone: string
          plan_id: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          due_date: string
          email?: string | null
          id?: string
          name: string
          next_billing_date: string
          notes?: string | null
          phone: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          due_date?: string
          email?: string | null
          id?: string
          name?: string
          next_billing_date?: string
          notes?: string | null
          phone?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_status: {
        Row: {
          id: string
          instance_name: string
          last_updated: string
          qr_code_base64: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          instance_name: string
          last_updated?: string
          qr_code_base64?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          instance_name?: string
          last_updated?: string
          qr_code_base64?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_api_history: {
        Row: {
          client_id: string | null
          client_name_snapshot: string | null
          id: string
          payload: Json
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
          template_id: string | null
          timestamp: string | null
          user_id: string | null
          webhook_type: string
        }
        Insert: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type: string
        }
        Update: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload?: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_api_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_api_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_logout_history: {
        Row: {
          client_id: string | null
          client_name_snapshot: string | null
          id: string
          payload: Json
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
          template_id: string | null
          timestamp: string | null
          user_id: string | null
          webhook_type: string
        }
        Insert: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type: string
        }
        Update: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload?: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_logout_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_logout_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          created_at: string | null
          description: string
          id: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_pago_charges: {
        Row: {
          created_at: string | null
          id: string
          mercado_pago_payment_id: string
          status: string
          subscription_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          mercado_pago_payment_id: string
          status?: string
          subscription_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          mercado_pago_payment_id?: string
          status?: string
          subscription_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "mercado_pago_charges_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_pago_configs: {
        Row: {
          id: number
          mercado_pago_access_token: string
          mercado_pago_client_id: string
          mercado_pago_client_secret: string
          mercado_pago_public_key: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          mercado_pago_access_token: string
          mercado_pago_client_id: string
          mercado_pago_client_secret: string
          mercado_pago_public_key: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          mercado_pago_access_token?: string
          mercado_pago_client_id?: string
          mercado_pago_client_secret?: string
          mercado_pago_public_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_message_sender_history: {
        Row: {
          client_id: string | null
          client_name_snapshot: string | null
          id: string
          payload: Json
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
          template_id: string | null
          timestamp: string | null
          user_id: string | null
          webhook_type: string
        }
        Insert: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type: string
        }
        Update: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload?: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_message_sender_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "n8n_message_sender_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_qr_code_history: {
        Row: {
          client_id: string | null
          client_name_snapshot: string | null
          id: string
          payload: Json
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
          template_id: string | null
          timestamp: string | null
          user_id: string | null
          webhook_type: string
        }
        Insert: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type: string
        }
        Update: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload?: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string | null
          user_id?: string | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_qr_code_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "n8n_qr_code_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          target_type: string
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          target_type?: string
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagbank_charges: {
        Row: {
          created_at: string | null
          id: string
          pagbank_charge_id: string
          status: string
          subscription_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          pagbank_charge_id: string
          status?: string
          subscription_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          pagbank_charge_id?: string
          status?: string
          subscription_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagbank_charges_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pagbank_configs: {
        Row: {
          environment: Database["public"]["Enums"]["pagbank_environment"]
          id: number
          pagbank_email: string
          pagbank_pix_key: string
          pagbank_token: string
          updated_at: string | null
        }
        Insert: {
          environment?: Database["public"]["Enums"]["pagbank_environment"]
          id?: number
          pagbank_email: string
          pagbank_pix_key: string
          pagbank_token: string
          updated_at?: string | null
        }
        Update: {
          environment?: Database["public"]["Enums"]["pagbank_environment"]
          id?: number
          pagbank_email?: string
          pagbank_pix_key?: string
          pagbank_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_sends: {
        Row: {
          automation_id: string
          client_id: string
          created_at: string
          id: string
          scheduled_for: string
          template_id: string
          user_id: string
        }
        Insert: {
          automation_id: string
          client_id: string
          created_at?: string
          id?: string
          scheduled_for: string
          template_id: string
          user_id: string
        }
        Update: {
          automation_id?: string
          client_id?: string
          created_at?: string
          id?: string
          scheduled_for?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_sends_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_sends_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          name: string
          period_days: number
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          period_days: number
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          period_days?: number
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          external_id: string | null
          id: string
          name: string
          phone: string | null
          pix_key: string | null
          revenda_user_id: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          external_id?: string | null
          id: string
          name: string
          phone?: string | null
          pix_key?: string | null
          revenda_user_id?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          external_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          pix_key?: string | null
          revenda_user_id?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      revenda_webhook_history: {
        Row: {
          event_type: string
          id: string
          payload: Json | null
          processing_log: string | null
          received_at: string | null
          source_user_id: string | null
          status_code: number | null
        }
        Insert: {
          event_type: string
          id?: string
          payload?: Json | null
          processing_log?: string | null
          received_at?: string | null
          source_user_id?: string | null
          status_code?: number | null
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json | null
          processing_log?: string | null
          received_at?: string | null
          source_user_id?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          automation_id: string
          client_id: string
          created_at: string | null
          id: string
          send_at: string
          status: string
          template_id: string
          type: string
          user_id: string
        }
        Insert: {
          automation_id: string
          client_id: string
          created_at?: string | null
          id?: string
          send_at: string
          status?: string
          template_id: string
          type?: string
          user_id: string
        }
        Update: {
          automation_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          send_at?: string
          status?: string
          template_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      send_history: {
        Row: {
          client_id: string
          error_message: string | null
          id: string
          sent_at: string
          status: string
          template_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status: string
          template_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_automations: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          days_offset: number
          id: string
          scheduled_time: string
          subscriber_ids: string[]
          subscriber_template_id: string | null
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          days_offset: number
          id?: string
          scheduled_time?: string
          subscriber_ids: string[]
          subscriber_template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          days_offset?: number
          id?: string
          scheduled_time?: string
          subscriber_ids?: string[]
          subscriber_template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_automations_subscriber_template_id_fkey"
            columns: ["subscriber_template_id"]
            isOneToOne: false
            referencedRelation: "subscriber_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_plans: {
        Row: {
          created_at: string | null
          id: string
          is_free: boolean
          name: string
          period_days: number
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_free?: boolean
          name: string
          period_days: number
          updated_at?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_free?: boolean
          name?: string
          period_days?: number
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      subscriber_templates: {
        Row: {
          admin_user_id: string | null
          content: string
          created_at: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["template_type"]
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          next_billing_date: string | null
          plan_name: string
          price: number
          status: Database["public"]["Enums"]["app_subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_billing_date?: string | null
          plan_name: string
          price: number
          status?: Database["public"]["Enums"]["app_subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          next_billing_date?: string | null
          plan_name?: string
          price?: number
          status?: Database["public"]["Enums"]["app_subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["template_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      url_configs: {
        Row: {
          evolution_listener_url: string
          id: number
          n8n_webhook_url: string
        }
        Insert: {
          evolution_listener_url: string
          id?: number
          n8n_webhook_url: string
        }
        Update: {
          evolution_listener_url?: string
          id?: number
          n8n_webhook_url?: string
        }
        Relationships: []
      }
      user_instances: {
        Row: {
          created_at: string
          id: string
          instance_name: string
          qr_code_base64: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_status: {
        Row: {
          created_at: string | null
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_status_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          created_at: string
          id: string
          type: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          type: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_history: {
        Row: {
          client_id: string | null
          client_name_snapshot: string | null
          id: string
          payload: Json
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
          template_id: string | null
          timestamp: string
          user_id: string
          webhook_type: string
        }
        Insert: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string
          user_id: string
          webhook_type: string
        }
        Update: {
          client_id?: string | null
          client_name_snapshot?: string | null
          id?: string
          payload?: Json
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
          template_id?: string | null
          timestamp?: string
          user_id?: string
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      process_automated_notifications: { Args: never; Returns: undefined }
      process_notification_queue: { Args: never; Returns: undefined }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      app_role: "admin" | "user"
      app_subscription_status: "active" | "inactive" | "overdue"
      client_status: "active" | "inactive" | "overdue"
      notification_target_type: "global" | "specific"
      pagbank_environment: "sandbox" | "production"
      template_type: "normal" | "global"
      transaction_type: "credit" | "debit"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_subscription_status: ["active", "inactive", "overdue"],
      client_status: ["active", "inactive", "overdue"],
      notification_target_type: ["global", "specific"],
      pagbank_environment: ["sandbox", "production"],
      template_type: ["normal", "global"],
      transaction_type: ["credit", "debit"],
    },
  },
} as const
