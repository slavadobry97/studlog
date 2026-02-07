
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
      absence_requests: {
        Row: {
          created_at: string
          description: string | null
          direction: string | null
          id: number
          reason_type: string
          schedule_id: number | null
          status: string
          student_id: number
          study_form: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          direction?: string | null
          id?: number
          reason_type: string
          schedule_id?: number | null
          status: string
          student_id: number
          study_form?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          direction?: string | null
          id?: number
          reason_type?: string
          schedule_id?: number | null
          status?: string
          student_id?: number
          study_form?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: number
          schedule_id: number | null
          status: string
          student_id: number
          absence_request_id: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          schedule_id?: number | null
          status: string
          student_id: number
          absence_request_id?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          schedule_id?: number | null
          status?: string
          student_id?: number
          absence_request_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
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
          department: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          department?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule: {
        Row: {
          classroom: string | null
          created_at: string
          date: string
          group: string
          id: number
          load_type: string | null
          subject: string
          teacher_name: string
          time: string
        }
        Insert: {
          classroom?: string | null
          created_at?: string
          date: string
          group: string
          id?: number
          load_type?: string | null
          subject: string
          teacher_name: string
          time: string
        }
        Update: {
          classroom?: string | null
          created_at?: string
          date?: string
          group?: string
          id?: number
          load_type?: string | null
          subject?: string
          teacher_name?: string
          time?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          avatar_url: string | null
          created_at: string
          group: string
          id: number
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          group: string
          id?: number
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          group?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
