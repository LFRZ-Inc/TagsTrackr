'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthDebugger() {
  const [authState, setAuthState] = useState<any>(null);
  const [serverAuthState, setServerAuthState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAuth() {
      try {
        // Client-side auth check
        const { data: { user }, error } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();
        
        setAuthState({
          user: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          } : null,
          session: session ? {
            expires_at: session.expires_at,
            user_id: session.user?.id
          } : null,
          error: error?.message
        });

        // Server-side auth check
        const response = await fetch('/api/test-auth', {
          credentials: 'include'
        });
        const serverData = await response.json();
        setServerAuthState(serverData);
        
      } catch (error) {
        console.error('Auth debug error:', error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [supabase]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading auth state...</div>;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs">
      <h3 className="font-medium text-gray-900 mb-2">🔍 Auth Debug Info</h3>
      
      <div className="space-y-2">
        <div>
          <strong>Client Auth:</strong>
          <div className="ml-2">
            <div>User: {authState?.user ? `✅ ${authState.user.email}` : '❌ Not logged in'}</div>
            <div>Session: {authState?.session ? '✅ Active' : '❌ No session'}</div>
            {authState?.error && <div className="text-red-600">Error: {authState.error}</div>}
          </div>
        </div>
        
        <div>
          <strong>Server Auth:</strong>
          <div className="ml-2">
            <div>User: {serverAuthState?.user ? `✅ ${serverAuthState.user.email}` : '❌ Not logged in'}</div>
            <div>Session: {serverAuthState?.session ? '✅ Active' : '❌ No session'}</div>
            <div>Cookies: {serverAuthState?.cookieCount || 0} found</div>
            {serverAuthState?.userError && <div className="text-red-600">User Error: {serverAuthState.userError}</div>}
            {serverAuthState?.sessionError && <div className="text-red-600">Session Error: {serverAuthState.sessionError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
} 