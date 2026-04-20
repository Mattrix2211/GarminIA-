import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { DEMO_MODE } from '@/lib/demo'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  init: () => Promise<void>
  signOut: () => Promise<void>
}

const DEMO_USER = {
  id: 'demo-user',
  email: 'matthis@demo.fr',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  init: async () => {
    if (DEMO_MODE) {
      set({ user: DEMO_USER, session: null, loading: false })
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, session, loading: false })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session })
    })
  },

  signOut: async () => {
    if (!DEMO_MODE) await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
