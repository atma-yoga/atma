/**
 * GERADO AUTOMATICAMENTE — não edite à mão.
 *
 * Reflete o schema real do banco. Depois de aplicar uma migration, rode:
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/gerar-tipos.mjs eptroarvhwhstizyjjfh
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
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
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
            foreignKeyName: "bookings_checked_in_by_fkey";
            columns: ["checked_in_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "bookings_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
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
          custom_price: number | null;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          enrolled_at?: string;
          is_active?: boolean;
          notes?: string | null;
          custom_price?: number | null;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_id?: string;
          enrolled_at?: string;
          is_active?: boolean;
          notes?: string | null;
          custom_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
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
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };

      class_sessions: {
        Row: {
          id: string;
          schedule_id: string | null;
          teacher_id: string | null;
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
          title: string | null;
          class_id: string | null;
        };
        Insert: {
          id?: string;
          schedule_id?: string | null;
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
          title?: string | null;
          class_id?: string | null;
        };
        Update: {
          id?: string;
          schedule_id?: string | null;
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
          title?: string | null;
          class_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["profile_id"];
          },
        ];
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
          monthly_price: number;
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
          monthly_price?: number;
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
          monthly_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "classes_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["profile_id"];
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
            foreignKeyName: "credit_ledger_booking_fk";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_ledger_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };

      invites: {
        Row: {
          id: string;
          token: string;
          role: Database["public"]["Enums"]["app_role"];
          label: string | null;
          created_by: string | null;
          expires_at: string;
          max_uses: number | null;
          uses: number;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          role: Database["public"]["Enums"]["app_role"];
          label?: string | null;
          created_by?: string | null;
          expires_at: string;
          max_uses?: number | null;
          uses?: number;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          role?: Database["public"]["Enums"]["app_role"];
          label?: string | null;
          created_by?: string | null;
          expires_at?: string;
          max_uses?: number | null;
          uses?: number;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
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
          class_id: string | null;
          reference_month: string | null;
          proportion: number | null;
          reminded_at: string | null;
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
          class_id?: string | null;
          reference_month?: string | null;
          proportion?: number | null;
          reminded_at?: string | null;
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
          class_id?: string | null;
          reference_month?: string | null;
          proportion?: number | null;
          reminded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
          },
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };

      pending_admins: {
        Row: {
          email: string;
          username: string | null;
          created_at: string;
          note: string | null;
        };
        Insert: {
          email: string;
          username?: string | null;
          created_at?: string;
          note?: string | null;
        };
        Update: {
          email?: string;
          username?: string | null;
          created_at?: string;
          note?: string | null;
        };
        Relationships: [];
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

      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          birth_date: string | null;
          document_id: string | null;
          address: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          must_change_password: boolean;
          username: string | null;
          health_notes: string | null;
          social_name: string | null;
          health_conditions: string[];
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          document_id?: string | null;
          address?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          must_change_password?: boolean;
          username?: string | null;
          health_notes?: string | null;
          social_name?: string | null;
          health_conditions?: string[];
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          birth_date?: string | null;
          document_id?: string | null;
          address?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          must_change_password?: boolean;
          username?: string | null;
          health_notes?: string | null;
          social_name?: string | null;
          health_conditions?: string[];
        };
        Relationships: [];
      };

      rooms: {
        Row: {
          id: string;
          name: string;
          capacity: number;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          is_outdoor: boolean;
          address: Json | null;
          color: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          capacity: number;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          is_outdoor?: boolean;
          address?: Json | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          capacity?: number;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          is_outdoor?: boolean;
          address?: Json | null;
          color?: string | null;
        };
        Relationships: [];
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
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["profile_id"];
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
            isOneToOne: false;
            referencedRelation: "teachers";
            referencedColumns: ["profile_id"];
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
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

    };
    Views: {
      v_aulas_do_aluno: {
        Row: {
          booking_id: string | null;
          student_id: string | null;
          presenca: Database["public"]["Enums"]["booking_status"] | null;
          session_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
          status_aula: Database["public"]["Enums"]["session_status"] | null;
          cancel_reason: string | null;
          class_id: string | null;
          turma: string | null;
          sala: string | null;
          cor: string | null;
          is_outdoor: boolean | null;
          professor: string | null;
        };
        Relationships: [];
      };

      v_ficha_completa: {
        Row: {
          student_id: string | null;
          full_name: string | null;
          social_name: string | null;
          email: string | null;
          phone: string | null;
          document_id: string | null;
          address: Json | null;
          health_conditions: string[] | null;
          health_notes: string | null;
          must_change_password: boolean | null;
          perfil_ativo: boolean | null;
          start_date: string | null;
          experience_level: Database["public"]["Enums"]["class_level"] | null;
          emergency_contact: Json | null;
          goals: string | null;
          how_found_us: string | null;
          aluno_ativo: boolean | null;
          turmas: number | null;
          ja_pagou: number | null;
          em_aberto: number | null;
        };
        Relationships: [];
      };

      v_ficha_do_aluno: {
        Row: {
          student_id: string | null;
          nome: string | null;
          nome_completo: string | null;
          health_conditions: string[] | null;
          health_notes: string | null;
        };
        Relationships: [];
      };

      v_frequencia: {
        Row: {
          student_id: string | null;
          class_id: string | null;
          aulas_com_registro: number | null;
          presencas: number | null;
          faltas: number | null;
          percentual: number | null;
        };
        Relationships: [];
      };

      v_frequencia_mensal: {
        Row: {
          student_id: string | null;
          mes: string | null;
          presencas: number | null;
          faltas: number | null;
        };
        Relationships: [];
      };

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
          cor: string | null;
          teacher_id: string | null;
          professor: string | null;
          professor_chamado: string | null;
          matriculados: number | null;
        };
        Relationships: [];
      };

      v_mensalidades: {
        Row: {
          id: string | null;
          student_id: string | null;
          aluno: string | null;
          full_name: string | null;
          phone: string | null;
          cpf: string | null;
          class_id: string | null;
          turma: string | null;
          reference_month: string | null;
          proportion: number | null;
          amount: number | null;
          status: Database["public"]["Enums"]["payment_status"] | null;
          due_date: string | null;
          paid_at: string | null;
          reminded_at: string | null;
          method: Database["public"]["Enums"]["payment_method"] | null;
          notes: string | null;
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
          subscription_status: Database["public"]["Enums"]["subscription_status"] | null;
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
      abrir_chamada: {
        Args: { turma: string; dia: string };
        Returns: string;
      };
      consumir_convite: {
        Args: { token_convite: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      criar_aula_extra: {
        Args: { turma: string; dia: string; hora: string; duracao?: number; observacao?: string };
        Returns: string;
      };
      expire_subscriptions: {
        Args: Record<string, never>;
        Returns: number;
      };
      fracao_do_mes: {
        Args: { entrada: string };
        Returns: number;
      };
      generate_sessions: {
        Args: { range_start: string; range_end: string };
        Returns: number;
      };
      gerar_mensalidades: {
        Args: { mes?: string };
        Returns: number;
      };
      has_role: {
        Args: { check_role: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_student: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_teacher: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      reativar_aula: {
        Args: { aula: string };
        Returns: string;
      };
      suspender_aula: {
        Args: { aula: string; motivo?: string };
        Returns: string;
      };
      teaches_student: {
        Args: { target_student: string };
        Returns: boolean;
      };
      vencimento_da_mensalidade: {
        Args: { mes: string; entrada: string };
        Returns: string;
      };
    };
    Enums: {
      app_role: "admin" | "teacher" | "student";
      booking_status: "booked" | "waitlisted" | "attended" | "no_show" | "canceled";
      class_level: "todos" | "iniciante" | "intermediario" | "avancado";
      payment_method: "pix" | "credit_card" | "debit_card" | "cash" | "bank_transfer" | "other";
      payment_status: "pending" | "paid" | "overdue" | "refunded" | "canceled";
      plan_period: "single" | "pack" | "monthly" | "quarterly" | "semiannual" | "annual";
      session_status: "scheduled" | "completed" | "canceled";
      subscription_status: "pending" | "active" | "paused" | "expired" | "canceled";
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
