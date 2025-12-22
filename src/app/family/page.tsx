'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FamilyCircles from '@/components/FamilyCircles'

export default function FamilyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session first (faster)
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setLoading(false)
          return
        }

        // If no session, try getUser
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setLoading(false)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FamilyCircles />
      </div>
    </div>
  )
}

