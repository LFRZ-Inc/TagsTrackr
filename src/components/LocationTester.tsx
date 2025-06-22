'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface LocationTesterProps {
  deviceId: string
  onLocationSent?: () => void
}

export default function LocationTester({ deviceId, onLocationSent }: LocationTesterProps) {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const sendTestLocation = async () => {
    setSending(true)
    setMessage('')

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage('❌ Not authenticated')
        return
      }

      // Send a test location ping (New York City coordinates) using simple endpoint
      const response = await fetch('/api/ping/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_id: deviceId,
          latitude: 40.7589,
          longitude: -73.9851,
          accuracy: 10.0
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setMessage('✅ Location sent successfully!')
        onLocationSent?.()
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h4 className="font-medium mb-2">Location Tester</h4>
      <p className="text-sm text-gray-600 mb-3">
        Send a test location ping to make this device appear on the map
      </p>
      <button
        onClick={sendTestLocation}
        disabled={sending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Send Test Location (NYC)'}
      </button>
      {message && (
        <p className="mt-2 text-sm">{message}</p>
      )}
    </div>
  )
} 