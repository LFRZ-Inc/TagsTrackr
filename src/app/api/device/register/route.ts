import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tagId, deviceType, adhesive = false, purchaseAmount } = body;

    if (!tagId || !deviceType) {
      return NextResponse.json(
        { error: 'Tag ID and device type are required' },
        { status: 400 }
      );
    }

    // Validate device type
    if (!['standard', 'returnable'].includes(deviceType)) {
      return NextResponse.json(
        { error: 'Invalid device type' },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id, owner_id')
      .eq('tag_id', tagId)
      .single();

    if (existingDevice) {
      if (existingDevice.owner_id) {
        return NextResponse.json(
          { error: 'Tag is already registered to another user' },
          { status: 409 }
        );
      }
      // Tag exists but not registered - this is for returnable tags
    }

    // Device limits removed for testing - all features free
    // Check user exists and create profile if needed
    const { data: userData } = await supabase
      .from('users')
      .select('current_devices, device_limit, is_premium')
      .eq('id', user.id)
      .single();

    // If user doesn't have profile, create one with unlimited devices
    if (!userData) {
      const { data: authUser } = await supabase.auth.getUser();
      await supabase
        .from('users')
        .insert({
          id: user.id,
          email: authUser.user?.email || '',
          full_name: authUser.user?.user_metadata?.full_name || '',
          is_premium: true, // Free for testing
          device_limit: 999, // Unlimited
          current_devices: 0,
          owned_tags: 0
        });
    } else if (!userData.is_premium || userData.device_limit < 999) {
      // Upgrade existing users to unlimited for testing
      await supabase
        .from('users')
        .update({
          is_premium: true,
          device_limit: 999
        })
        .eq('id', user.id);
    }

    // Register device using stored function
    const { data: deviceId, error: registerError } = await supabase
      .rpc('register_device', {
        p_tag_id: tagId,
        p_device_type: deviceType,
        p_user_id: user.id,
        p_adhesive: adhesive
      });

    if (registerError) {
      console.error('Device registration error:', registerError);
      return NextResponse.json(
        { error: 'Failed to register device' },
        { status: 500 }
      );
    }

    // For returnable tags, create rental history entry
    if (deviceType === 'returnable') {
      const { error: rentalError } = await supabase
        .from('rental_history')
        .insert({
          device_id: deviceId,
          user_id: user.id,
          rented_at: new Date().toISOString()
        });

      if (rentalError) {
        console.error('Rental history error:', rentalError);
        // Don't fail the registration, but log the error
      }
    }

    // Get the registered device details
    const { data: device } = await supabase
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    return NextResponse.json({
      success: true,
      device,
      message: `${deviceType === 'standard' ? 'Standard' : 'Returnable'} tag registered successfully!`
    });

  } catch (error) {
    console.error('Device registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user's devices
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's own devices
    const { data: ownedDevices, error: ownedError } = await supabase
      .from('devices')
      .select('*, device_locations(latitude, longitude, recorded_at)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.error('Error fetching owned devices:', ownedError);
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      );
    }

    // Get devices shared with user
    const { data: sharedDevices, error: sharedError } = await supabase
      .from('tag_shares')
      .select(`
        id,
        permissions,
        shared_at,
        devices!inner(
          id,
          tag_id,
          type,
          is_active,
          battery_level,
          last_ping_at,
          device_locations(latitude, longitude, recorded_at)
        )
      `)
      .eq('shared_with_user_id', user.id)
      .eq('is_active', true);

    if (sharedError) {
      console.error('Error fetching shared devices:', sharedError);
      return NextResponse.json(
        { error: 'Failed to fetch shared devices' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ownedDevices: ownedDevices || [],
      sharedDevices: sharedDevices || []
    });

  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 