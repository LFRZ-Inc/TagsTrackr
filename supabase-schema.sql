-- TagsTrackr Database Schema for Supabase
-- This schema creates all tables, policies, and sample data for the TagsTrackr application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE tag_status AS ENUM ('active', 'inactive', 'lost', 'found');
CREATE TYPE partner_type AS ENUM ('airline', 'shipping', 'hotel', 'government');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners table (airlines, shipping companies, etc.)
CREATE TABLE public.partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type partner_type NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE public.tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tag_id VARCHAR(50) UNIQUE NOT NULL, -- External visible ID like "TT12345ABC"
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL, -- User-friendly name like "Main Luggage"
    description TEXT,
    status tag_status DEFAULT 'active',
    qr_code_url VARCHAR(500),
    last_seen_at TIMESTAMPTZ,
    last_location GEOGRAPHY(POINT, 4326),
    battery_level INTEGER DEFAULT 100 CHECK (battery_level >= 0 AND battery_level <= 100),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}', -- Additional flexible data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPS Pings table
CREATE TABLE public.gps_pings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2), -- GPS accuracy in meters
    altitude DECIMAL(8, 2), -- Altitude in meters
    speed DECIMAL(6, 2), -- Speed in km/h
    heading DECIMAL(5, 2), -- Direction in degrees
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    signal_strength INTEGER, -- Signal strength in dBm
    temperature DECIMAL(5, 2), -- Temperature in Celsius
    is_manual BOOLEAN DEFAULT false, -- True if manually triggered
    raw_data JSONB DEFAULT '{}', -- Raw sensor data
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table (lost/found reports)
CREATE TABLE public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    reporter_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('lost', 'found', 'theft', 'damage')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    location_description TEXT,
    contact_info JSONB DEFAULT '{}',
    reward_amount DECIMAL(10, 2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences table (safe zones, restricted areas)
CREATE TABLE public.geofences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('safe_zone', 'restricted', 'airport', 'customs', 'delivery_zone')),
    geometry GEOGRAPHY(POLYGON, 4326) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence alerts table
CREATE TABLE public.geofence_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    geofence_id UUID REFERENCES public.geofences(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('entered', 'exited', 'dwelling')),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ping log table (for analytics and debugging)
CREATE TABLE public.pings_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    ping_data JSONB NOT NULL,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'error')),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_tags_tag_id ON public.tags(tag_id);
CREATE INDEX idx_tags_status ON public.tags(status);
CREATE INDEX idx_gps_pings_tag_id ON public.gps_pings(tag_id);
CREATE INDEX idx_gps_pings_timestamp ON public.gps_pings(timestamp);
CREATE INDEX idx_gps_pings_location ON public.gps_pings USING GIST(ST_Point(longitude, latitude));
CREATE INDEX idx_reports_tag_id ON public.reports(tag_id);
CREATE INDEX idx_reports_type ON public.reports(type);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_geofence_alerts_tag_id ON public.geofence_alerts(tag_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_pings_log_tag_id ON public.pings_log(tag_id);
CREATE INDEX idx_pings_log_status ON public.pings_log(processing_status);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pings_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Tags policies
CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);

-- GPS Pings policies
CREATE POLICY "Users can view pings of own tags" ON public.gps_pings FOR SELECT USING (
    tag_id IN (SELECT id FROM public.tags WHERE user_id = auth.uid())
);
CREATE POLICY "Allow ping insertion" ON public.gps_pings FOR INSERT WITH CHECK (true); -- API will handle validation

-- Reports policies
CREATE POLICY "Users can view reports for own tags" ON public.reports FOR SELECT USING (
    tag_id IN (SELECT id FROM public.tags WHERE user_id = auth.uid()) OR
    reporter_user_id = auth.uid()
);
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own reports" ON public.reports FOR UPDATE USING (reporter_user_id = auth.uid());

-- Geofences policies (public read, admin write)
CREATE POLICY "Anyone can view geofences" ON public.geofences FOR SELECT USING (true);

-- Geofence alerts policies
CREATE POLICY "Users can view alerts for own tags" ON public.geofence_alerts FOR SELECT USING (
    tag_id IN (SELECT id FROM public.tags WHERE user_id = auth.uid())
);
CREATE POLICY "System can create alerts" ON public.geofence_alerts FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Pings log policies (admin/system only for most operations)
CREATE POLICY "Users can view ping logs for own tags" ON public.pings_log FOR SELECT USING (
    tag_id IN (SELECT id FROM public.tags WHERE user_id = auth.uid())
);
CREATE POLICY "System can insert ping logs" ON public.pings_log FOR INSERT WITH CHECK (true);

-- Partners policies (public read for basic info)
CREATE POLICY "Anyone can view active partners" ON public.partners FOR SELECT USING (is_active = true);

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON public.geofences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update tag location on new ping
CREATE OR REPLACE FUNCTION update_tag_location_on_ping()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tags 
    SET 
        last_seen_at = NEW.timestamp,
        last_location = ST_Point(NEW.longitude, NEW.latitude)::geography,
        battery_level = COALESCE(NEW.battery_level, battery_level),
        updated_at = NOW()
    WHERE id = NEW.tag_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update tag location on new ping
CREATE TRIGGER update_tag_on_ping AFTER INSERT ON public.gps_pings FOR EACH ROW EXECUTE FUNCTION update_tag_location_on_ping();

-- Function to check geofence violations
CREATE OR REPLACE FUNCTION check_geofence_violations()
RETURNS TRIGGER AS $$
DECLARE
    geofence_record RECORD;
    ping_point GEOGRAPHY;
BEGIN
    -- Convert ping to geography point
    ping_point := ST_Point(NEW.longitude, NEW.latitude)::geography;
    
    -- Check all active geofences
    FOR geofence_record IN 
        SELECT id, name, type, geometry 
        FROM public.geofences 
        WHERE is_active = true
    LOOP
        -- Check if point is within geofence
        IF ST_Within(ping_point, geofence_record.geometry) THEN
            -- Insert geofence alert if not already existing for this tag/geofence combo today
            INSERT INTO public.geofence_alerts (tag_id, geofence_id, alert_type, location)
            SELECT NEW.tag_id, geofence_record.id, 'entered', ping_point
            WHERE NOT EXISTS (
                SELECT 1 FROM public.geofence_alerts 
                WHERE tag_id = NEW.tag_id 
                AND geofence_id = geofence_record.id 
                AND alert_type = 'entered'
                AND created_at > NOW() - INTERVAL '1 hour'
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to check geofences on new ping
CREATE TRIGGER check_geofences_on_ping AFTER INSERT ON public.gps_pings FOR EACH ROW EXECUTE FUNCTION check_geofence_violations();

-- Insert sample data

-- Sample partners
INSERT INTO public.partners (name, type, contact_email, api_key, is_active) VALUES
('Delta Airlines', 'airline', 'api@delta.com', 'delta_api_key_123', true),
('United Airlines', 'airline', 'dev@united.com', 'united_api_key_456', true),
('FedEx', 'shipping', 'api@fedex.com', 'fedex_api_key_789', true),
('UPS', 'shipping', 'integration@ups.com', 'ups_api_key_012', true),
('Marriott Hotels', 'hotel', 'tech@marriott.com', 'marriott_api_key_345', true),
('TSA', 'government', 'security@tsa.gov', 'tsa_api_key_678', true);

-- Sample geofences (major airports)
INSERT INTO public.geofences (name, description, type, geometry) VALUES
(
    'JFK Airport Security Zone',
    'John F. Kennedy International Airport security perimeter',
    'airport',
    ST_GeomFromText('POLYGON((-73.7856 40.6399, -73.7856 40.6501, -73.7634 40.6501, -73.7634 40.6399, -73.7856 40.6399))', 4326)::geography
),
(
    'LAX Airport Terminal Area',
    'Los Angeles International Airport terminal complex',
    'airport',
    ST_GeomFromText('POLYGON((-118.4170 33.9365, -118.4170 33.9475, -118.3970 33.9475, -118.3970 33.9365, -118.4170 33.9365))', 4326)::geography
),
(
    'Manhattan Delivery Zone',
    'Priority delivery zone in Manhattan',
    'delivery_zone',
    ST_GeomFromText('POLYGON((-74.0200 40.7400, -74.0200 40.7600, -73.9700 40.7600, -73.9700 40.7400, -74.0200 40.7400))', 4326)::geography
);

-- Create a function to generate sample GPS pings for testing
CREATE OR REPLACE FUNCTION generate_sample_pings(tag_uuid UUID, start_lat DECIMAL, start_lng DECIMAL, end_lat DECIMAL, end_lng DECIMAL, num_pings INTEGER DEFAULT 10)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    current_lat DECIMAL;
    current_lng DECIMAL;
    lat_step DECIMAL;
    lng_step DECIMAL;
    ping_time TIMESTAMPTZ;
BEGIN
    lat_step := (end_lat - start_lat) / num_pings;
    lng_step := (end_lng - start_lng) / num_pings;
    
    FOR i IN 0..num_pings LOOP
        current_lat := start_lat + (lat_step * i);
        current_lng := start_lng + (lng_step * i);
        ping_time := NOW() - INTERVAL '1 hour' + (INTERVAL '6 minutes' * i);
        
        INSERT INTO public.gps_pings (
            tag_id, 
            latitude, 
            longitude, 
            accuracy, 
            battery_level, 
            signal_strength,
            timestamp
        ) VALUES (
            tag_uuid,
            current_lat + (random() - 0.5) * 0.001, -- Add small random variation
            current_lng + (random() - 0.5) * 0.001,
            random() * 5 + 2, -- 2-7 meter accuracy
            100 - (i * 5), -- Decreasing battery
            -70 - (random() * 20)::INTEGER, -- Signal strength
            ping_time
        );
    END LOOP;
END;
$$ language 'plpgsql';

-- Views for common queries

-- Active tags with latest location
CREATE VIEW public.active_tags_with_location AS
SELECT 
    t.id,
    t.tag_id,
    t.name,
    t.description,
    t.status,
    t.battery_level,
    t.last_seen_at,
    ST_Y(t.last_location::geometry) as latitude,
    ST_X(t.last_location::geometry) as longitude,
    u.full_name as owner_name,
    u.email as owner_email,
    p.name as partner_name
FROM public.tags t
LEFT JOIN public.users u ON t.user_id = u.id
LEFT JOIN public.partners p ON t.partner_id = p.id
WHERE t.is_active = true;

-- Recent pings with tag info
CREATE VIEW public.recent_pings_with_tags AS
SELECT 
    gp.id,
    gp.latitude,
    gp.longitude,
    gp.accuracy,
    gp.battery_level,
    gp.signal_strength,
    gp.timestamp,
    t.tag_id,
    t.name as tag_name,
    u.full_name as owner_name
FROM public.gps_pings gp
JOIN public.tags t ON gp.tag_id = t.id
JOIN public.users u ON t.user_id = u.id
WHERE gp.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY gp.timestamp DESC;

-- Open reports summary
CREATE VIEW public.open_reports_summary AS
SELECT 
    r.id,
    r.type,
    r.title,
    r.status,
    r.reward_amount,
    r.created_at,
    t.tag_id,
    t.name as tag_name,
    u.full_name as owner_name,
    ST_Y(r.location::geometry) as report_latitude,
    ST_X(r.location::geometry) as report_longitude
FROM public.reports r
JOIN public.tags t ON r.tag_id = t.id
JOIN public.users u ON t.user_id = u.id
WHERE r.status IN ('open', 'investigating')
ORDER BY r.created_at DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant limited permissions to anonymous users (for public API endpoints)
GRANT SELECT ON public.partners TO anon;
GRANT INSERT ON public.gps_pings TO anon;
GRANT INSERT ON public.pings_log TO anon;

-- Database setup complete!
-- Run this script in your Supabase SQL editor to set up the complete TagsTrackr database. 