export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Timestamped note entry for calls
export interface TimestampedNote {
  time: string; // Format: "MM:SS" or "HH:MM:SS"
  note: string;
}

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
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          domain: string | null;
          industry: string | null;
          employee_count: number | null;
          employee_range: string | null;
          city: string | null;
          state: string | null;
          country: string;
          timezone: string | null;
          website: string | null;
          linkedin_url: string | null;
          annual_revenue: string | null;
          intent_score: number | null;
          intent_topics: string[];
          dialer_paused_until: string | null;
          dialer_pause_reason_code: string | null;
          dialer_pause_reason_notes: string | null;
          dialer_paused_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          domain?: string | null;
          industry?: string | null;
          employee_count?: number | null;
          employee_range?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          timezone?: string | null;
          website?: string | null;
          linkedin_url?: string | null;
          annual_revenue?: string | null;
          intent_score?: number | null;
          intent_topics?: string[];
          dialer_paused_until?: string | null;
          dialer_pause_reason_code?: string | null;
          dialer_pause_reason_notes?: string | null;
          dialer_paused_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          domain?: string | null;
          industry?: string | null;
          employee_count?: number | null;
          employee_range?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          timezone?: string | null;
          website?: string | null;
          linkedin_url?: string | null;
          annual_revenue?: string | null;
          intent_score?: number | null;
          intent_topics?: string[];
          dialer_paused_until?: string | null;
          dialer_pause_reason_code?: string | null;
          dialer_pause_reason_notes?: string | null;
          dialer_paused_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          company_id: string | null;
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
          is_aaa: boolean;
          tags: string[];
          last_contacted_at: string | null;
          next_follow_up: string | null;
          total_calls: number;
          total_emails: number;
          direct_referral_contact_id: string | null;
          direct_referral_note: string | null;
          next_call_date: string | null;
          cadence_days: number | null;
          dialer_status: string;
          dialer_paused_until: string | null;
          dialer_pause_reason_code: string | null;
          dialer_pause_reason_notes: string | null;
          dialer_paused_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id?: string | null;
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
          is_aaa?: boolean;
          tags?: string[];
          last_contacted_at?: string | null;
          next_follow_up?: string | null;
          total_calls?: number;
          total_emails?: number;
          direct_referral_contact_id?: string | null;
          direct_referral_note?: string | null;
          next_call_date?: string | null;
          cadence_days?: number | null;
          dialer_status?: string;
          dialer_paused_until?: string | null;
          dialer_pause_reason_code?: string | null;
          dialer_pause_reason_notes?: string | null;
          dialer_paused_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string | null;
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
          is_aaa?: boolean;
          tags?: string[];
          last_contacted_at?: string | null;
          next_follow_up?: string | null;
          total_calls?: number;
          total_emails?: number;
          direct_referral_contact_id?: string | null;
          direct_referral_note?: string | null;
          next_call_date?: string | null;
          cadence_days?: number | null;
          dialer_status?: string;
          dialer_paused_until?: string | null;
          dialer_pause_reason_code?: string | null;
          dialer_pause_reason_notes?: string | null;
          dialer_paused_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      persona_sets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          titles: string[];
          industries: string[];
          employee_ranges: string[];
          include_intent_data: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          titles?: string[];
          industries?: string[];
          employee_ranges?: string[];
          include_intent_data?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          titles?: string[];
          industries?: string[];
          employee_ranges?: string[];
          include_intent_data?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          company_id: string | null;
          session_id: string | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          outcome: string;
          disposition: string | null;
          phone_used: string | null;
          notes: string | null;
          timestamped_notes: TimestampedNote[];
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
          company_id?: string | null;
          session_id?: string | null;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          outcome: string;
          disposition?: string | null;
          phone_used?: string | null;
          notes?: string | null;
          timestamped_notes?: TimestampedNote[];
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
          company_id?: string | null;
          session_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          outcome?: string;
          disposition?: string | null;
          phone_used?: string | null;
          notes?: string | null;
          timestamped_notes?: TimestampedNote[];
          tags_applied?: string[];
          confirmed_budget?: boolean | null;
          confirmed_authority?: boolean | null;
          confirmed_need?: boolean | null;
          confirmed_timeline?: boolean | null;
          follow_up_date?: string | null;
          follow_up_task_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          meeting_id: string | null;
          title: string;
          description: string | null;
          type: string;
          priority: string;
          importance: number | null;
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
          meeting_id?: string | null;
          title: string;
          description?: string | null;
          type?: string;
          priority?: string;
          importance?: number | null;
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
          meeting_id?: string | null;
          title?: string;
          description?: string | null;
          type?: string;
          priority?: string;
          importance?: number | null;
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
        Relationships: [];
      };
      task_contacts: {
        Row: { task_id: string; contact_id: string };
        Insert: { task_id: string; contact_id: string };
        Update: { task_id?: string; contact_id?: string };
        Relationships: [];
      };
      meeting_notes: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          content: string;
          is_action_item: boolean;
          task_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          content: string;
          is_action_item?: boolean;
          task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          content?: string;
          is_action_item?: boolean;
          task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          call_id: string | null;
          company_id: string | null;
          content: string;
          source: "manual" | "call";
          call_timestamp: string | null;
          is_pinned: boolean;
          is_company_wide: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id?: string | null;
          call_id?: string | null;
          company_id?: string | null;
          content: string;
          source?: "manual" | "call";
          call_timestamp?: string | null;
          is_pinned?: boolean;
          is_company_wide?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string | null;
          call_id?: string | null;
          company_id?: string | null;
          content?: string;
          source?: "manual" | "call";
          call_timestamp?: string | null;
          is_pinned?: boolean;
          is_company_wide?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          company_id: string | null;
          title: string;
          description: string | null;
          scheduled_at: string;
          duration_minutes: number;
          location: string | null;
          meeting_link: string | null;
          status: string;
          reminder_at: string | null;
          reminder_sent: boolean;
          outcome: string | null;
          outcome_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          company_id?: string | null;
          title: string;
          description?: string | null;
          scheduled_at: string;
          duration_minutes?: number;
          location?: string | null;
          meeting_link?: string | null;
          status?: string;
          reminder_at?: string | null;
          reminder_sent?: boolean;
          outcome?: string | null;
          outcome_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          company_id?: string | null;
          title?: string;
          description?: string | null;
          scheduled_at?: string;
          duration_minutes?: number;
          location?: string | null;
          meeting_link?: string | null;
          status?: string;
          reminder_at?: string | null;
          reminder_sent?: boolean;
          outcome?: string | null;
          outcome_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_attendees: {
        Row: { meeting_id: string; contact_id: string };
        Insert: { meeting_id: string; contact_id: string };
        Update: { meeting_id?: string; contact_id?: string };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      dialer_drafts: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          company_id: string | null;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          company_id?: string | null;
          payload: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          company_id?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dialer_pool_events: {
        Row: {
          id: string;
          user_id: string;
          entity_type: "company" | "contact";
          company_id: string | null;
          contact_id: string | null;
          entity_name: string;
          action: "paused" | "unpaused" | "deleted";
          paused_until: string | null;
          duration_months: number | null;
          reason_code: string | null;
          reason_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_type: "company" | "contact";
          company_id?: string | null;
          contact_id?: string | null;
          entity_name: string;
          action: "paused" | "unpaused" | "deleted";
          paused_until?: string | null;
          duration_months?: number | null;
          reason_code?: string | null;
          reason_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entity_type?: "company" | "contact";
          company_id?: string | null;
          contact_id?: string | null;
          entity_name?: string;
          action?: "paused" | "unpaused" | "deleted";
          paused_until?: string | null;
          duration_months?: number | null;
          reason_code?: string | null;
          reason_notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      capacity_settings: {
        Row: {
          user_id: string;
          target_per_day: number;
          new_quota_per_day: number;
          schedule_window_days: number;
          bloat_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          target_per_day?: number;
          new_quota_per_day?: number;
          schedule_window_days?: number;
          bloat_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          target_per_day?: number;
          new_quota_per_day?: number;
          schedule_window_days?: number;
          bloat_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
    CompositeTypes: {
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
export type Company = Tables<"companies">;
export type PersonaSet = Tables<"persona_sets">;
export type Call = Tables<"calls">;
export type Task = Tables<"tasks">;
export type Note = Tables<"notes">;
export type Meeting = Tables<"meetings">;
export type MeetingNote = Tables<"meeting_notes">;
export type EmailTemplate = Tables<"email_templates">;
export type Email = Tables<"emails">;
export type CallList = Tables<"call_lists">;
export type CallListItem = Tables<"call_list_items">;
export type ActivityLog = Tables<"activity_log">;
export type CallScript = Tables<"call_scripts">;
export type UserSettings = Tables<"user_settings">;
export type Profile = Tables<"profiles">;
export type DialerDraft = Tables<"dialer_drafts">;
export type DialerPoolEvent = Tables<"dialer_pool_events">;
export type CapacitySettings = Tables<"capacity_settings">;

// Extended types with relations
export interface ContactWithCompany extends Contact {
  companies?: Company | null;
}

export interface ContactWithReferral extends Contact {
  referrer?: Contact | null;
}

export interface CompanyWithContacts extends Company {
  contacts?: Contact[];
  contact_count?: number;
  last_contacted_at?: string | null;
}

// Contact subset used in relations (for joined queries)
export interface ContactRelation {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
}

// Extended types for joined queries
export interface MeetingWithContact extends Meeting {
  contacts: ContactRelation | null;
  meeting_attendees?: { contact_id: string; contacts: ContactRelation | null }[];
}

export interface TaskWithContact extends Task {
  contacts: ContactRelation | null;
  task_contacts?: { contact_id: string; contacts: ContactRelation | null }[];
}

export interface CallWithContact extends Call {
  contacts: ContactRelation | null;
}

export interface ActivityLogWithContact extends ActivityLog {
  contacts: ContactRelation | null;
}

export interface MeetingNoteWithTask extends MeetingNote {
  tasks: {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
  } | null;
}