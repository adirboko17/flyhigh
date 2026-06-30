export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          child_id: string
          class_id: string
          created_at: string
          date: string
          id: string
          instructor_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          child_id: string
          class_id: string
          created_at?: string
          date?: string
          id?: string
          instructor_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          child_id?: string
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          instructor_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_date: string | null
          created_at: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          notes: string | null
          parent_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          notes?: string | null
          parent_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          notes?: string | null
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          session_date: string
          start_time: string
          status: Database["public"]["Enums"]["class_session_status"]
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          session_date: string
          start_time: string
          status?: Database["public"]["Enums"]["class_session_status"]
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          session_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["class_session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_weekly_slots: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_weekly_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          age_max: number | null
          age_min: number | null
          capacity: number
          category: string | null
          created_at: string
          day_of_week: number | null
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          image_url: string | null
          instructor_id: string | null
          level: string | null
          price: number
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["class_status"]
          title: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          capacity?: number
          category?: string | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          level?: string | null
          price?: number
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["class_status"]
          title: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          capacity?: number
          category?: string | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          level?: string | null
          price?: number
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["class_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          child_id: string | null
          class_id: string | null
          created_at: string
          id: string
          parent_id: string
          payment_status: Database["public"]["Enums"]["enrollment_payment_status"]
          pool_pass_id: string | null
          program_id: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          type: Database["public"]["Enums"]["enrollment_type"]
        }
        Insert: {
          child_id?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          parent_id: string
          payment_status?: Database["public"]["Enums"]["enrollment_payment_status"]
          pool_pass_id?: string | null
          program_id?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          type: Database["public"]["Enums"]["enrollment_type"]
        }
        Update: {
          child_id?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          parent_id?: string
          payment_status?: Database["public"]["Enums"]["enrollment_payment_status"]
          pool_pass_id?: string | null
          program_id?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          type?: Database["public"]["Enums"]["enrollment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_pool_pass_id_fkey"
            columns: ["pool_pass_id"]
            isOneToOne: false
            referencedRelation: "pool_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          created_at: string
          full_name: string
          hourly_rate: number | null
          id: string
          phone: string | null
          profile_id: string | null
          status: Database["public"]["Enums"]["instructor_status"]
        }
        Insert: {
          created_at?: string
          full_name: string
          hourly_rate?: number | null
          id?: string
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["instructor_status"]
        }
        Update: {
          created_at?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["instructor_status"]
        }
        Relationships: [
          {
            foreignKeyName: "instructors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          enrollment_id: string | null
          external_reference: string | null
          id: string
          paid_at: string | null
          parent_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount?: number
          created_at?: string
          enrollment_id?: string | null
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          parent_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          enrollment_id?: string | null
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          parent_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_passes: {
        Row: {
          created_at: string
          description: string | null
          entries_count: number
          id: string
          price: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entries_count?: number
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entries_count?: number
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      programs: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          id: string
          price: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          payment_id: string | null
          receipt_number: string | null
          receipt_url: string | null
          sent_to_email: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          payment_id?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          sent_to_email?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          payment_id?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          sent_to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          child_id: string | null
          class_id: string
          created_at: string
          id: string
          parent_id: string
          status: Database["public"]["Enums"]["waitlist_status"]
        }
        Insert: {
          child_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          parent_id: string
          status?: Database["public"]["Enums"]["waitlist_status"]
        }
        Update: {
          child_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          status?: Database["public"]["Enums"]["waitlist_status"]
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_parent_id_fkey"
            columns: ["parent_id"]
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
      current_instructor_id: { Args: Record<PropertyKey, never>; Returns: string }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      instructor_owns_class: { Args: { cid: string }; Returns: boolean }
      instructor_teaches_child: { Args: { cid: string }; Returns: boolean }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_my_child: { Args: { cid: string }; Returns: boolean }
      list_active_instructors: {
        Args: Record<PropertyKey, never>
        Returns: {
          full_name: string
          id: string
        }[]
      }
      list_public_classes: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          title: string
          description: string | null
          category: string | null
          level: string | null
          age_min: number | null
          age_max: number | null
          capacity: number
          price: number
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          start_date: string | null
          end_date: string | null
          day_of_week: number | null
          start_time: string | null
          end_time: string | null
          status: Database["public"]["Enums"]["class_status"]
          image_url: string | null
          instructor_name: string | null
          taken_count: number
          available: number
          schedule_days: string | null
          session_count: number
        }[]
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late"
      class_session_status: "scheduled" | "cancelled" | "completed"
      class_status: "active" | "inactive" | "full"
      enrollment_payment_status: "unpaid" | "partial" | "paid" | "refunded"
      enrollment_status: "pending" | "active" | "cancelled" | "completed"
      enrollment_type: "class" | "program" | "pool_pass"
      gender_type: "male" | "female" | "other"
      instructor_status: "active" | "inactive"
      listing_status: "draft" | "active" | "inactive"
      payment_method:
        | "credit_card"
        | "bit"
        | "paybox"
        | "standing_order"
        | "cash"
        | "external"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      schedule_type: "weekly" | "custom"
      user_role: "admin" | "instructor" | "parent"
      waitlist_status:
        | "waiting"
        | "offered"
        | "expired"
        | "joined"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]
