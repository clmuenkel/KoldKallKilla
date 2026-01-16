export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          company_name: string | null;
          title: string | null;
          calendar_link: string | null;
          email_signature: string | null;
          daily_call_goal: number;
          daily_email_goal: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          company_name?: string | null;
          title?: string | null;
          calendar_link?: string | null;
          email_signature?: string | null;
          daily_call_goal?: number;
          daily_email_goal?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          company_name?: string | null;
          title?: string | null;
          calendar_link?: string | null;
          email_signature?: string | null;
          daily_call_goal?: number;
          daily_email_goal?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          apollo_id: string | null;
          enrichment_status: string;
          enriched_at: string | null;
          first_name: string;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          linkedin_url: string | null;
          title: string | null;
          seniority: string | null;
          department: string | null;
          company_name: string | null;
          company_domain: string | null;
          company_linkedin: string | null;
          industry: string | null;
          industry_code: string | null;
          employee_count: number | null;
          employee_range: string | null;
          annual_revenue: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          stage: string;
          status: string;
          source: string | null;
          source_list: string | null;
          lead_score: number;
          has_budget: boolean;
          is_authority: boolean;
          has_need: boolean;
          has_timeline: boolean;
          tags: string[];
          last_contacted_at: string | null;
          next_follow_up: string | null;
          total_calls: number;
          total_emails: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          apollo_id?: string | null;
          enrichment_status?: string;
          enriched_at?: string | null;
          first_name: string;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile?: string | null;
          linkedin_url?: string | null;
          title?: string | null;
          seniority?: string | null;
          department?: string | null;
          company_name?: string | null;
          company_domain?: string | null;
          company_linkedin?: string | null;
          industry?: string | null;
          industry_code?: string | null;
          employee_count?: number | null;
          employee_range?: string | null;
          annual_revenue?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          stage?: string;
          status?: string;
          source?: string | null;
          source_list?: string | null;
          lead_score?: number;
          has_budget?: boolean;
          is_authority?: boolean;
          has_need?: boolean;
          has_timeline?: boolean;
          tags?: string[];
          last_contacted_at?: string | null;
          next_follow_up?: string | null;
          total_calls?: number;
          total_emails?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          apollo_id?: string | null;
          enrichment_status?: string;
          enriched_at?: string | null;
          first_name?: string;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile?: string | null;
          linkedin_url?: string | null;
          title?: string | null;
          seniority?: string | null;
          department?: string | null;
          company_name?: string | null;
          company_domain?: string | null;
          company_linkedin?: string | null;
          industry?: string | null;
          industry_code?: string | null;
          employee_count?: number | null;
          employee_range?: string | null;
          annual_revenue?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
          stage?: string;
          status?: string;
          source?: string | null;
          source_list?: string | null;
          lead_score?: number;
          has_budget?: boolean;
          is_authority?: boolean;
          has_need?: boolean;
          has_timeline?: boolean;
          tags?: string[];
          last_contacted_at?: string | null;
          next_follow_up?: string | null;
          total_calls?: number;
          total_emails?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          outcome: string;
          disposition: string | null;
          notes: string | null;
          tags_applied: string[];
          confirmed_budget: boolean | null;
          confirmed_authority: boolean | null;
          confirmed_need: boolean | null;
          confirmed_timeline: boolean | null;
          follow_up_date: string | null;
          follow_up_task_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          outcome: string;
          disposition?: string | null;
          notes?: string | null;
          tags_applied?: string[];
          confirmed_budget?: boolean | null;
          confirmed_authority?: boolean | null;
          confirmed_need?: boolean | null;
          confirmed_timeline?: boolean | null;
          follow_up_date?: string | null;
          follow_up_task_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          outcome?: string;
          disposition?: string | null;
          notes?: string | null;
          tags_applied?: string[];
          confirmed_budget?: boolean | null;
          confirmed_authority?: boolean | null;
          confirmed_need?: boolean | null;
          confirmed_timeline?: boolean | null;
          follow_up_date?: string | null;
          follow_up_task_id?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          title: string;
          description: string | null;
          type: string;
          priority: string;
          status: string;
          due_date: string | null;
          due_time: string | null;
          reminder_at: string | null;
          completed_at: string | null;
          is_recurring: boolean;
          recurrence_pattern: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id?: string | null;
          title: string;
          description?: string | null;
          type?: string;
          priority?: string;
          status?: string;
          due_date?: string | null;
          due_time?: string | null;
          reminder_at?: string | null;
          completed_at?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string | null;
          title?: string;
          description?: string | null;
          type?: string;
          priority?: string;
          status?: string;
          due_date?: string | null;
          due_time?: string | null;
          reminder_at?: string | null;
          completed_at?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          call_id: string | null;
          content: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          call_id?: string | null;
          content: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          call_id?: string | null;
          content?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string | null;
          subject_template: string;
          body_template: string;
          use_count: number;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: string | null;
          subject_template: string;
          body_template: string;
          use_count?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string | null;
          subject_template?: string;
          body_template?: string;
          use_count?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      emails: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          template_id: string | null;
          to_email: string;
          subject: string;
          body: string;
          status: string;
          scheduled_at: string | null;
          sent_at: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          replied_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          template_id?: string | null;
          to_email: string;
          subject: string;
          body: string;
          status?: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          replied_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          template_id?: string | null;
          to_email?: string;
          subject?: string;
          body?: string;
          status?: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          replied_at?: string | null;
          created_at?: string;
        };
      };
      call_lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          filter_stages: string[];
          filter_tags: string[];
          filter_industries: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          filter_stages?: string[];
          filter_tags?: string[];
          filter_industries?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          filter_stages?: string[];
          filter_tags?: string[];
          filter_industries?: string[];
          is_active?: boolean;
          created_at?: string;
        };
      };
      call_list_items: {
        Row: {
          id: string;
          call_list_id: string;
          contact_id: string;
          position: number;
          status: string;
          called_at: string | null;
          call_id: string | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          call_list_id: string;
          contact_id: string;
          position: number;
          status?: string;
          called_at?: string | null;
          call_id?: string | null;
          added_at?: string;
        };
        Update: {
          id?: string;
          call_list_id?: string;
          contact_id?: string;
          position?: number;
          status?: string;
          called_at?: string | null;
          call_id?: string | null;
          added_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          activity_type: string;
          reference_type: string | null;
          reference_id: string | null;
          metadata: Json;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          activity_type: string;
          reference_type?: string | null;
          reference_id?: string | null;
          metadata?: Json;
          summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          activity_type?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          metadata?: Json;
          summary?: string | null;
          created_at?: string;
        };
      };
      call_scripts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          industry: string | null;
          opener: string | null;
          value_prop: string | null;
          qualifying_questions: string[];
          objection_handlers: Json;
          close: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          industry?: string | null;
          opener?: string | null;
          value_prop?: string | null;
          qualifying_questions?: string[];
          objection_handlers?: Json;
          close?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          industry?: string | null;
          opener?: string | null;
          value_prop?: string | null;
          qualifying_questions?: string[];
          objection_handlers?: Json;
          close?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          apollo_api_key: string | null;
          default_call_script_id: string | null;
          default_email_template_id: string | null;
          reminder_email: boolean;
          reminder_browser: boolean;
          reminder_minutes_before: number;
          theme: string;
          timezone: string;
          date_format: string;
          work_start_time: string;
          work_end_time: string;
          work_days: number[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          apollo_api_key?: string | null;
          default_call_script_id?: string | null;
          default_email_template_id?: string | null;
          reminder_email?: boolean;
          reminder_browser?: boolean;
          reminder_minutes_before?: number;
          theme?: string;
          timezone?: string;
          date_format?: string;
          work_start_time?: string;
          work_end_time?: string;
          work_days?: number[];
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          apollo_api_key?: string | null;
          default_call_script_id?: string | null;
          default_email_template_id?: string | null;
          reminder_email?: boolean;
          reminder_browser?: boolean;
          reminder_minutes_before?: number;
          theme?: string;
          timezone?: string;
          date_format?: string;
          work_start_time?: string;
          work_end_time?: string;
          work_days?: number[];
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Commonly used types
export type Contact = Tables<"contacts">;
export type Call = Tables<"calls">;
export type Task = Tables<"tasks">;
export type Note = Tables<"notes">;
export type EmailTemplate = Tables<"email_templates">;
export type Email = Tables<"emails">;
export type CallList = Tables<"call_lists">;
export type CallListItem = Tables<"call_list_items">;
export type ActivityLog = Tables<"activity_log">;
export type CallScript = Tables<"call_scripts">;
export type UserSettings = Tables<"user_settings">;
export type Profile = Tables<"profiles">;
