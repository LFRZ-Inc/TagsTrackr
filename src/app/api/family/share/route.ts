import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method was called from a Server Component.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
          }
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, shareWithEmail, permissions = 'read', expiresInDays } = body;

    if (!deviceId || !shareWithEmail) {
      return NextResponse.json(
        { error: 'Device ID and share email are required' },
        { status: 400 }
      );
    }

    // Validate permissions
    if (!['read', 'full'].includes(permissions)) {
      return NextResponse.json(
        { error: 'Invalid permissions. Must be "read" or "full"' },
        { status: 400 }
      );
    }

    // Check if the user owns this device
    const { data: device, error: deviceError } = await supabase
      .from('personal_devices')
      .select('id, user_id, device_name')
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found or you do not own this device' },
        { status: 404 }
      );
    }

    // Find the user to share with
    const { data: shareWithUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', shareWithEmail)
      .single();

    if (userError || !shareWithUser) {
      return NextResponse.json(
        { error: 'User not found. They may need to create an account first.' },
        { status: 404 }
      );
    }

    // Check if already shared
    const { data: existingShare } = await supabase
      .from('tag_shares')
      .select('id')
      .eq('device_id', deviceId)
      .eq('shared_with_user_id', shareWithUser.id)
      .eq('is_active', true)
      .single();

    if (existingShare) {
      return NextResponse.json(
        { error: 'Device is already shared with this user' },
        { status: 409 }
      );
    }

    // Calculate expiry date if specified
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create the share
    const { data: share, error: shareError } = await supabase
      .from('tag_shares')
      .insert({
        device_id: deviceId,
        owner_id: user.id,
        shared_with_user_id: shareWithUser.id,
        permissions,
        expires_at: expiresAt?.toISOString()
      })
      .select(`
        *,
        personal_devices!inner(device_name, device_type),
        users!tag_shares_shared_with_user_id_fkey(email, id)
      `)
      .single();

    if (shareError) {
      console.error('Share creation error:', shareError);
      return NextResponse.json(
        { error: 'Failed to create share' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      share,
      message: `Device ${device.device_name} shared successfully with ${shareWithEmail}!`
    });

  } catch (error) {
    console.error('Family share error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get shares for user's devices
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get shares created by this user (devices they own)
    const { data: createdShares, error: createdError } = await supabase
      .from('tag_shares')
      .select(`
        *,
        personal_devices!inner(device_name, device_type, is_active),
        users!tag_shares_shared_with_user_id_fkey(email, id)
      `)
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .order('shared_at', { ascending: false });

    if (createdError) {
      console.error('Error fetching created shares:', createdError);
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    // Get shares received by this user (devices shared with them)
    const { data: receivedShares, error: receivedError } = await supabase
      .from('tag_shares')
      .select(`
        *,
        personal_devices!inner(device_name, device_type, is_active),
        users!tag_shares_owner_id_fkey(email, id)
      `)
      .eq('shared_with_user_id', user.id)
      .eq('is_active', true)
      .order('shared_at', { ascending: false });

    if (receivedError) {
      console.error('Error fetching received shares:', receivedError);
      return NextResponse.json(
        { error: 'Failed to fetch received shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      createdShares: createdShares || [],
      receivedShares: receivedShares || []
    });

  } catch (error) {
    console.error('Get family shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Revoke or update a share
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns this share or is the recipient
    const { data: share, error: shareError } = await supabase
      .from('tag_shares')
      .select('id, owner_id, shared_with_user_id')
      .eq('id', shareId)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    // Only owner or recipient can revoke
    if (share.owner_id !== user.id && share.shared_with_user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to revoke this share' },
        { status: 403 }
      );
    }

    // Deactivate the share
    const { error: revokeError } = await supabase
      .from('tag_shares')
      .update({ is_active: false })
      .eq('id', shareId);

    if (revokeError) {
      console.error('Share revocation error:', revokeError);
      return NextResponse.json(
        { error: 'Failed to revoke share' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Share revoked successfully!'
    });

  } catch (error) {
    console.error('Revoke family share error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 