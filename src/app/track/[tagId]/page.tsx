'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Battery, ArrowLeft } from 'lucide-react'

export default function TrackTag({ params }: { params: { tagId: string } }) {
  const [tagData, setTagData] = useState({
    tag: {
      id: params.tagId,
      is_active: true,
      battery_level: 85,
      last_ping: '2024-01-01T12:00:00Z'
    },
    current_location: {
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: '2024-01-01T12:00:00Z'
    },
    status: 'active'
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Track {params.tagId}</h1>
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Current Location</h2>
            <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Map view coming soon</p>
                <p className="text-sm text-gray-500">
                  {tagData.current_location.latitude}, {tagData.current_location.longitude}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Tag Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  {tagData.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Battery</span>
                <div className="flex items-center">
                  <Battery className="h-4 w-4 text-green-500 mr-1" />
                  <span>{tagData.tag.battery_level}%</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Last Update</span>
                <span>15 minutes ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 