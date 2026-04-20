export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string
          age: number | null
          weight_kg: number | null
          height_cm: number | null
          sports: string[]
          level: 'beginner' | 'intermediate' | 'advanced' | 'competitor'
          goals: string[]
          target_competition_date: string | null
          available_days: number[]
          max_session_duration_min: number
          equipment: string[]
          vo2max: number | null
          ftp_watts: number | null
          resting_hr: number | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      garmin_data_daily: {
        Row: {
          id: string
          user_id: string
          date: string
          hrv_ms: number | null
          body_battery_max: number | null
          body_battery_min: number | null
          sleep_score: number | null
          sleep_duration_min: number | null
          sleep_deep_min: number | null
          sleep_rem_min: number | null
          sleep_light_min: number | null
          sleep_awake_min: number | null
          resting_hr: number | null
          stress_avg: number | null
          acute_load: number | null
          chronic_load: number | null
          recovery_time_hours: number | null
          training_status: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['garmin_data_daily']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['garmin_data_daily']['Insert']>
      }
      training_sessions: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          date: string
          sport: string
          title: string
          description: string | null
          duration_min: number | null
          status: 'planned' | 'completed' | 'skipped' | 'modified'
          perceived_effort: number | null
          mood_stars: number | null
          notes: string | null
          hr_avg: number | null
          power_avg_watts: number | null
          pace_per_km: string | null
          tss: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['training_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['training_sessions']['Insert']>
      }
      sets_history: {
        Row: {
          id: string
          user_id: string
          session_id: string
          exercise_name: string
          set_number: number
          weight_kg: number | null
          reps: number | null
          duration_sec: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sets_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sets_history']['Insert']>
      }
      weight_history: {
        Row: {
          id: string
          user_id: string
          week_start_date: string
          weight_kg: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['weight_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['weight_history']['Insert']>
      }
      ai_recommendations: {
        Row: {
          id: string
          user_id: string
          date: string
          type: 'morning' | 'proactive' | 'weekly_summary'
          content: string
          data_snapshot: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_recommendations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ai_recommendations']['Insert']>
      }
      chat_history: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_history']['Insert']>
      }
    }
  }
}
