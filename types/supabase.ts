// ========================================
// SUPABASE TYPES GENERATION
// TypeScript definitions for database schema
// ========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      interns: {
        Row: {
          id: string
          user_id: string
          application_date: string
          status: 'Applied' | 'Active' | 'Exited' | 'Rejected'
          assigned_topic: 'auto' | 'health' | 'tech' | 'finance' | 'lifestyle' | 'education' | 'food' | 'travel' | null
          start_date: string | null
          end_date: string | null
          agreement_signed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          application_date?: string
          status?: 'Applied' | 'Active' | 'Exited' | 'Rejected'
          assigned_topic?: 'auto' | 'health' | 'tech' | 'finance' | 'lifestyle' | 'education' | 'food' | 'travel' | null
          start_date?: string | null
          end_date?: string | null
          agreement_signed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          application_date?: string
          status?: 'Applied' | 'Active' | 'Exited' | 'Rejected'
          assigned_topic?: 'auto' | 'health' | 'tech' | 'finance' | 'lifestyle' | 'education' | 'food' | 'travel' | null
          start_date?: string | null
          end_date?: string | null
          agreement_signed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interns_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      intern_documents: {
        Row: {
          id: string
          intern_id: string
          document_type: 'Institution Letter' | 'Behavior Agreement' | 'ID Document' | 'Resume' | 'Portfolio' | 'Other'
          storage_path: string
          original_filename: string
          file_size: number
          mime_type: string
          upload_date: string
          created_at: string
        }
        Insert: {
          id?: string
          intern_id: string
          document_type: 'Institution Letter' | 'Behavior Agreement' | 'ID Document' | 'Resume' | 'Portfolio' | 'Other'
          storage_path: string
          original_filename: string
          file_size: number
          mime_type: string
          upload_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          intern_id?: string
          document_type?: 'Institution Letter' | 'Behavior Agreement' | 'ID Document' | 'Resume' | 'Portfolio' | 'Other'
          storage_path?: string
          original_filename?: string
          file_size?: number
          mime_type?: string
          upload_date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intern_documents_intern_id_fkey"
            columns: ["intern_id"]
            referencedRelation: "interns"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_intern_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_interns: number
          applied_count: number
          active_count: number
          exited_count: number
          rejected_count: number
        }
      }
      get_interns_by_status: {
        Args: {
          intern_status?: string
        }
        Returns: {
          id: string
          user_id: string
          email: string
          application_date: string
          status: string
          assigned_topic: string | null
          start_date: string | null
          end_date: string | null
          agreement_signed: boolean
          document_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

