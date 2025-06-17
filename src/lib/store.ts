import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

interface Tag {
  id: string
  tag_id: string
  user_id: string | null
  is_active: boolean
  battery_level: number | null
  last_ping: string | null
  created_at: string
  updated_at: string
}

interface GpsPing {
  id: string
  tag_id: string
  latitude: number
  longitude: number
  accuracy: number | null
  battery_level: number | null
  signal_strength: number | null
  timestamp: string
  created_at: string
}

interface AppState {
  // Auth
  user: User | null
  isLoading: boolean
  
  // Tags
  userTags: Tag[]
  selectedTag: Tag | null
  
  // GPS Data
  recentPings: GpsPing[]
  
  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setUserTags: (tags: Tag[]) => void
  setSelectedTag: (tag: Tag | null) => void
  addTag: (tag: Tag) => void
  updateTag: (tagId: string, updates: Partial<Tag>) => void
  setRecentPings: (pings: GpsPing[]) => void
  addPing: (ping: GpsPing) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: true,
  userTags: [],
  selectedTag: null,
  recentPings: [],
  
  // Actions
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setUserTags: (userTags) => set({ userTags }),
  setSelectedTag: (selectedTag) => set({ selectedTag }),
  
  addTag: (tag) => set(state => ({ 
    userTags: [...state.userTags, tag] 
  })),
  
  updateTag: (tagId, updates) => set(state => ({
    userTags: state.userTags.map(tag => 
      tag.tag_id === tagId ? { ...tag, ...updates } : tag
    )
  })),
  
  setRecentPings: (recentPings) => set({ recentPings }),
  
  addPing: (ping) => set(state => ({
    recentPings: [ping, ...state.recentPings.slice(0, 99)] // Keep last 100 pings
  }))
})) 