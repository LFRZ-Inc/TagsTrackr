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

interface Ad {
  id: string
  title: string
  body: string
  image_url: string | null
  link_url: string
  page_context: string
  is_active: boolean
  priority: number
  created_at: string
}

interface AdCredits {
  user_id: string
  credit_balance: number
  total_earned: number
  total_redeemed: number
  daily_views_count: number
  last_view_date: string | null
  last_redeemed: string | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  is_premium: boolean
  created_at: string
}

interface AppState {
  // Auth & User
  user: User | null
  userProfile: UserProfile | null
  isLoading: boolean
  
  // Tags
  userTags: Tag[]
  selectedTag: Tag | null
  
  // GPS Data
  recentPings: GpsPing[]
  
  // Ads System
  ads: Ad[]
  adCredits: AdCredits | null
  showAds: boolean // User preference for showing ads
  
  // Actions
  setUser: (user: User | null) => void
  setUserProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setUserTags: (tags: Tag[]) => void
  setSelectedTag: (tag: Tag | null) => void
  addTag: (tag: Tag) => void
  updateTag: (tagId: string, updates: Partial<Tag>) => void
  setRecentPings: (pings: GpsPing[]) => void
  addPing: (ping: GpsPing) => void
  
  // Ad Actions
  setAds: (ads: Ad[]) => void
  setAdCredits: (credits: AdCredits | null) => void
  setShowAds: (show: boolean) => void
  updateCreditBalance: (newBalance: number) => void
  incrementDailyViews: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  userProfile: null,
  isLoading: true,
  userTags: [],
  selectedTag: null,
  recentPings: [],
  ads: [],
  adCredits: null,
  showAds: true,
  
  // Actions
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
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
  })),
  
  // Ad Actions
  setAds: (ads) => set({ ads }),
  setAdCredits: (adCredits) => set({ adCredits }),
  setShowAds: (showAds) => set({ showAds }),
  
  updateCreditBalance: (newBalance) => set(state => ({
    adCredits: state.adCredits ? {
      ...state.adCredits,
      credit_balance: newBalance
    } : null
  })),
  
  incrementDailyViews: () => set(state => ({
    adCredits: state.adCredits ? {
      ...state.adCredits,
      daily_views_count: state.adCredits.daily_views_count + 1
    } : null
  }))
}))

// Helper function to check if user is premium
export const useIsPremium = () => {
  const userProfile = useAppStore(state => state.userProfile)
  return userProfile?.is_premium || false
}

// Helper function to check if ads should be shown
export const useShouldShowAds = () => {
  const { userProfile, showAds } = useAppStore()
  return showAds && !userProfile?.is_premium
} 