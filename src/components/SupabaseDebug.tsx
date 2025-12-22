'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseDebug() {
  const [config, setConfig] = useState<any>(null)
  const [connectionTest, setConnectionTest] = useState<any>(null)

  useEffect(() => {
    // Test server-side config
    fetch('/api/test-supabase-connection')
      .then(res => res.json())
      .then(data => setConnectionTest(data))
      .catch(err => setConnectionTest({ error: err.message }))

    // Test client-side connection
    supabase.auth.getSession()
      .then(({ data, error }) => {
        setConfig({
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
          hasKey: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-anon-key'),
          sessionTest: error ? error.message : 'Connected'
        })
      })
      .catch(err => {
        setConfig({ error: err.message })
      })
  }, [])

  if (!config && !connectionTest) return null

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">🔍 Supabase Debug Info</h3>
      <div className="space-y-1">
        <div><strong>Server Config:</strong></div>
        {connectionTest && (
          <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(connectionTest, null, 2)}
          </pre>
        )}
        <div><strong>Client Config:</strong></div>
        {config && (
          <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

