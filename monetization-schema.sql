-- =============================================
-- TagsTrackr Monetization System Schema
-- Comprehensive device, subscription, and sharing system
-- =============================================

-- Update users table with premium and device tracking
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS device_limit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_devices INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS owned_tags INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id);

-- =============================================
-- DEVICE MANAGEMENT TABLES
-- =============================================

-- Main devices table for physical tags
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id VARCHAR(20) UNIQUE NOT NULL, -- Physical tag identifier (QR/NFC)
    type VARCHAR(20) NOT NULL CHECK (type IN ('standard', 'returnable')),
    adhesive BOOLEAN DEFAULT false,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_rented BOOLEAN DEFAULT false,
    data_remaining_mb INTEGER DEFAULT 500,
    is_active BOOLEAN DEFAULT true,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    last_ping_at TIMESTAMP WITH TIME ZONE,
    firmware_version VARCHAR(10) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device location history
CREATE TABLE IF NOT EXISTS public.device_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    altitude DECIMAL(10, 2),
    speed DECIMAL(8, 2),
    heading DECIMAL(5, 2),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTION MANAGEMENT
-- =============================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('basic', 'family', 'enterprise')),
    devices_covered INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    renewal_date TIMESTAMP WITH TIME ZONE NOT NULL,
    canceled_at TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id VARCHAR(100) UNIQUE,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 5.00
);

-- Subscription device allocations
CREATE TABLE IF NOT EXISTS public.subscription_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscription_id, device_id)
);

-- =============================================
-- RENTAL SYSTEM
-- =============================================

-- Rental transaction history
CREATE TABLE IF NOT EXISTS public.rental_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_at TIMESTAMP WITH TIME ZONE,
    return_approved BOOLEAN DEFAULT false,
    refund_processed BOOLEAN DEFAULT false,
    refund_amount DECIMAL(10, 2) DEFAULT 5.00,
    condition_notes TEXT,
    shipping_address JSONB,
    tracking_number VARCHAR(50)
);

-- =============================================
-- FAMILY SHARING SYSTEM
-- =============================================

-- Tag sharing permissions
CREATE TABLE IF NOT EXISTS public.tag_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permissions VARCHAR(20) NOT NULL CHECK (permissions IN ('read', 'full')),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(tag_id, shared_with_user_id)
);

-- =============================================
-- ALERTS & NOTIFICATIONS
-- =============================================

-- Alert definitions and triggers
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('movement', 'geofence_exit', 'theft', 'low_battery', 'data_low')),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB, -- Alert-specific data
    is_active BOOLEAN DEFAULT true
);

-- Geofence definitions
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LOST & FOUND SYSTEM
-- =============================================

-- Found reports for lost tags
CREATE TABLE IF NOT EXISTS public.found_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    finder_contact VARCHAR(255) NOT NULL, -- Email or phone
    finder_name VARCHAR(100),
    found_location_lat DECIMAL(10, 8),
    found_location_lng DECIMAL(11, 8),
    found_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward_claimed BOOLEAN DEFAULT false,
    reward_amount DECIMAL(10, 2) DEFAULT 5.00,
    owner_notified BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'claimed', 'expired')),
    notes TEXT
);

-- =============================================
-- ENHANCED AD CREDITS (Building on existing)
-- =============================================

-- Enhanced ad credits with more sources
ALTER TABLE IF EXISTS public.ad_credits 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'ads' CHECK (source IN ('ads', 'promo', 'reward', 'referral', 'found_tag'));

-- Credit redemption history (enhanced)
ALTER TABLE IF EXISTS public.ad_redemptions 
ADD COLUMN IF NOT EXISTS redemption_type VARCHAR(20) DEFAULT 'tag_discount' CHECK (redemption_type IN ('tag_discount', 'subscription_credit', 'cash_out'));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Device indexes
CREATE INDEX IF NOT EXISTS idx_devices_owner_id ON public.devices(owner_id);
CREATE INDEX IF NOT EXISTS idx_devices_tag_id ON public.devices(tag_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON public.devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON public.devices(is_active);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_device_locations_device_id ON public.device_locations(device_id);
CREATE INDEX IF NOT EXISTS idx_device_locations_recorded_at ON public.device_locations(recorded_at);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON public.subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON public.subscriptions(renewal_date);

-- Sharing indexes
CREATE INDEX IF NOT EXISTS idx_tag_shares_shared_with ON public.tag_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_tag_shares_tag_id ON public.tag_shares(tag_id);

-- Alert indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tag_id ON public.alerts(tag_id);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON public.alerts(triggered_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_reports ENABLE ROW LEVEL SECURITY;

-- Device policies
CREATE POLICY "Users can view their own devices" ON public.devices
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view devices shared with them" ON public.devices
    FOR SELECT USING (
        id IN (
            SELECT tag_id FROM public.tag_shares 
            WHERE shared_with_user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update their own devices" ON public.devices
    FOR UPDATE USING (owner_id = auth.uid());

-- Device locations policies
CREATE POLICY "Users can view locations of their devices" ON public.device_locations
    FOR SELECT USING (
        device_id IN (
            SELECT id FROM public.devices WHERE owner_id = auth.uid()
            UNION
            SELECT tag_id FROM public.tag_shares 
            WHERE shared_with_user_id = auth.uid() AND is_active = true
        )
    );

-- Subscription policies
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Rental history policies
CREATE POLICY "Users can view their rental history" ON public.rental_history
    FOR SELECT USING (user_id = auth.uid());

-- Tag sharing policies
CREATE POLICY "Users can view shares they own or are shared with" ON public.tag_shares
    FOR SELECT USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());

CREATE POLICY "Users can manage shares for their devices" ON public.tag_shares
    FOR ALL USING (owner_id = auth.uid());

-- Alerts policies
CREATE POLICY "Users can view their own alerts" ON public.alerts
    FOR ALL USING (user_id = auth.uid());

-- Geofences policies
CREATE POLICY "Users can manage their own geofences" ON public.geofences
    FOR ALL USING (user_id = auth.uid());

-- Found reports policies (public read for verification)
CREATE POLICY "Anyone can create found reports" ON public.found_reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view found reports for their devices" ON public.found_reports
    FOR SELECT USING (
        tag_id IN (SELECT id FROM public.devices WHERE owner_id = auth.uid())
    );

-- =============================================
-- STORED FUNCTIONS
-- =============================================

-- Function to calculate subscription cost
CREATE OR REPLACE FUNCTION calculate_subscription_cost(device_count INTEGER)
RETURNS DECIMAL(10, 2) AS $$
BEGIN
    -- Base plan covers 5 devices for $5/month
    -- Each additional 5-device pack costs $5/month
    RETURN 5.00 * CEIL(device_count / 5.0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can add more devices
CREATE OR REPLACE FUNCTION can_add_device(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    device_limit INTEGER;
BEGIN
    SELECT current_devices, users.device_limit 
    INTO current_count, device_limit
    FROM public.users 
    WHERE id = user_uuid;
    
    RETURN current_count < device_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process device registration
CREATE OR REPLACE FUNCTION register_device(
    p_tag_id VARCHAR(20),
    p_device_type VARCHAR(20),
    p_user_id UUID,
    p_adhesive BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    device_uuid UUID;
    user_premium BOOLEAN;
    current_count INTEGER;
    limit_count INTEGER;
BEGIN
    -- Check user limits
    SELECT is_premium, current_devices, device_limit 
    INTO user_premium, current_count, limit_count
    FROM public.users WHERE id = p_user_id;
    
    -- Check if user can add more devices
    IF current_count >= limit_count AND NOT user_premium THEN
        RAISE EXCEPTION 'Device limit reached. Upgrade to premium or add subscription.';
    END IF;
    
    -- Create device
    INSERT INTO public.devices (tag_id, type, owner_id, adhesive, is_rented)
    VALUES (p_tag_id, p_device_type, p_user_id, p_adhesive, p_device_type = 'returnable')
    RETURNING id INTO device_uuid;
    
    -- Update user device count
    UPDATE public.users 
    SET current_devices = current_devices + 1,
        owned_tags = CASE WHEN p_device_type = 'standard' THEN owned_tags + 1 ELSE owned_tags END
    WHERE id = p_user_id;
    
    RETURN device_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process tag return
CREATE OR REPLACE FUNCTION process_tag_return(
    p_device_id UUID,
    p_condition_notes TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
DECLARE
    rental_record UUID;
    device_owner UUID;
BEGIN
    -- Get device owner
    SELECT owner_id INTO device_owner FROM public.devices WHERE id = p_device_id;
    
    -- Update rental history
    UPDATE public.rental_history 
    SET returned_at = NOW(),
        condition_notes = p_condition_notes
    WHERE device_id = p_device_id AND returned_at IS NULL
    RETURNING id INTO rental_record;
    
    -- Reset device
    UPDATE public.devices 
    SET owner_id = NULL,
        is_rented = false,
        is_active = false
    WHERE id = p_device_id;
    
    -- Update user device count
    UPDATE public.users 
    SET current_devices = current_devices - 1
    WHERE id = device_owner;
    
    RETURN rental_record IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger movement alert
CREATE OR REPLACE FUNCTION trigger_movement_alert(
    p_device_id UUID,
    p_alert_type VARCHAR(20),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
    device_owner UUID;
    shared_users UUID[];
BEGIN
    -- Get device owner
    SELECT owner_id INTO device_owner FROM public.devices WHERE id = p_device_id;
    
    -- Get shared users
    SELECT ARRAY_AGG(shared_with_user_id) INTO shared_users
    FROM public.tag_shares 
    WHERE tag_id = p_device_id AND is_active = true;
    
    -- Create alert for owner
    INSERT INTO public.alerts (tag_id, user_id, alert_type, metadata)
    VALUES (p_device_id, device_owner, p_alert_type, p_metadata)
    RETURNING id INTO alert_id;
    
    -- Create alerts for shared users if they have full permissions
    INSERT INTO public.alerts (tag_id, user_id, alert_type, metadata)
    SELECT p_device_id, shared_with_user_id, p_alert_type, p_metadata
    FROM public.tag_shares 
    WHERE tag_id = p_device_id AND permissions = 'full' AND is_active = true;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (FOR DEVELOPMENT)
-- =============================================

-- Insert sample device types and test data
-- This will be useful for testing the system

-- Note: Actual device registration should happen through the registration API
-- This is just for development/testing purposes

INSERT INTO public.devices (tag_id, type, adhesive, owner_id, data_remaining_mb) 
VALUES 
    ('TAG001', 'standard', true, NULL, 500),
    ('TAG002', 'returnable', false, NULL, 500),
    ('TAG003', 'standard', false, NULL, 500)
ON CONFLICT (tag_id) DO NOTHING;

-- =============================================
-- ADMIN VIEWS (for management interface)
-- =============================================

-- View for rental management
CREATE OR REPLACE VIEW admin_rental_overview AS
SELECT 
    rh.id,
    d.tag_id,
    u.email as renter_email,
    rh.rented_at,
    rh.returned_at,
    rh.return_approved,
    rh.refund_processed,
    rh.refund_amount,
    d.data_remaining_mb
FROM public.rental_history rh
JOIN public.devices d ON rh.device_id = d.id
JOIN auth.users u ON rh.user_id = u.id
ORDER BY rh.rented_at DESC;

-- View for device inventory
CREATE OR REPLACE VIEW admin_device_inventory AS
SELECT 
    d.tag_id,
    d.type,
    d.is_active,
    d.is_rented,
    d.owner_id,
    u.email as owner_email,
    d.data_remaining_mb,
    d.battery_level,
    d.last_ping_at,
    d.created_at
FROM public.devices d
LEFT JOIN auth.users u ON d.owner_id = u.id
ORDER BY d.created_at DESC;

-- View for subscription analytics
CREATE OR REPLACE VIEW admin_subscription_analytics AS
SELECT 
    s.plan_type,
    COUNT(*) as active_subscriptions,
    SUM(s.price_monthly) as monthly_revenue,
    AVG(s.devices_covered) as avg_devices_per_sub
FROM public.subscriptions s
WHERE s.is_active = true
GROUP BY s.plan_type;

-- =============================================
-- GRANTS (Ensure proper permissions)
-- =============================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.devices TO authenticated;
GRANT SELECT, INSERT ON public.device_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.subscription_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rental_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geofences TO authenticated;
GRANT SELECT, INSERT ON public.found_reports TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION calculate_subscription_cost TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_device TO authenticated;
GRANT EXECUTE ON FUNCTION register_device TO authenticated;
GRANT EXECUTE ON FUNCTION process_tag_return TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_movement_alert TO authenticated;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Schema deployment complete
-- Next steps:
-- 1. Apply this schema to your Supabase instance
-- 2. Configure Stripe for subscription billing
-- 3. Set up device registration API endpoints
-- 4. Implement admin dashboard for rental management
-- 5. Add email notifications for alerts and returns 