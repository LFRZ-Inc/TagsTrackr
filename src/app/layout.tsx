import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tagstrackr.vercel.app'),
  title: 'TagsTrackr - Smart Luggage Tracking',
  description: 'Never lose your luggage again. Track your bags in real-time with TagsTrackr smart GPS tags.',
  keywords: 'luggage tracking, GPS tags, travel, baggage, smart luggage',
  authors: [{ name: 'TagsTrackr Team' }],
  openGraph: {
    title: 'TagsTrackr - Smart Luggage Tracking',
    description: 'Never lose your luggage again. Track your bags in real-time with TagsTrackr smart GPS tags.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TagsTrackr - Smart Luggage Tracking',
    description: 'Never lose your luggage again. Track your bags in real-time with TagsTrackr smart GPS tags.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {children}
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
} 