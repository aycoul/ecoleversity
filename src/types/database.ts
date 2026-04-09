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
      ai_teacher_twins: {
        Row: {
          created_at: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          is_active: boolean
          last_trained_at: string | null
          maturity_level: Database["public"]["Enums"]["ai_twin_maturity"]
          price_xof: number
          rating_avg: number
          rating_count: number
          subject: string
          system_prompt: string | null
          teacher_id: string
          teaching_style_profile: Json
          total_recordings_processed: number
          total_sessions_served: number
        }
        Insert: {
          created_at?: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_active?: boolean
          last_trained_at?: string | null
          maturity_level?: Database["public"]["Enums"]["ai_twin_maturity"]
          price_xof?: number
          rating_avg?: number
          rating_count?: number
          subject: string
          system_prompt?: string | null
          teacher_id: string
          teaching_style_profile?: Json
          total_recordings_processed?: number
          total_sessions_served?: number
        }
        Update: {
          created_at?: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          is_active?: boolean
          last_trained_at?: string | null
          maturity_level?: Database["public"]["Enums"]["ai_twin_maturity"]
          price_xof?: number
          rating_avg?: number
          rating_count?: number
          subject?: string
          system_prompt?: string | null
          teacher_id?: string
          teaching_style_profile?: Json
          total_recordings_processed?: number
          total_sessions_served?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_teacher_twins_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_content: {
        Row: {
          created_at: string
          embedding_ids: string[]
          extracted_topics: Json
          id: string
          processing_status: Database["public"]["Enums"]["ai_processing_status"]
          source_id: string | null
          source_type: string
          transcription: string | null
          twin_id: string
        }
        Insert: {
          created_at?: string
          embedding_ids?: string[]
          extracted_topics?: Json
          id?: string
          processing_status?: Database["public"]["Enums"]["ai_processing_status"]
          source_id?: string | null
          source_type: string
          transcription?: string | null
          twin_id: string
        }
        Update: {
          created_at?: string
          embedding_ids?: string[]
          extracted_topics?: Json
          id?: string
          processing_status?: Database["public"]["Enums"]["ai_processing_status"]
          source_id?: string | null
          source_type?: string
          transcription?: string | null
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_content_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "ai_teacher_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_twin_sessions: {
        Row: {
          conversation: Json
          created_at: string
          duration_seconds: number
          escalated_to_human: boolean
          exercises_attempted: number
          exercises_correct: number
          id: string
          learner_id: string
          mastery_score: number
          tokens_used: number
          topic: string
          twin_id: string
        }
        Insert: {
          conversation?: Json
          created_at?: string
          duration_seconds?: number
          escalated_to_human?: boolean
          exercises_attempted?: number
          exercises_correct?: number
          id?: string
          learner_id: string
          mastery_score?: number
          tokens_used?: number
          topic: string
          twin_id: string
        }
        Update: {
          conversation?: Json
          created_at?: string
          duration_seconds?: number
          escalated_to_human?: boolean
          exercises_attempted?: number
          exercises_correct?: number
          id?: string
          learner_id?: string
          mastery_score?: number
          tokens_used?: number
          topic?: string
          twin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_twin_sessions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_twin_sessions_twin_id_fkey"
            columns: ["twin_id"]
            isOneToOne: false
            referencedRelation: "ai_teacher_twins"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attachments: Json
          content: string
          grade: string | null
          grade_score: number | null
          graded_at: string | null
          id: string
          learner_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          attachments?: Json
          content: string
          grade?: string | null
          grade_score?: number | null
          graded_at?: string | null
          id?: string
          learner_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          attachments?: Json
          content?: string
          grade?: string | null
          grade_score?: number | null
          graded_at?: string | null
          id?: string
          learner_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachments: Json
          course_id: string | null
          created_at: string
          due_at: string | null
          id: string
          instructions: string
          live_class_id: string | null
          teacher_id: string
          title: string
        }
        Insert: {
          attachments?: Json
          course_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          instructions: string
          live_class_id?: string | null
          teacher_id: string
          title: string
        }
        Update: {
          attachments?: Json
          course_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string
          live_class_id?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["report_category"]
          created_at: string
          description: string | null
          id: string
          reported_id: string
          reported_type: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          admin_notes?: string | null
          category: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string | null
          id?: string
          reported_id: string
          reported_type: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string | null
          id?: string
          reported_id?: string
          reported_type?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          enrollment_count: number
          exam_type: Database["public"]["Enums"]["target_exam"] | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          language: string
          price_xof: number
          rating_avg: number
          rating_count: number
          status: Database["public"]["Enums"]["course_status"]
          subject: string
          teacher_id: string
          thumbnail_url: string | null
          title: string
          total_duration_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enrollment_count?: number
          exam_type?: Database["public"]["Enums"]["target_exam"] | null
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          language?: string
          price_xof: number
          rating_avg?: number
          rating_count?: number
          status?: Database["public"]["Enums"]["course_status"]
          subject: string
          teacher_id: string
          thumbnail_url?: string | null
          title: string
          total_duration_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enrollment_count?: number
          exam_type?: Database["public"]["Enums"]["target_exam"] | null
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          language?: string
          price_xof?: number
          rating_avg?: number
          rating_count?: number
          status?: Database["public"]["Enums"]["course_status"]
          subject?: string
          teacher_id?: string
          thumbnail_url?: string | null
          title?: string
          total_duration_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string | null
          enrolled_at: string
          id: string
          learner_id: string
          live_class_id: string | null
          progress_pct: number
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string
          id?: string
          learner_id: string
          live_class_id?: string | null
          progress_pct?: number
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string | null
          enrolled_at?: string
          id?: string
          learner_id?: string
          live_class_id?: string | null
          progress_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          content_en: string | null
          content_fr: string
          id: string
          published: boolean
          search_vector: unknown
          slug: string
          sort_order: number
          title_en: string | null
          title_fr: string
          updated_at: string
        }
        Insert: {
          category: string
          content_en?: string | null
          content_fr: string
          id?: string
          published?: boolean
          search_vector?: unknown
          slug: string
          sort_order?: number
          title_en?: string | null
          title_fr: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_en?: string | null
          content_fr?: string
          id?: string
          published?: boolean
          search_vector?: unknown
          slug?: string
          sort_order?: number
          title_en?: string | null
          title_fr?: string
          updated_at?: string
        }
        Relationships: []
      }
      learner_profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          first_name: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          parent_id: string
          target_exam: Database["public"]["Enums"]["target_exam"] | null
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          first_name: string
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          parent_id: string
          target_exam?: Database["public"]["Enums"]["target_exam"] | null
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          first_name?: string
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          parent_id?: string
          target_exam?: Database["public"]["Enums"]["target_exam"] | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          enrollment_id: string
          id: string
          lesson_id: string
          updated_at: string
          watch_position_seconds: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          enrollment_id: string
          id?: string
          lesson_id: string
          updated_at?: string
          watch_position_seconds?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          watch_position_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_preview: boolean
          pdf_attachment_url: string | null
          sort_order: number
          title: string
          video_duration_seconds: number
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_preview?: boolean
          pdf_attachment_url?: string | null
          sort_order?: number
          title: string
          video_duration_seconds?: number
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_preview?: boolean
          pdf_attachment_url?: string | null
          sort_order?: number
          title?: string
          video_duration_seconds?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          format: Database["public"]["Enums"]["class_format"]
          grade_level: Database["public"]["Enums"]["grade_level"]
          id: string
          jitsi_room_id: string | null
          max_students: number
          price_xof: number
          rating_avg: number
          rating_count: number
          recording_url: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          scheduled_at: string
          status: Database["public"]["Enums"]["class_status"]
          subject: string
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          format?: Database["public"]["Enums"]["class_format"]
          grade_level: Database["public"]["Enums"]["grade_level"]
          id?: string
          jitsi_room_id?: string | null
          max_students?: number
          price_xof: number
          rating_avg?: number
          rating_count?: number
          recording_url?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          scheduled_at: string
          status?: Database["public"]["Enums"]["class_status"]
          subject: string
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          format?: Database["public"]["Enums"]["class_format"]
          grade_level?: Database["public"]["Enums"]["grade_level"]
          id?: string
          jitsi_room_id?: string | null
          max_students?: number
          price_xof?: number
          rating_avg?: number
          rating_count?: number
          recording_url?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          scheduled_at?: string
          status?: Database["public"]["Enums"]["class_status"]
          subject?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          content: string
          content_flagged: boolean
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          content_flagged?: boolean
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          content_flagged?: boolean
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          preferred_channel: string
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          preferred_channel?: string
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          preferred_channel?: string
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_wallet: {
        Row: {
          balance_xof: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_xof?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_xof?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_wallet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string
          created_at: string
          display_name: string
          id: string
          language_preference: string
          phone: string | null
          phone_verified: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string
          created_at?: string
          display_name: string
          id: string
          language_preference?: string
          phone?: string | null
          phone_verified?: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string
          created_at?: string
          display_name?: string
          id?: string
          language_preference?: string
          phone?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          credit_amount_xof: number
          id: string
          referred_id: string
          referrer_id: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          credit_amount_xof?: number
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          credit_amount_xof?: number
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string | null
          created_at: string
          id: string
          live_class_id: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          rating: number
          reviewer_id: string
          teacher_id: string
        }
        Insert: {
          comment?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          live_class_id?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          rating: number
          reviewer_id: string
          teacher_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          live_class_id?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          rating?: number
          reviewer_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          admin_user_id: string
          city: string | null
          country: string
          created_at: string
          id: string
          name: string
          revenue_split: number
          type: Database["public"]["Enums"]["school_type"]
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          admin_user_id: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          name: string
          revenue_split?: number
          type: Database["public"]["Enums"]["school_type"]
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          admin_user_id?: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          name?: string
          revenue_split?: number
          type?: Database["public"]["Enums"]["school_type"]
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "schools_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          conversation: Json
          created_at: string
          escalated_from_ama: boolean
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ticket_category"]
          conversation?: Json
          created_at?: string
          escalated_from_ama?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          conversation?: Json
          created_at?: string
          escalated_from_ama?: boolean
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_coupons: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          discount_pct: number
          expires_at: string
          id: string
          max_uses: number
          teacher_id: string
          uses_count: number
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          discount_pct: number
          expires_at: string
          id?: string
          max_uses?: number
          teacher_id: string
          uses_count?: number
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          discount_pct?: number
          expires_at?: string
          id?: string
          max_uses?: number
          teacher_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_coupons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_followers: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_followers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_followers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_payouts: {
        Row: {
          amount_xof: number
          created_at: string
          id: string
          payout_phone: string
          period_end: string
          period_start: string
          processed_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          status: Database["public"]["Enums"]["payout_status"]
          teacher_id: string
        }
        Insert: {
          amount_xof: number
          created_at?: string
          id?: string
          payout_phone: string
          period_end: string
          period_start: string
          processed_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["payout_status"]
          teacher_id: string
        }
        Update: {
          amount_xof?: number
          created_at?: string
          id?: string
          payout_phone?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          status?: Database["public"]["Enums"]["payout_status"]
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_payouts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          away_message: string | null
          away_until: string | null
          commission_rate: number
          created_at: string
          diploma_url: string | null
          follower_count: number
          grade_levels: Database["public"]["Enums"]["grade_level"][]
          id: string
          id_document_url: string | null
          is_away: boolean
          payout_phone: string | null
          payout_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          rating_avg: number
          rating_count: number
          school_id: string | null
          subjects: string[]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          video_intro_url: string | null
        }
        Insert: {
          away_message?: string | null
          away_until?: string | null
          commission_rate?: number
          created_at?: string
          diploma_url?: string | null
          follower_count?: number
          grade_levels?: Database["public"]["Enums"]["grade_level"][]
          id: string
          id_document_url?: string | null
          is_away?: boolean
          payout_phone?: string | null
          payout_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          rating_avg?: number
          rating_count?: number
          school_id?: string | null
          subjects?: string[]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          video_intro_url?: string | null
        }
        Update: {
          away_message?: string | null
          away_until?: string | null
          commission_rate?: number
          created_at?: string
          diploma_url?: string | null
          follower_count?: number
          grade_levels?: Database["public"]["Enums"]["grade_level"][]
          id?: string
          id_document_url?: string | null
          is_away?: boolean
          payout_phone?: string | null
          payout_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          rating_avg?: number
          rating_count?: number
          school_id?: string | null
          subjects?: string[]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          video_intro_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_strikes: {
        Row: {
          created_at: string
          evidence: Json
          expires_at: string | null
          id: string
          issued_by: string
          reason: string
          status: string
          strike_level: Database["public"]["Enums"]["strike_level"]
          teacher_id: string
        }
        Insert: {
          created_at?: string
          evidence?: Json
          expires_at?: string | null
          id?: string
          issued_by: string
          reason: string
          status?: string
          strike_level: Database["public"]["Enums"]["strike_level"]
          teacher_id: string
        }
        Update: {
          created_at?: string
          evidence?: Json
          expires_at?: string | null
          id?: string
          issued_by?: string
          reason?: string
          status?: string
          strike_level?: Database["public"]["Enums"]["strike_level"]
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_strikes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_strikes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_xof: number
          commission_amount: number
          created_at: string
          currency: string
          id: string
          parent_id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          teacher_amount: number
          teacher_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount_xof: number
          commission_amount?: number
          created_at?: string
          currency?: string
          id?: string
          parent_id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          teacher_amount?: number
          teacher_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount_xof?: number
          commission_amount?: number
          created_at?: string
          currency?: string
          id?: string
          parent_id?: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          teacher_amount?: number
          teacher_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlists: {
        Row: {
          created_at: string
          id: string
          learner_id: string
          live_class_id: string
          notified: boolean
          parent_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          learner_id: string
          live_class_id: string
          notified?: boolean
          parent_id: string
          position: number
        }
        Update: {
          created_at?: string
          id?: string
          learner_id?: string
          live_class_id?: string
          notified?: boolean
          parent_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "waitlists_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_xof: number
          created_at: string
          id: string
          reference: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        Insert: {
          amount_xof: number
          created_at?: string
          id?: string
          reference?: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        Update: {
          amount_xof?: number
          created_at?: string
          id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "platform_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_school_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      ai_processing_status:
        | "pending"
        | "transcribing"
        | "extracting"
        | "ready"
        | "failed"
      ai_twin_maturity: "level_0" | "level_1" | "level_2" | "level_3"
      class_format: "group" | "one_on_one"
      class_status: "scheduled" | "live" | "completed" | "cancelled"
      course_status: "draft" | "published" | "archived"
      grade_level:
        | "CP1"
        | "CP2"
        | "CE1"
        | "CE2"
        | "CM1"
        | "CM2"
        | "6eme"
        | "5eme"
        | "4eme"
        | "3eme"
        | "2nde"
        | "1ere"
        | "Terminale"
      moderation_status: "pending" | "approved" | "rejected"
      payment_provider:
        | "orange_money"
        | "wave"
        | "mtn_momo"
        | "wallet"
        | "manual"
      payout_status: "pending" | "processing" | "completed" | "failed"
      recurrence_type: "one_time" | "weekly" | "custom"
      report_category:
        | "inappropriate"
        | "safety"
        | "spam"
        | "off_platform"
        | "other"
      report_status: "pending" | "reviewed" | "action_taken" | "dismissed"
      school_type: "private_school" | "tutoring_center" | "academy"
      strike_level: "warning" | "strike_1" | "strike_2" | "strike_3"
      target_exam: "CEPE" | "BEPC" | "BAC" | "CONCOURS_6EME"
      ticket_category: "payment" | "technical" | "dispute" | "account" | "other"
      ticket_priority: "low" | "medium" | "high"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      transaction_status: "pending" | "confirmed" | "failed" | "refunded"
      transaction_type:
        | "course_purchase"
        | "class_booking"
        | "refund"
        | "payout"
        | "referral_credit"
      user_role: "parent" | "teacher" | "admin" | "school_admin"
      verification_status:
        | "pending"
        | "id_submitted"
        | "diploma_submitted"
        | "video_submitted"
        | "fully_verified"
        | "rejected"
      wallet_tx_type:
        | "refund_credit"
        | "purchase_debit"
        | "referral_credit"
        | "guarantee_credit"
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
      ai_processing_status: [
        "pending",
        "transcribing",
        "extracting",
        "ready",
        "failed",
      ],
      ai_twin_maturity: ["level_0", "level_1", "level_2", "level_3"],
      class_format: ["group", "one_on_one"],
      class_status: ["scheduled", "live", "completed", "cancelled"],
      course_status: ["draft", "published", "archived"],
      grade_level: [
        "CP1",
        "CP2",
        "CE1",
        "CE2",
        "CM1",
        "CM2",
        "6eme",
        "5eme",
        "4eme",
        "3eme",
        "2nde",
        "1ere",
        "Terminale",
      ],
      moderation_status: ["pending", "approved", "rejected"],
      payment_provider: [
        "orange_money",
        "wave",
        "mtn_momo",
        "wallet",
        "manual",
      ],
      payout_status: ["pending", "processing", "completed", "failed"],
      recurrence_type: ["one_time", "weekly", "custom"],
      report_category: [
        "inappropriate",
        "safety",
        "spam",
        "off_platform",
        "other",
      ],
      report_status: ["pending", "reviewed", "action_taken", "dismissed"],
      school_type: ["private_school", "tutoring_center", "academy"],
      strike_level: ["warning", "strike_1", "strike_2", "strike_3"],
      target_exam: ["CEPE", "BEPC", "BAC", "CONCOURS_6EME"],
      ticket_category: ["payment", "technical", "dispute", "account", "other"],
      ticket_priority: ["low", "medium", "high"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      transaction_status: ["pending", "confirmed", "failed", "refunded"],
      transaction_type: [
        "course_purchase",
        "class_booking",
        "refund",
        "payout",
        "referral_credit",
      ],
      user_role: ["parent", "teacher", "admin", "school_admin"],
      verification_status: [
        "pending",
        "id_submitted",
        "diploma_submitted",
        "video_submitted",
        "fully_verified",
        "rejected",
      ],
      wallet_tx_type: [
        "refund_credit",
        "purchase_debit",
        "referral_credit",
        "guarantee_credit",
      ],
    },
  },
} as const

