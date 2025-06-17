'use client'

import Link from 'next/link'
import { 
  MapPin, 
  Shield, 
  Battery, 
  Smartphone, 
  CheckCircle, 
  Star,
  Plane,
  Clock,
  DollarSign,
  Users,
  Package
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">TagsTrackr</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-500 hover:text-gray-900">Features</a>
              <a href="#how-it-works" className="text-gray-500 hover:text-gray-900">How It Works</a>
              <a href="#partners" className="text-gray-500 hover:text-gray-900">Partners</a>
              <a href="#pricing" className="text-gray-500 hover:text-gray-900">Pricing</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-500 hover:text-gray-900">
                Sign In
              </Link>
              <Link href="/register-tag" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Track Item
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Never Lose Your Valuables Again
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Track luggage, packages, electronics, and any valuable items in real-time. 
            <span className="text-blue-600 font-semibold"> Especially designed for airline travel</span> where 
            luggage tracking is notoriously unreliable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register-tag" className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-semibold">
              Start Tracking
            </Link>
            <Link href="/dashboard" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-md hover:bg-gray-50 font-semibold">
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 bg-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem is Real</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <Plane className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">28 Million Bags Mishandled</h3>
                <p className="text-gray-600">Airlines lose or delay millions of bags annually, leaving travelers stranded</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <Package className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Package Theft Rising</h3>
                <p className="text-gray-600">Billions in packages stolen from doorsteps and during shipping</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Limited Tracking</h3>
                <p className="text-gray-600">Current tracking systems only show major checkpoints, not real-time location</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Comprehensive Tracking Solution</h2>
            <p className="text-lg text-gray-600">Track anything, anywhere, anytime with our advanced GPS technology</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600">GPS location updates every few minutes with precise coordinates</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Theft Protection</h3>
              <p className="text-gray-600">Instant alerts when items move unexpectedly or leave safe zones</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Mobile App</h3>
              <p className="text-gray-600">Track all your items from your phone with push notifications</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Partner Network</h3>
              <p className="text-gray-600">Integrated with airlines, shipping companies, and security services</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perfect for Every Situation</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Plane className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Air Travel</h3>
              <p className="text-gray-600">Track luggage through airports, connecting flights, and baggage claim</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Package className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Shipping & Delivery</h3>
              <p className="text-gray-600">Monitor packages from pickup to delivery, especially high-value items</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Personal Items</h3>
              <p className="text-gray-600">Laptops, cameras, jewelry, and other valuable personal belongings</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Users className="h-8 w-8 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Business Equipment</h3>
              <p className="text-gray-600">Track company assets, tools, and equipment across locations</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Clock className="h-8 w-8 text-yellow-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Moving & Storage</h3>
              <p className="text-gray-600">Keep tabs on belongings during relocations and storage</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <MapPin className="h-8 w-8 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Outdoor Adventures</h3>
              <p className="text-gray-600">Track gear during camping, hiking, and outdoor activities</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Simple setup, powerful tracking</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Attach Tag</h3>
              <p className="text-gray-600">Place our small GPS tracker on or in your item. Waterproof and long-lasting battery.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Register & Track</h3>
              <p className="text-gray-600">Scan the QR code or register online. Your item is now being tracked 24/7.</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Updates</h3>
              <p className="text-gray-600">Receive real-time location updates and alerts on your phone or computer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted Partners</h2>
            <p className="text-lg text-gray-600">Working with industry leaders to improve tracking everywhere</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-400">Delta</div>
            </div>
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-400">FedEx</div>
            </div>
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-400">UPS</div>
            </div>
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-400">United</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-600">Choose the plan that works for you</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-gray-200 rounded-lg p-8">
              <h3 className="text-xl font-semibold mb-4">Basic</h3>
              <div className="text-3xl font-bold mb-4">$29<span className="text-lg text-gray-500">/tag</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Real-time GPS tracking
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Mobile app access
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Basic alerts
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  30-day battery life
                </li>
              </ul>
              <button className="w-full bg-gray-100 text-gray-800 py-2 rounded-md hover:bg-gray-200">
                Get Started
              </button>
            </div>
            
            <div className="border-2 border-blue-500 rounded-lg p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-4">Pro</h3>
              <div className="text-3xl font-bold mb-4">$49<span className="text-lg text-gray-500">/tag</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Everything in Basic
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Advanced geofencing
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Temperature monitoring
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  60-day battery life
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  $5 return reward
                </li>
              </ul>
              <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                Get Started
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-8">
              <h3 className="text-xl font-semibold mb-4">Enterprise</h3>
              <div className="text-3xl font-bold mb-4">Custom</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Everything in Pro
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  API access
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Custom integrations
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Dedicated support
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  Volume discounts
                </li>
              </ul>
              <button className="w-full bg-gray-100 text-gray-800 py-2 rounded-md hover:bg-gray-200">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Never Lose Anything Again?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who trust TagsTrackr to keep their valuables safe
          </p>
          <Link href="/register-tag" className="bg-white text-blue-600 px-8 py-3 rounded-md hover:bg-gray-100 font-semibold">
            Start Tracking Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <MapPin className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-lg font-bold">TagsTrackr</span>
              </div>
              <p className="text-gray-400">
                The world's most comprehensive tracking solution for all your valuable items.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/register-tag" className="hover:text-white">Track Item</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
                <li><Link href="/admin" className="hover:text-white text-xs opacity-50">Admin</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TagsTrackr. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 