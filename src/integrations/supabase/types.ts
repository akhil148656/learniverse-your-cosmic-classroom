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
      ai_feedback: {
        Row: {
          category: string | null
          created_at: string
          feedback_text: string
          id: string
          parent_acknowledged: boolean | null
          parent_reaction: string | null
          student_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          feedback_text: string
          id?: string
          parent_acknowledged?: boolean | null
          parent_reaction?: string | null
          student_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          feedback_text?: string
          id?: string
          parent_acknowledged?: boolean | null
          parent_reaction?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          max_score: number | null
          teacher_id: string
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number | null
          teacher_id: string
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number | null
          teacher_id?: string
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_code: string
          created_at: string
          description: string | null
          grade_level: number | null
          id: string
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_code: string
          created_at?: string
          description?: string | null
          grade_level?: number | null
          id?: string
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_code?: string
          created_at?: string
          description?: string | null
          grade_level?: number | null
          id?: string
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_teachers: {
        Row: {
          class_id: string
          created_at: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_messages: {
        Row: {
          created_at: string
          id: string
          is_ai_response: boolean | null
          is_teacher_tagged: boolean | null
          message_text: string
          room_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ai_response?: boolean | null
          is_teacher_tagged?: boolean | null
          message_text: string
          room_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ai_response?: boolean | null
          is_teacher_tagged?: boolean | null
          message_text?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "discussion_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_rooms: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          max_participants: number | null
          name: string
          topic_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          max_participants?: number | null
          name: string
          topic_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          max_participants?: number | null
          name?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_rooms_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_rooms_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_suggestions: {
        Row: {
          created_at: string
          id: string
          is_dismissed: boolean | null
          priority: number | null
          reason: string | null
          student_id: string
          suggestion_text: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          priority?: number | null
          reason?: string | null
          student_id: string
          suggestion_text: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          priority?: number | null
          reason?: string | null
          student_id?: string
          suggestion_text?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_suggestions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_suggestions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          accuracy: number | null
          completed_at: string | null
          created_at: string
          id: string
          mode: string | null
          quiz_id: string
          score: number | null
          student_id: string
          time_taken_seconds: number | null
          xp_earned: number | null
        }
        Insert: {
          accuracy?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mode?: string | null
          quiz_id: string
          score?: number | null
          student_id: string
          time_taken_seconds?: number | null
          xp_earned?: number | null
        }
        Update: {
          accuracy?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mode?: string | null
          quiz_id?: string
          score?: number | null
          student_id?: string
          time_taken_seconds?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          options: Json | null
          points: number | null
          question_text: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: number | null
          id: string
          time_limit_minutes: number | null
          title: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          id?: string
          time_limit_minutes?: number | null
          title: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          id?: string
          time_limit_minutes?: number | null
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          student_id: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          student_id: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          student_id?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_history_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_analytics: {
        Row: {
          average_score: number | null
          created_at: string
          distraction_count: number | null
          focus_score: number | null
          id: string
          last_activity_at: string | null
          quizzes_attempted: number | null
          quizzes_passed: number | null
          student_id: string
          study_time_minutes: number | null
          subject_id: string | null
          topics_completed: number | null
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string
          distraction_count?: number | null
          focus_score?: number | null
          id?: string
          last_activity_at?: string | null
          quizzes_attempted?: number | null
          quizzes_passed?: number | null
          student_id: string
          study_time_minutes?: number | null
          subject_id?: string | null
          topics_completed?: number | null
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          created_at?: string
          distraction_count?: number | null
          focus_score?: number | null
          id?: string
          last_activity_at?: string | null
          quizzes_attempted?: number | null
          quizzes_passed?: number | null
          student_id?: string
          study_time_minutes?: number | null
          subject_id?: string | null
          topics_completed?: number | null
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_analytics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_analytics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          awarded_at: string
          created_at: string
          description: string | null
          id: string
          student_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          awarded_at?: string
          created_at?: string
          description?: string | null
          id?: string
          student_id: string
          teacher_id: string
          title: string
        }
        Update: {
          awarded_at?: string
          created_at?: string
          description?: string | null
          id?: string
          student_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assignments: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          score: number | null
          status: string | null
          student_id: string
          submission_attachment_mime: string | null
          submission_attachment_name: string | null
          submission_attachment_path: string | null
          submission_text: string | null
          submitted_at: string | null
          teacher_feedback: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          score?: number | null
          status?: string | null
          student_id: string
          submission_attachment_mime?: string | null
          submission_attachment_name?: string | null
          submission_attachment_path?: string | null
          submission_text?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          score?: number | null
          status?: string | null
          student_id?: string
          submission_attachment_mime?: string | null
          submission_attachment_name?: string | null
          submission_attachment_path?: string | null
          submission_text?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_assignments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lab_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_unlocked: boolean | null
          lab_id: string
          progress_data: Json | null
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_unlocked?: boolean | null
          lab_id: string
          progress_data?: Json | null
          student_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_unlocked?: boolean | null
          lab_id?: string
          progress_data?: Json | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_lab_progress_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "virtual_labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lab_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string | null
          created_at: string
          focus_score: number | null
          gender: string | null
          grade_level: number | null
          id: string
          learning_mode: string | null
          preferred_language: string | null
          student_code: string
          updated_at: string
          user_id: string
          xp_points: number | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          focus_score?: number | null
          gender?: string | null
          grade_level?: number | null
          id?: string
          learning_mode?: string | null
          preferred_language?: string | null
          student_code?: string
          updated_at?: string
          user_id: string
          xp_points?: number | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          focus_score?: number | null
          gender?: string | null
          grade_level?: number | null
          id?: string
          learning_mode?: string | null
          preferred_language?: string | null
          student_code?: string
          updated_at?: string
          user_id?: string
          xp_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: number | null
          grade_level: number | null
          id: string
          name: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          grade_level?: number | null
          id?: string
          name: string
          subject_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          grade_level?: number | null
          id?: string
          name?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          color: string | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          note_type: string
          related_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_type: string
          related_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_type?: string
          related_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      virtual_labs: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          id: string
          is_locked: boolean | null
          lab_type: string | null
          subject_id: string | null
          title: string
          topic_id: string | null
          unlock_condition: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean | null
          lab_type?: string | null
          subject_id?: string | null
          title: string
          topic_id?: string | null
          unlock_condition?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean | null
          lab_type?: string | null
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          unlock_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_labs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_labs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_student_by_code: {
        Args: { _student_code: string }
        Returns: {
          class_id: string | null
          full_name: string | null
          grade_level: number | null
          student_id: string
        }[]
      }
      parent_link_student_by_code: {
        Args: { _student_code: string }
        Returns: string
      }
      teacher_add_student_to_class_by_code: {
        Args: { _class_id: string; _student_code: string }
        Returns: string
      }
      find_class_by_code: {
        Args: { _code: string }
        Returns: {
          grade_level: number | null
          id: string
          name: string
        }[]
      }
      teacher_join_class_by_code: {
        Args: { _code: string }
        Returns: string
      }
      student_join_class_by_code: {
        Args: { _code: string }
        Returns: string
      }
      get_student_performance_summary: {
        Args: { student_uuid: string }
        Returns: {
          average_score: number
          focus_score: number
          quizzes_attempted: number
          quizzes_passed: number
          recent_quiz_attempts: Json
          student_name: string
          study_time_minutes: number
          topics_completed: number
          total_xp: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "student" | "teacher" | "parent"
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
      user_role: ["student", "teacher", "parent"],
    },
  },
} as const
