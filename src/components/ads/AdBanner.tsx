'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, DollarSign, X, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore, useShouldShowAds } from '@/lib/store'

interface Ad {
  id: string
  title: string
  body: string
  image_url: string | null
  link_url: string
  page_context: string
  is_active: boolean
  priority: number
}

interface AdBannerProps {
  pageContext: 'dashboard' | 'track' | 'account' | 'general'
  className?: string
  compact?: boolean
}

export default function AdBanner({ pageContext, className = '', compact = false }: AdBannerProps) {
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [creditEarned, setCreditEarned] = useState(false)
  const [showCreditAnimation, setShowCreditAnimation] = useState(false)

  const { user, ads, setAds, adCredits, updateCreditBalance, incrementDailyViews } = useAppStore()
  const shouldShowAds = useShouldShowAds()

  useEffect(() => {
    if (shouldShowAds) {
      fetchAds()
    } else {
      setLoading(false)
    }
  }, [shouldShowAds, pageContext])

  useEffect(() => {
    if (ads.length > 0) {
      selectAdForContext()
    }
  }, [ads])

  const fetchAds = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .in('page_context', [pageContext, 'general'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        // If ads table doesn't exist, just set empty array and continue
        if (error.code === '42P01') {
          console.log('Ads table not found, continuing without ads')
          setAds([])
          return
        }
        throw error
      }

      if (data) {
        setAds(data)
      }
    } catch (error) {
      console.error('Error fetching ads:', error)
      // Set empty ads array to prevent blocking the app
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const selectAdForContext = () => {
    // Filter ads by context, prioritizing exact context matches
    const contextAds = ads.filter(ad => ad.page_context === pageContext)
    const generalAds = ads.filter(ad => ad.page_context === 'general')
    
    const availableAds = contextAds.length > 0 ? contextAds : generalAds
    
    if (availableAds.length > 0) {
      // Select ad based on priority, with some randomization
      const topPriorityAds = availableAds.filter(
        ad => ad.priority === Math.max(...availableAds.map(a => a.priority))
      )
      const selectedAd = topPriorityAds[Math.floor(Math.random() * topPriorityAds.length)]
      setCurrentAd(selectedAd)
    }
  }

  const handleAdView = async () => {
    if (!currentAd || !user) return

    try {
      // Track the ad view and potentially earn credits
      const { data, error } = await supabase.rpc('process_ad_view', {
        p_user_id: user.id,
        p_ad_id: currentAd.id,
        p_page_context: pageContext,
        p_session_id: `session_${Date.now()}`
      })

      if (error) throw error

      if (data?.earned_credit) {
        setCreditEarned(true)
        setShowCreditAnimation(true)
        updateCreditBalance((adCredits?.credit_balance || 0) + data.credit_amount)
        incrementDailyViews()
        
        // Hide animation after 3 seconds
        setTimeout(() => {
          setShowCreditAnimation(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Error tracking ad view:', error)
    }
  }

  const handleAdClick = async () => {
    if (!currentAd) return

    // Track click
    if (user) {
      try {
        await supabase
          .from('ad_views')
          .insert({
            user_id: user.id,
            ad_id: currentAd.id,
            page_context: pageContext,
            is_click: true
          })
      } catch (error) {
        console.error('Error tracking ad click:', error)
      }
    }

    // Open link
    if (currentAd.link_url.startsWith('http')) {
      window.open(currentAd.link_url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = currentAd.link_url
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  // Don't render if ads shouldn't be shown or component is dismissed
  if (!shouldShowAds || !isVisible || loading || !currentAd) {
    return null
  }

  return (
    <div className={`relative bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm ${className}`}>
      {/* Credit earned animation */}
      {showCreditAnimation && (
        <div className="absolute -top-2 -right-2 z-10 animate-bounce">
          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            +$0.01
          </div>
        </div>
      )}

      <div className={`${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              {currentAd.image_url && (
                <img 
                  src={currentAd.image_url} 
                  alt={currentAd.title}
                  className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} object-cover rounded-lg flex-shrink-0`}
                />
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'} mb-1`}>
                  {currentAd.title}
                </h3>
                <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} mb-3 line-clamp-2`}>
                  {currentAd.body}
                </p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAdClick}
                    className={`inline-flex items-center gap-1 bg-blue-600 text-white ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md hover:bg-blue-700 transition-colors`}
                  >
                    Learn More
                    <ExternalLink className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  </button>
                  
                  {!creditEarned && adCredits && adCredits.daily_views_count < 5 && (
                    <button
                      onClick={handleAdView}
                      className={`inline-flex items-center gap-1 bg-green-600 text-white ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md hover:bg-green-700 transition-colors`}
                    >
                      <Eye className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                      Earn $0.01
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Ad credits info */}
        {adCredits && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Ad Credits: ${adCredits.credit_balance.toFixed(2)}</span>
              <span>
                Daily views: {adCredits.daily_views_count}/5
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Sponsored label */}
      <div className="absolute top-2 right-8">
        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-medium">
          Sponsored
        </span>
      </div>
    </div>
  )
} 