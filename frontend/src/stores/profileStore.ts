import { create } from 'zustand'
import { DEMO_MODE, demoProfile } from '@/lib/demo'
import { apiGet } from '@/lib/api'
import type { Database } from '@/types/database'

export type Profile = Database['public']['Tables']['user_profiles']['Row']

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
    try {
      const data = await apiGet<Profile | null>('/api/profile')
      set({ profile: data ?? null, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  setProfile: (profile) => set({ profile }),
}))
