'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Battery, Plus } from 'lucide-react'

export default function Dashboard() {
  const [tags] = useState([
    {
      id: '1',
      tag_id: 'TT12345ABC',
      is_active: true,
      battery_level: 85,
      last_ping: '15 minutes ago'
    }
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <Link 
              href="/register-tag"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-5 w-5 inline mr-2" />
              Add Tag
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium">Active Tags</h3>
              <p className="text-3xl font-bold text-primary-600">{tags.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium">Online</h3>
              <p className="text-3xl font-bold text-green-600">1</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium">Low Battery</h3>
              <p className="text-3xl font-bold text-yellow-600">0</p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Your Tags</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {tags.map((tag) => (
                <div key={tag.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <MapPin className="h-8 w-8 text-primary-600" />
                    <div>
                      <h3 className="font-medium">{tag.tag_id}</h3>
                      <p className="text-sm text-gray-500">Last ping: {tag.last_ping}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Battery className="h-5 w-5 text-green-500 mr-1" />
                      <span>{tag.battery_level}%</span>
                    </div>
                    <Link 
                      href={`/track/${tag.tag_id}`}
                      className="text-primary-600 hover:text-primary-500"
                    >
                      Track
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 