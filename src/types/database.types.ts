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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_bookings: {
        Row: {
          child_id: string | null
          created_at: string
          end_time: string | null
          enrollment_id: string
          id: string
          notes: string | null
          parent_id: string
          people_count: number
          program_id: string
          session_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["private_lesson_slot_status"]
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          end_time?: string | null
          enrollment_id: string
          id?: string
          notes?: string | null
          parent_id: string
          people_count: number
          program_id: string
          session_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["private_lesson_slot_status"]
        }
        Update: {
          child_id?: string | null
          created_at?: string
          end_time?: string | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          parent_id?: string
          people_count?: number
          program_id?: string
          session_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["private_lesson_slot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "activity_bookings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_bookings_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_bookings_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_bookings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          child_id: string
          class_id: string
          created_at: string
          date: string
          id: string
          instructor_id: string | null
          notes: string | null
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
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
      business_documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          grade_school_year: number | null
          id: string
          notes: string | null
          parent_id: string
          school_grade: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade_school_year?: number | null
          id?: string
          notes?: string | null
          parent_id: string
          school_grade?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grade_school_year?: number | null
          id?: string
          notes?: string | null
          parent_id?: string
          school_grade?: number | null
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
      class_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      class_session_notes: {
        Row: {
          body: string
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          session_id: string
        }
        Insert: {
          body: string
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          session_id: string
        }
        Update: {
          body?: string
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_session_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
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
          substitute_instructor_id: string | null
          weekly_slot_id: string | null
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
          substitute_instructor_id?: string | null
          weekly_slot_id?: string | null
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
          substitute_instructor_id?: string | null
          weekly_slot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_substitute_instructor_id_fkey"
            columns: ["substitute_instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
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
          gender_policy: Database["public"]["Enums"]["class_gender_policy"]
          id: string
          instructor_id: string | null
          note: string | null
          start_time: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          gender_policy?: Database["public"]["Enums"]["class_gender_policy"]
          id?: string
          instructor_id?: string | null
          note?: string | null
          start_time: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          gender_policy?: Database["public"]["Enums"]["class_gender_policy"]
          id?: string
          instructor_id?: string | null
          note?: string | null
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
          {
            foreignKeyName: "class_weekly_slots_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          /** גיל מקסימום בחודשים. */
          age_max: number | null
          /** גיל מינימום בחודשים. */
          age_min: number | null
          audience_type: Database["public"]["Enums"]["class_audience_type"]
          billing_months: number | null
          booking_mode: Database["public"]["Enums"]["class_booking_mode"]
          capacity: number | null
          category: string | null
          created_at: string
          day_of_week: number | null
          description: string | null
          end_date: string | null
          end_time: string | null
          gender_policy: Database["public"]["Enums"]["class_gender_policy"]
          grade_max: number | null
          grade_min: number | null
          id: string
          image_url: string | null
          instructor_id: string | null
          interest_only: boolean
          level: string | null
          pick_one_slot: boolean
          planned_session_count: number | null
          price: number
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          sibling_discount_tiers: Json | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["class_status"]
          title: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          audience_type?: Database["public"]["Enums"]["class_audience_type"]
          billing_months?: number | null
          booking_mode?: Database["public"]["Enums"]["class_booking_mode"]
          capacity?: number | null
          category?: string | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          gender_policy?: Database["public"]["Enums"]["class_gender_policy"]
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          interest_only?: boolean
          level?: string | null
          pick_one_slot?: boolean
          planned_session_count?: number | null
          price?: number
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          sibling_discount_tiers?: Json | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["class_status"]
          title: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          audience_type?: Database["public"]["Enums"]["class_audience_type"]
          billing_months?: number | null
          booking_mode?: Database["public"]["Enums"]["class_booking_mode"]
          capacity?: number | null
          category?: string | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          gender_policy?: Database["public"]["Enums"]["class_gender_policy"]
          grade_max?: number | null
          grade_min?: number | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          interest_only?: boolean
          level?: string | null
          pick_one_slot?: boolean
          planned_session_count?: number | null
          price?: number
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          sibling_discount_tiers?: Json | null
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
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_amount: number
          enrollment_id: string | null
          id: string
          parent_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_amount: number
          enrollment_id?: string | null
          id?: string
          parent_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          enrollment_id?: string | null
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          class_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          ends_on: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          parent_id: string | null
          pool_pass_id: string | null
          private_lesson_id: string | null
          program_id: string | null
          starts_on: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          class_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          parent_id?: string | null
          pool_pass_id?: string | null
          private_lesson_id?: string | null
          program_id?: string | null
          starts_on?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          class_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value?: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          parent_id?: string | null
          pool_pass_id?: string | null
          private_lesson_id?: string | null
          program_id?: string | null
          starts_on?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_pool_pass_id_fkey"
            columns: ["pool_pass_id"]
            isOneToOne: false
            referencedRelation: "pool_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_private_lesson_id_fkey"
            columns: ["private_lesson_id"]
            isOneToOne: false
            referencedRelation: "private_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_admin_notes: {
        Row: {
          body: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_admin_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          admin_assigned: boolean
          child_id: string | null
          class_id: string | null
          created_at: string
          discount_percent: number
          ends_on: string | null
          id: string
          parent_id: string
          payment_status: Database["public"]["Enums"]["enrollment_payment_status"]
          people_count: number | null
          pool_pass_id: string | null
          private_lesson_id: string | null
          program_id: string | null
          session_id: string | null
          starts_on: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          type: Database["public"]["Enums"]["enrollment_type"]
          weekly_slot_id: string | null
        }
        Insert: {
          admin_assigned?: boolean
          child_id?: string | null
          class_id?: string | null
          weekly_slot_id?: string | null
          created_at?: string
          discount_percent?: number
          ends_on?: string | null
          id?: string
          parent_id: string
          people_count?: number | null
          payment_status?: Database["public"]["Enums"]["enrollment_payment_status"]
          pool_pass_id?: string | null
          private_lesson_id?: string | null
          program_id?: string | null
          session_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          type: Database["public"]["Enums"]["enrollment_type"]
        }
        Update: {
          admin_assigned?: boolean
          child_id?: string | null
          class_id?: string | null
          created_at?: string
          discount_percent?: number
          ends_on?: string | null
          id?: string
          parent_id?: string
          payment_status?: Database["public"]["Enums"]["enrollment_payment_status"]
          people_count?: number | null
          pool_pass_id?: string | null
          private_lesson_id?: string | null
          program_id?: string | null
          session_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          type?: Database["public"]["Enums"]["enrollment_type"]
          weekly_slot_id?: string | null
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
            foreignKeyName: "enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
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
            foreignKeyName: "enrollments_private_lesson_id_fkey"
            columns: ["private_lesson_id"]
            isOneToOne: false
            referencedRelation: "private_lessons"
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
      health_declarations: {
        Row: {
          accepted: boolean
          child_id: string
          child_name: string
          created_at: string
          id: string
          id_number: string
          parent_id: string
          school_year: number
          signed_at: string
        }
        Insert: {
          accepted?: boolean
          child_id: string
          child_name: string
          created_at?: string
          id?: string
          id_number: string
          parent_id: string
          school_year: number
          signed_at?: string
        }
        Update: {
          accepted?: boolean
          child_id?: string
          child_name?: string
          created_at?: string
          id?: string
          id_number?: string
          parent_id?: string
          school_year?: number
          signed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_declarations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_declarations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          instructor_id: string
          mime_type: string | null
          notes: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          instructor_id: string
          mime_type?: string | null
          notes?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          instructor_id?: string
          mime_type?: string | null
          notes?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_documents_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          created_at: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          hourly_rate: number | null
          id: string
          monthly_salary: number | null
          pay_type: Database["public"]["Enums"]["instructor_pay_type"]
          phone: string | null
          profile_id: string | null
          status: Database["public"]["Enums"]["instructor_status"]
        }
        Insert: {
          created_at?: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          pay_type?: Database["public"]["Enums"]["instructor_pay_type"]
          phone?: string | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["instructor_status"]
        }
        Update: {
          created_at?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hourly_rate?: number | null
          id?: string
          monthly_salary?: number | null
          pay_type?: Database["public"]["Enums"]["instructor_pay_type"]
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
      payment_checkouts: {
        Row: {
          amount: number
          completed_at: string | null
          coupon_redemption_id: string | null
          created_at: string
          description: string
          document_number: string | null
          id: string
          low_profile_id: string | null
          parent_id: string
          payment_url: string | null
          raw_result: Json | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          coupon_redemption_id?: string | null
          created_at?: string
          description: string
          document_number?: string | null
          id?: string
          low_profile_id?: string | null
          parent_id: string
          payment_url?: string | null
          raw_result?: Json | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          coupon_redemption_id?: string | null
          created_at?: string
          description?: string
          document_number?: string | null
          id?: string
          low_profile_id?: string | null
          parent_id?: string
          payment_url?: string | null
          raw_result?: Json | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_checkouts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          payment_id: string
          received_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          payment_id: string
          received_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          payment_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          document_number: string | null
          document_url: string | null
          external_reference: string | null
          id: string
          note: string | null
          parent_id: string
          payment_id: string
          sent_to_email: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_url?: string | null
          external_reference?: string | null
          id?: string
          note?: string | null
          parent_id: string
          payment_id: string
          sent_to_email?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_url?: string | null
          external_reference?: string | null
          id?: string
          note?: string | null
          parent_id?: string
          payment_id?: string
          sent_to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_id: string | null
          created_at: string
          enrollment_id: string | null
          external_reference: string | null
          id: string
          paid_at: string | null
          parent_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_custom_text: string | null
          receipt_description: string | null
          receipt_label_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount?: number
          checkout_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          parent_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_custom_text?: string | null
          receipt_description?: string | null
          receipt_label_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          checkout_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          parent_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_custom_text?: string | null
          receipt_description?: string | null
          receipt_label_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "payment_checkouts"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "payments_receipt_label_id_fkey"
            columns: ["receipt_label_id"]
            isOneToOne: false
            referencedRelation: "receipt_labels"
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
      private_lesson_slots: {
        Row: {
          child_id: string | null
          created_at: string
          end_time: string | null
          enrollment_id: string
          id: string
          notes: string | null
          parent_id: string
          private_lesson_id: string
          session_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["private_lesson_slot_status"]
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          end_time?: string | null
          enrollment_id: string
          id?: string
          notes?: string | null
          parent_id: string
          private_lesson_id: string
          session_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["private_lesson_slot_status"]
        }
        Update: {
          child_id?: string | null
          created_at?: string
          end_time?: string | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          parent_id?: string
          private_lesson_id?: string
          session_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["private_lesson_slot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "private_lesson_slots_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_lesson_slots_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_lesson_slots_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_lesson_slots_private_lesson_id_fkey"
            columns: ["private_lesson_id"]
            isOneToOne: false
            referencedRelation: "private_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      private_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          price: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_primary_admin: boolean
          phone: string | null
          receipt_id_number: string | null
          receipt_name: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_primary_admin?: boolean
          phone?: string | null
          receipt_id_number?: string | null
          receipt_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_primary_admin?: boolean
          phone?: string | null
          receipt_id_number?: string | null
          receipt_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      programs: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          duration_minutes: number | null
          duration_months: number
          extra_half_hour_price: number | null
          id: string
          kind: Database["public"]["Enums"]["program_kind"]
          price: number
          price_tiers: Json
          status: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          duration_months?: number
          extra_half_hour_price?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["program_kind"]
          price?: number
          price_tiers?: Json
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          duration_months?: number
          extra_half_hour_price?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["program_kind"]
          price?: number
          price_tiers?: Json
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
        }
        Relationships: []
      }
      receipt_labels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
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
      recurring_incomes: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: string
          source: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          month: string
          source?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: string
          source?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_incomes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          weekly_slot_id: string | null
        }
        Insert: {
          child_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          parent_id: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          weekly_slot_id?: string | null
        }
        Update: {
          child_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          weekly_slot_id?: string | null
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
      claim_coupon:
        | {
            Args: {
              p_amount?: number
              p_class_id?: string
              p_code: string
              p_pool_pass_id?: string
              p_program_id?: string
            }
            Returns: {
              code: string
              coupon_id: string
              discount_amount: number
              error: string
              redemption_id: string
            }[]
          }
        | {
            Args: {
              p_amount?: number
              p_class_id?: string
              p_code: string
              p_pool_pass_id?: string
              p_private_lesson_id?: string
              p_program_id?: string
            }
            Returns: {
              code: string
              coupon_id: string
              discount_amount: number
              error: string
              redemption_id: string
            }[]
          }
      class_sibling_discount_tiers: {
        Args: { p_class_id: string }
        Returns: Json
      }
      coupon_discount_amount: {
        Args: {
          p_amount: number
          p_type: Database["public"]["Enums"]["coupon_discount_type"]
          p_value: number
        }
        Returns: number
      }
      current_instructor_id: { Args: never; Returns: string }
      current_school_year: { Args: { on_date?: string }; Returns: number }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      declaration_school_year: { Args: { on_date?: string }; Returns: number }
      effective_school_grade: {
        Args: { as_of_school_year: number; grade: number; on_date?: string }
        Returns: number
      }
      evaluate_coupon:
        | {
            Args: {
              p_amount?: number
              p_class_id?: string
              p_code: string
              p_parent: string
              p_pool_pass_id?: string
              p_program_id?: string
            }
            Returns: {
              code: string
              coupon_id: string
              discount_amount: number
              discount_type: Database["public"]["Enums"]["coupon_discount_type"]
              discount_value: number
              error: string
            }[]
          }
        | {
            Args: {
              p_amount?: number
              p_class_id?: string
              p_code: string
              p_parent: string
              p_pool_pass_id?: string
              p_private_lesson_id?: string
              p_program_id?: string
            }
            Returns: {
              code: string
              coupon_id: string
              discount_amount: number
              discount_type: Database["public"]["Enums"]["coupon_discount_type"]
              discount_value: number
              error: string
            }[]
          }
      instructor_owns_class: { Args: { cid: string }; Returns: boolean }
      instructor_substitutes_class: { Args: { cid: string }; Returns: boolean }
      instructor_teaches_child: { Args: { cid: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_my_child: { Args: { cid: string }; Returns: boolean }
      link_coupon_redemption: {
        Args: { p_enrollment_id: string; p_redemption_id: string }
        Returns: undefined
      }
      list_active_instructors: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      list_public_class_instructor_genders: {
        Args: never
        Returns: {
          class_id: string
          gender: Database["public"]["Enums"]["gender_type"] | null
        }[]
      }
      list_public_class_sessions: {
        Args: { p_class_id: string }
        Returns: {
          end_time: string
          id: string
          notes: string
          session_date: string
          start_time: string
          status: Database["public"]["Enums"]["class_session_status"]
          substitute_instructor_name: string
          weekly_slot_id: string | null
          taken_count: number
          available: number
        }[]
      }
      list_public_class_slots: {
        Args: { p_class_id: string }
        Returns: {
          available: number
          capacity: number | null
          day_of_week: number
          end_time: string
          gender_policy: Database["public"]["Enums"]["class_gender_policy"]
          id: string
          note: string | null
          start_time: string
          taken_count: number
        }[]
      }
      list_public_classes: {
        Args: never
        Returns: {
          age_max: number
          age_min: number
          audience_type: Database["public"]["Enums"]["class_audience_type"]
          available: number
          billable_session_count: number
          billing_months: number | null
          capacity: number | null
          category: string
          day_of_week: number
          description: string
          end_date: string
          end_time: string
          gender_policy: Database["public"]["Enums"]["class_gender_policy"]
          grade_max: number
          grade_min: number
          id: string
          image_url: string
          instructor_name: string
          level: string
          pick_one_slot: boolean
          price: number
          remaining_session_count: number
          schedule_days: string
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          session_count: number
          start_date: string
          start_time: string
          status: Database["public"]["Enums"]["class_status"]
          taken_count: number
          title: string
          interest_only: boolean
          booking_mode: Database["public"]["Enums"]["class_booking_mode"]
        }[]
      }
      list_public_weekly_slots: {
        Args: never
        Returns: {
          class_id: string
          day_of_week: number
          end_time: string
          gender_policy: Database["public"]["Enums"]["class_gender_policy"]
          note: string | null
          start_time: string
        }[]
      }
      preview_coupon:
        | {
            Args: {
              p_amount?: number
              p_class_id?: string
              p_code: string
              p_pool_pass_id?: string
              p_program_id?: string
            }
            Returns: {
              code: string
              coupon_id: string
              discount_amount: number
              discount_type: Database["public"]["Enums"]["coupon_discount_type"]
              discount_value: number
              error: string
            }[]
          }
        | {
            Args: {
              p_amount?: number
              p_class_id?: string
              p_code: string
              p_pool_pass_id?: string
              p_private_lesson_id?: string
              p_program_id?: string
            }
            Returns: {
              code: string
              coupon_id: string
              discount_amount: number
              discount_type: Database["public"]["Enums"]["coupon_discount_type"]
              discount_value: number
              error: string
            }[]
          }
      release_coupon: { Args: { p_redemption_id: string }; Returns: undefined }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late"
      class_booking_mode: "series" | "appointment"
      class_audience_type: "age" | "grade" | "open"
      class_gender_policy: "male" | "female" | "mixed"
      class_session_status: "scheduled" | "cancelled" | "completed"
      class_status: "active" | "inactive" | "full"
      coupon_discount_type: "percent" | "fixed"
      enrollment_payment_status: "unpaid" | "partial" | "paid" | "refunded" | "not_required"
      enrollment_status: "pending" | "active" | "cancelled" | "completed"
      enrollment_type: "class" | "program" | "pool_pass" | "private_lesson"
      gender_type: "male" | "female" | "other"
      instructor_pay_type: "hourly" | "monthly"
      instructor_status: "active" | "inactive"
      listing_status: "draft" | "active" | "inactive"
      payment_method:
        | "credit_card"
        | "bit"
        | "paybox"
        | "standing_order"
        | "cash"
        | "external"
        | "bank_transfer"
        | "maccabi"
        | "amit"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "partial"
      private_lesson_slot_status:
        | "awaiting_schedule"
        | "scheduled"
        | "cancelled"
        | "completed"
      program_kind: "membership" | "activity"
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
      attendance_status: ["present", "absent", "late"],
      class_booking_mode: ["series", "appointment"],
      class_audience_type: ["age", "grade", "open"],
      class_gender_policy: ["male", "female", "mixed"],
      class_session_status: ["scheduled", "cancelled", "completed"],
      class_status: ["active", "inactive", "full"],
      coupon_discount_type: ["percent", "fixed"],
      enrollment_payment_status: ["unpaid", "partial", "paid", "refunded", "not_required"],
      enrollment_status: ["pending", "active", "cancelled", "completed"],
      enrollment_type: ["class", "program", "pool_pass", "private_lesson"],
      gender_type: ["male", "female", "other"],
      instructor_pay_type: ["hourly", "monthly"],
      instructor_status: ["active", "inactive"],
      listing_status: ["draft", "active", "inactive"],
      payment_method: [
        "credit_card",
        "bit",
        "paybox",
        "standing_order",
        "cash",
        "external",
        "bank_transfer",
        "maccabi",
        "amit",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "partial"],
      private_lesson_slot_status: [
        "awaiting_schedule",
        "scheduled",
        "cancelled",
        "completed",
      ],
      program_kind: ["membership", "activity"],
      schedule_type: ["weekly", "custom"],
      user_role: ["admin", "instructor", "parent"],
      waitlist_status: ["waiting", "offered", "expired", "joined", "cancelled"],
    },
  },
} as const
