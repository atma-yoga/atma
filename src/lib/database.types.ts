/**
 * Tipos do banco ATMA — espelham supabase/migrations/0001_init.sql.
 *
 * Escritos à mão porque `supabase gen types` exige login (PAT). Depois de
 * fazer `supabase login`, dá para regenerar e substituir este arquivo:
 *
 *   supabase gen types typescript --project-id eptroarvhwhstizyjjfh \
 *     > src/lib/database.types.ts
 *
 * Ao mexer na migration, mexer aqui junto.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          social_name: string | null;
          username: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          birth_date: string | null;
          document_id: string | null;
          address: Json | null;
          health_notes: string | null;
          health_conditions: string[];
          is_active: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          social_name?: string | null;
          username?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          document_id?: string | null;
          address?: Json | null;
          health_notes?: string | null;
          health_conditions?: string[];
          is_active?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          social_name?: string | null;
          username?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          document_id?: string | null;
          address?: Json | null;
          health_notes?: string | null;
          health_conditions?: string[];
          is_active?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_roles: {
        Row: {
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          granted_at: string;
        };
        Insert: {
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          granted_at?: string;
        };
        Update: {
          user_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          granted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      teachers: {
        Row: {
          profile_id: string;
          bio: string | null;
          specialties: string[];
          certifications: string[];
          session_rate: number | null;
          hired_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          bio?: string | null;
          specialties?: string[];
          certifications?: string[];
          session_rate?: number | null;
          hired_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          bio?: string | null;
          specialties?: string[];
          certifications?: string[];
          session_rate?: number | null;
          hired_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teachers_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: true;
          },
        ];
      };

      students: {
        Row: {
          profile_id: string;
          emergency_contact: Json | null;
          goals: string | null;
          experience_level: Database["public"]["Enums"]["class_level"];
          how_found_us: string | null;
          start_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          emergency_contact?: Json | null;
          goals?: string | null;
          experience_level?: Database["public"]["Enums"]["class_level"];
          how_found_us?: string | null;
          start_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          emergency_contact?: Json | null;
          goals?: string | null;
          experience_level?: Database["public"]["Enums"]["class_level"];
          how_found_us?: string | null;
          start_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: true;
          },
        ];
      };

      rooms: {
        Row: {
          id: string;
          name: string;
          capacity: number;
          is_outdoor: boolean;
          notes: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          capacity: number;
          is_outdoor?: boolean;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          capacity?: number;
          is_outdoor?: boolean;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      classes: {
        Row: {
          id: string;
          name: string;
          teacher_id: string | null;
          room_id: string | null;
          capacity: number;
          level: Database["public"]["Enums"]["class_level"];
          valid_from: string;
          valid_until: string | null;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          teacher_id?: string | null;
          room_id?: string | null;
          capacity?: number;
          level?: Database["public"]["Enums"]["class_level"];
          valid_from?: string;
          valid_until?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          teacher_id?: string | null;
          room_id?: string | null;
          capacity?: number;
          level?: Database["public"]["Enums"]["class_level"];
          valid_from?: string;
          valid_until?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "teachers";
            referencedColumns: ["profile_id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "classes_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      class_meetings: {
        Row: {
          id: string;
          class_id: string;
          weekday: number;
          start_time: string;
          duration_min: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          weekday: number;
          start_time: string;
          duration_min?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          weekday?: number;
          start_time?: string;
          duration_min?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_meetings_class_id_fkey";
            columns: ["class_id"];
            referencedRelation: "classes";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      class_enrollments: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
          enrolled_at: string;
          is_active: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          enrolled_at?: string;
          is_active?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_id?: string;
          enrolled_at?: string;
          is_active?: boolean;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey";
            columns: ["class_id"];
            referencedRelation: "classes";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
            isOneToOne: false;
          },
        ];
      };

      class_sessions: {
        Row: {
          id: string;
          schedule_id: string | null;
          title?: string | null;
          teacher_id?: string | null;
          room_id: string | null;
          starts_at: string;
          ends_at: string;
          capacity: number;
          level: Database["public"]["Enums"]["class_level"];
          status: Database["public"]["Enums"]["session_status"];
          cancel_reason: string | null;
          teacher_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          schedule_id?: string | null;
          title?: string | null;
          teacher_id?: string | null;
          room_id?: string | null;
          starts_at: string;
          ends_at: string;
          capacity: number;
          level?: Database["public"]["Enums"]["class_level"];
          status?: Database["public"]["Enums"]["session_status"];
          cancel_reason?: string | null;
          teacher_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          schedule_id?: string | null;
          title?: string | null;
          teacher_id?: string | null;
          room_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          capacity?: number;
          level?: Database["public"]["Enums"]["class_level"];
          status?: Database["public"]["Enums"]["session_status"];
          cancel_reason?: string | null;
          teacher_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_sessions_schedule_id_fkey";
            columns: ["schedule_id"];
            referencedRelation: "class_schedules";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "teachers";
            referencedColumns: ["profile_id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "class_sessions_room_id_fkey";
            columns: ["room_id"];
            referencedRelation: "rooms";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          period: Database["public"]["Enums"]["plan_period"];
          duration_days: number | null;
          class_credits: number | null;
          credits_per_week: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          period: Database["public"]["Enums"]["plan_period"];
          duration_days?: number | null;
          class_credits?: number | null;
          credits_per_week?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          period?: Database["public"]["Enums"]["plan_period"];
          duration_days?: number | null;
          class_credits?: number | null;
          credits_per_week?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      subscriptions: {
        Row: {
          id: string;
          student_id: string;
          plan_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          starts_on: string;
          ends_on: string | null;
          price_charged: number;
          credits_total: number | null;
          credits_used: number;
          auto_renew: boolean;
          canceled_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          plan_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          starts_on?: string;
          ends_on?: string | null;
          price_charged: number;
          credits_total?: number | null;
          credits_used?: number;
          auto_renew?: boolean;
          canceled_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          plan_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          starts_on?: string;
          ends_on?: string | null;
          price_charged?: number;
          credits_total?: number | null;
          credits_used?: number;
          auto_renew?: boolean;
          canceled_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      credit_ledger: {
        Row: {
          id: string;
          subscription_id: string;
          booking_id: string | null;
          delta: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          booking_id?: string | null;
          delta: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          booking_id?: string | null;
          delta?: number;
          reason?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_ledger_subscription_id_fkey";
            columns: ["subscription_id"];
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "credit_ledger_booking_fk";
            columns: ["booking_id"];
            referencedRelation: "bookings";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      bookings: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          subscription_id: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          waitlist_pos: number | null;
          booked_at: string;
          canceled_at: string | null;
          cancel_reason: string | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          subscription_id?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          waitlist_pos?: number | null;
          booked_at?: string;
          canceled_at?: string | null;
          cancel_reason?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          subscription_id?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          waitlist_pos?: number | null;
          booked_at?: string;
          canceled_at?: string | null;
          cancel_reason?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "bookings_subscription_id_fkey";
            columns: ["subscription_id"];
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "bookings_checked_in_by_fkey";
            columns: ["checked_in_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      payments: {
        Row: {
          id: string;
          student_id: string;
          subscription_id: string | null;
          amount: number;
          status: Database["public"]["Enums"]["payment_status"];
          method: Database["public"]["Enums"]["payment_method"] | null;
          due_date: string;
          paid_at: string | null;
          external_id: string | null;
          receipt_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subscription_id?: string | null;
          amount: number;
          status?: Database["public"]["Enums"]["payment_status"];
          method?: Database["public"]["Enums"]["payment_method"] | null;
          due_date: string;
          paid_at?: string | null;
          external_id?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subscription_id?: string | null;
          amount?: number;
          status?: Database["public"]["Enums"]["payment_status"];
          method?: Database["public"]["Enums"]["payment_method"] | null;
          due_date?: string;
          paid_at?: string | null;
          external_id?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey";
            columns: ["student_id"];
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };

      teacher_payouts: {
        Row: {
          id: string;
          teacher_id: string;
          period_start: string;
          period_end: string;
          sessions_count: number;
          amount: number;
          status: Database["public"]["Enums"]["payment_status"];
          paid_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          period_start: string;
          period_end: string;
          sessions_count?: number;
          amount: number;
          status?: Database["public"]["Enums"]["payment_status"];
          paid_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          period_start?: string;
          period_end?: string;
          sessions_count?: number;
          amount?: number;
          status?: Database["public"]["Enums"]["payment_status"];
          paid_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_payouts_teacher_id_fkey";
            columns: ["teacher_id"];
            referencedRelation: "teachers";
            referencedColumns: ["profile_id"];
            isOneToOne: false;
          },
        ];
      };

      announcements: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          body: string;
          audience: Database["public"]["Enums"]["app_role"][];
          is_pinned: boolean;
          published_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          body: string;
          audience?: Database["public"]["Enums"]["app_role"][];
          is_pinned?: boolean;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          body?: string;
          audience?: Database["public"]["Enums"]["app_role"][];
          is_pinned?: boolean;
          published_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
    };

    Views: {
      v_grade_semanal: {
        Row: {
          meeting_id: string | null;
          class_id: string | null;
          turma: string | null;
          weekday: number | null;
          start_time: string | null;
          duration_min: number | null;
          capacity: number | null;
          is_active: boolean | null;
          sala: string | null;
          is_outdoor: boolean | null;
          teacher_id: string | null;
          professor: string | null;
          professor_chamado: string | null;
          matriculados: number | null;
        };
        Relationships: [];
      };

      v_session_availability: {
        Row: {
          session_id: string | null;
          title: string | null;
          starts_at: string | null;
          ends_at: string | null;
          status: Database["public"]["Enums"]["session_status"] | null;
          level: Database["public"]["Enums"]["class_level"] | null;
          room: string | null;
          is_outdoor: boolean | null;
          teacher_name: string | null;
          teacher_id: string | null;
          capacity: number | null;
          booked_count: number | null;
          spots_left: number | null;
          waitlist_count: number | null;
        };
        Relationships: [];
      };

      v_student_overview: {
        Row: {
          profile_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          is_active: boolean | null;
          subscription_id: string | null;
          plan_name: string | null;
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null;
          ends_on: string | null;
          credits_total: number | null;
          credits_used: number | null;
          credits_left: number | null;
          total_attended: number | null;
          overdue_payments: number | null;
        };
        Relationships: [];
      };
    };

    Functions: {
      has_role: {
        Args: { check_role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_teacher: { Args: Record<string, never>; Returns: boolean };
      is_student: { Args: Record<string, never>; Returns: boolean };
      teaches_student: { Args: { target_student: string }; Returns: boolean };
      generate_sessions: {
        Args: { range_start: string; range_end: string };
        Returns: number;
      };
      expire_subscriptions: { Args: Record<string, never>; Returns: number };
    };

    Enums: {
      app_role: "admin" | "teacher" | "student";
      class_level: "todos" | "iniciante" | "intermediario" | "avancado";
      session_status: "scheduled" | "completed" | "canceled";
      booking_status:
        | "booked"
        | "waitlisted"
        | "attended"
        | "no_show"
        | "canceled";
      subscription_status:
        | "pending"
        | "active"
        | "paused"
        | "expired"
        | "canceled";
      payment_status: "pending" | "paid" | "overdue" | "refunded" | "canceled";
      payment_method:
        | "pix"
        | "credit_card"
        | "debit_card"
        | "cash"
        | "bank_transfer"
        | "other";
      plan_period:
        | "single"
        | "pack"
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual";
    };

    CompositeTypes: Record<string, never>;
  };
};

/* --- atalhos --- */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
