'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Settings, Play, Square, RotateCcw, Database, Zap, TestTube, Shield } from 'lucide-react'
import { simulateRoute } from '@/lib/pingSimulator'

export default function AdminPage() {
  const [isSimulating, setIsSimulating] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState('airport')
  const [tagId, setTagId] = useState('TEST-001')
  const [simulationLog, setSimulationLog] = useState<string[]>([])

  const routes = {
    airport: {
      name: 'Airport Journey',
      description: 'Simulates luggage from check-in to baggage claim',
      duration: '45 minutes'
    },
    shipping: {
      name: 'Package Delivery',
      description: 'Warehouse to doorstep delivery route',
      duration: '2 hours'
    },
    hotel: {
      name: 'Hotel Transfer',
      description: 'Airport to hotel transportation',
      duration: '30 minutes'
    }
  }

  const startSimulation = async () => {
    if (isSimulating) return
    
    setIsSimulating(true)
    setSimulationLog([])
    
    const log = (message: string) => {
      setSimulationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    }

    log(`Starting ${routes[selectedRoute as keyof typeof routes].name} simulation for tag ${tagId}`)
    
    try {
      await simulateRoute(tagId, selectedRoute, (ping: any) => {
        log(`Ping sent - Lat: ${ping.latitude.toFixed(6)}, Lng: ${ping.longitude.toFixed(6)}`)
      })
      log('Simulation completed successfully')
    } catch (error) {
      log(`Simulation error: ${error}`)
    } finally {
      setIsSimulating(false)
    }
  }

  const stopSimulation = () => {
    setIsSimulating(false)
    setSimulationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: Simulation stopped by user`])
  }

  const clearLog = () => {
    setSimulationLog([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-red-600" />
              <span className="ml-2 text-lg font-bold text-gray-900">TagsTrackr Admin</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-900">
                ← Back to Site
              </Link>
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Warning Banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <Shield className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Admin Panel - Development Environment Only
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>This page contains testing and development tools. Use with caution in production.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Ping Simulator */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-6">
                <TestTube className="h-6 w-6 text-blue-600" />
                <h2 className="ml-2 text-xl font-semibold text-gray-900">GPS Ping Simulator</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tag ID
                  </label>
                  <input
                    type="text"
                    value={tagId}
                    onChange={(e) => setTagId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tag ID"
                    disabled={isSimulating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route Type
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSimulating}
                  >
                    {Object.entries(routes).map(([key, route]) => (
                      <option key={key} value={key}>
                        {route.name} ({route.duration})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    {routes[selectedRoute as keyof typeof routes].description}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={startSimulation}
                    disabled={isSimulating || !tagId.trim()}
                    className={`flex items-center px-4 py-2 rounded-md font-medium ${
                      isSimulating || !tagId.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isSimulating ? 'Simulating...' : 'Start Simulation'}
                  </button>

                  {isSimulating && (
                    <button
                      onClick={stopSimulation}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  )}

                  <button
                    onClick={clearLog}
                    className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear Log
                  </button>
                </div>
              </div>

              {/* Simulation Log */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Simulation Log</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-md h-64 overflow-y-auto font-mono text-sm">
                  {simulationLog.length > 0 ? (
                    simulationLog.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No simulation running... Start a simulation to see logs here.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Tools */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <Database className="h-5 w-5 text-green-600" />
                <h3 className="ml-2 text-lg font-medium text-gray-900">System Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">API Endpoints</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">GPS Tracking</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Simulated
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <Zap className="h-5 w-5 text-yellow-600" />
                <h3 className="ml-2 text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <Link
                  href="/register-tag"
                  className="w-full bg-blue-50 text-blue-700 px-3 py-2 rounded-md hover:bg-blue-100 text-sm font-medium text-center block"
                >
                  Register Test Tag
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full bg-green-50 text-green-700 px-3 py-2 rounded-md hover:bg-green-100 text-sm font-medium text-center block"
                >
                  View Dashboard
                </Link>
                <button className="w-full bg-purple-50 text-purple-700 px-3 py-2 rounded-md hover:bg-purple-100 text-sm font-medium">
                  Generate Sample Data
                </button>
                <button className="w-full bg-red-50 text-red-700 px-3 py-2 rounded-md hover:bg-red-100 text-sm font-medium">
                  Clear Test Data
                </button>
              </div>
            </div>

            {/* Development Tools */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <Settings className="h-5 w-5 text-gray-600" />
                <h3 className="ml-2 text-lg font-medium text-gray-900">Dev Tools</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-600">Environment:</span>
                  <span className="ml-2 font-medium text-orange-600">Development</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Next.js:</span>
                  <span className="ml-2 font-medium">14.0.4</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Build:</span>
                  <span className="ml-2 font-medium text-green-600">Ready</span>
                </div>
              </div>
            </div>

            {/* API Endpoints */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="ml-2 text-lg font-medium text-gray-900">API Endpoints</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <code className="text-gray-600">/api/ping</code>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-gray-600">/api/register-tag</code>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-gray-600">/api/track/[id]</code>
                  <span className="text-green-600">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Using the Admin Panel</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>GPS Ping Simulator:</strong> Generate realistic GPS tracking data for testing. Select a route type and tag ID, then start the simulation to see pings being sent to the API.</p>
            <p><strong>System Status:</strong> Monitor the health of various system components and services.</p>
            <p><strong>Quick Actions:</strong> Shortcuts to common development tasks like registering test tags and viewing data.</p>
            <p><strong>Dev Tools:</strong> Information about the current build and development environment.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 