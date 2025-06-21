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
    const { action, planType, devicesCount, stripeSubscriptionId } = body;

    if (action === 'create') {
      // Create new subscription
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: planType || 'basic',
          devices_covered: devicesCount || 5,
          renewal_date: renewalDate.toISOString(),
          stripe_subscription_id: stripeSubscriptionId,
          price_monthly: devicesCount ? (Math.ceil(devicesCount / 5) * 5) : 5
        })
        .select()
        .single();

      if (subError) {
        console.error('Subscription creation error:', subError);
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        );
      }

      // Update user premium status and device limits
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          is_premium: true,
          device_limit: devicesCount || 5,
          subscription_id: subscription.id
        })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error('User update error:', userUpdateError);
      }

      return NextResponse.json({
        success: true,
        subscription,
        message: 'Subscription created successfully!'
      });
    }

    if (action === 'upgrade') {
      // Upgrade existing subscription
      const newDeviceLimit = devicesCount || 10;
      const newPrice = Math.ceil(newDeviceLimit / 5) * 5;

      const { data: subscription, error: upgradeError } = await supabase
        .from('subscriptions')
        .update({
          devices_covered: newDeviceLimit,
          price_monthly: newPrice
        })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .select()
        .single();

      if (upgradeError) {
        console.error('Subscription upgrade error:', upgradeError);
        return NextResponse.json(
          { error: 'Failed to upgrade subscription' },
          { status: 500 }
        );
      }

      // Update user device limit
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ device_limit: newDeviceLimit })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error('User update error:', userUpdateError);
      }

      return NextResponse.json({
        success: true,
        subscription,
        message: 'Subscription upgraded successfully!'
      });
    }

    if (action === 'cancel') {
      // Cancel subscription
      const { data: subscription, error: cancelError } = await supabase
        .from('subscriptions')
        .update({
          is_active: false,
          canceled_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .select()
        .single();

      if (cancelError) {
        console.error('Subscription cancellation error:', cancelError);
        return NextResponse.json(
          { error: 'Failed to cancel subscription' },
          { status: 500 }
        );
      }

      // Update user status to free tier
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          is_premium: false,
          device_limit: 1,
          subscription_id: null
        })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error('User update error:', userUpdateError);
      }

      return NextResponse.json({
        success: true,
        subscription,
        message: 'Subscription canceled successfully!'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Subscription management error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user's subscription details
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_devices(
          device_id,
          devices(tag_id, type, is_active)
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Subscription fetch error:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_premium, device_limit, current_devices, owned_tags')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Calculate subscription cost for different device counts
    const costCalculations = {
      5: 5,
      10: 10,
      15: 15,
      20: 20,
      25: 25
    };

    return NextResponse.json({
      subscription: subscription || null,
      user: userData,
      costCalculations,
      hasActiveSubscription: !!subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 