// Auto-generated Supabase database types
// Matches the schema defined in supabase/migrations/001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // ----------------------------------------------------------
      // passages
      // ----------------------------------------------------------
      passages: {
        Row: {
          id: string
          user_id: string
          title: string | null
          source: string | null
          original_file_url: string | null
          original_file_name: string | null
          structured_data: Json | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          source?: string | null
          original_file_url?: string | null
          original_file_name?: string | null
          structured_data?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          source?: string | null
          original_file_url?: string | null
          original_file_name?: string | null
          structured_data?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ----------------------------------------------------------
      // question_sets
      // ----------------------------------------------------------
      question_sets: {
        Row: {
          id: string
          user_id: string
          passage_id: string
          title: string | null
          options: Json | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          passage_id: string
          title?: string | null
          options?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          passage_id?: string
          title?: string | null
          options?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ----------------------------------------------------------
      // questions
      // ----------------------------------------------------------
      questions: {
        Row: {
          id: string
          question_set_id: string
          type: string
          question_number: number
          difficulty: number | null
          instruction: string
          passage_with_markers: string | null
          choices: Json | null
          answer: string
          explanation: string | null
          test_point: string | null
          is_validated: boolean
          validation_result: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          question_set_id: string
          type: string
          question_number: number
          difficulty?: number | null
          instruction: string
          passage_with_markers?: string | null
          choices?: Json | null
          answer: string
          explanation?: string | null
          test_point?: string | null
          is_validated?: boolean
          validation_result?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          question_set_id?: string
          type?: string
          question_number?: number
          difficulty?: number | null
          instruction?: string
          passage_with_markers?: string | null
          choices?: Json | null
          answer?: string
          explanation?: string | null
          test_point?: string | null
          is_validated?: boolean
          validation_result?: Json | null
          created_at?: string
        }
      }

      // ----------------------------------------------------------
      // exports
      // ----------------------------------------------------------
      exports: {
        Row: {
          id: string
          user_id: string
          question_set_id: string
          format: 'docx' | 'hwpx' | 'pdf'
          file_url: string | null
          options: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_set_id: string
          format?: 'docx' | 'hwpx' | 'pdf'
          file_url?: string | null
          options?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_set_id?: string
          format?: 'docx' | 'hwpx' | 'pdf'
          file_url?: string | null
          options?: Json | null
          created_at?: string
        }
      }

      // ----------------------------------------------------------
      // usage_logs
      // ----------------------------------------------------------
      usage_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          tokens_used: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          tokens_used?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          tokens_used?: number
          created_at?: string
        }
      }
    }

    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ---------------------------------------------------------------------------
// Convenience row-type aliases
// ---------------------------------------------------------------------------
type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Passage       = Tables<'passages'>
export type QuestionSet   = Tables<'question_sets'>
export type Question      = Tables<'questions'>
export type Export        = Tables<'exports'>
export type UsageLog      = Tables<'usage_logs'>

// Insert aliases
type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type PassageInsert       = TablesInsert<'passages'>
export type QuestionSetInsert   = TablesInsert<'question_sets'>
export type QuestionInsert      = TablesInsert<'questions'>
export type ExportInsert        = TablesInsert<'exports'>
export type UsageLogInsert      = TablesInsert<'usage_logs'>

// Update aliases
type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type PassageUpdate       = TablesUpdate<'passages'>
export type QuestionSetUpdate   = TablesUpdate<'question_sets'>
export type QuestionUpdate      = TablesUpdate<'questions'>
export type ExportUpdate        = TablesUpdate<'exports'>
export type UsageLogUpdate      = TablesUpdate<'usage_logs'>
