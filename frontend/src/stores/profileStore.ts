import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { DEMO_MODE, demoProfile } from '@/lib/demo'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['user_profiles']['Row']

interface ProfileState {
  profile: Profile | null
  loading: boolean
  fetchProfile: () => Promise<void>
  setProfile: (p: Profile) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,

  fetchProfile: async () => {
    if (DEMO_MODE) {
      set({ profile: demoProfile as Profile, loading: false })
      return
    }
    set({ loading: true })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    set({ profile: data ?? null, loading: false })
  },

  setProfile: (profile) => set({ profile }),
}))
