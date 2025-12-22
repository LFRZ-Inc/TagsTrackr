-- =============================================
-- TRIP TRACKING AND DRIVING BEHAVIOR SCHEMA
-- =============================================

-- Trips table - tracks individual trips (like Life360)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.personal_devices(id) ON DELETE CASCADE,
    
    -- Trip details
    trip_name VARCHAR(255), -- Auto-generated or user-provided name
    start_location_lat DECIMAL(10, 8) NOT NULL,
    start_location_lng DECIMAL(11, 8) NOT NULL,
    end_location_lat DECIMAL(10, 8),
    end_location_lng DECIMAL(11, 8),
    start_address TEXT,
    end_address TEXT,
    
    -- Trip timing
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER, -- Calculated duration
    
    -- Trip statistics
    total_distance_meters DECIMAL(10, 2), -- Total distance traveled
    average_speed_kmh DECIMAL(6, 2), -- Average speed
    max_speed_kmh DECIMAL(6, 2), -- Maximum speed reached
    total_driving_time_seconds INTEGER, -- Time actually moving (excluding stops)
    
    -- Driving behavior scores
    safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100), -- Overall safety score
    hard_braking_count INTEGER DEFAULT 0,
    rapid_acceleration_count INTEGER DEFAULT 0,
    speeding_count INTEGER DEFAULT 0,
    phone_usage_count INTEGER DEFAULT 0, -- If detected
    harsh_turning_count INTEGER DEFAULT 0,
    
    -- Trip metadata
    trip_type VARCHAR(20) CHECK (trip_type IN ('driving', 'walking', 'cycling', 'transit', 'unknown')),
    is_complete BOOLEAN DEFAULT false, -- Whether trip has ended
    metadata JSONB DEFAULT '{}', -- Additional flexible data
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driving events table - records specific risky driving behaviors
CREATE TABLE IF NOT EXISTS public.driving_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.personal_devices(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
        'hard_braking',
        'rapid_acceleration',
        'speeding',
        'harsh_turning',
        'phone_usage',
        'rapid_lane_change',
        'idle_timeout',
        'crash_detection'
    )),
    
    -- Location where event occurred
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    
    -- Event metrics
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    speed_kmh DECIMAL(6, 2), -- Speed at time of event
    acceleration_ms2 DECIMAL(8, 2), -- Acceleration/deceleration rate
    g_force DECIMAL(6, 3), -- G-force experienced (for crashes/hard braking)
    
    -- Context
    road_type VARCHAR(30), -- 'highway', 'city_street', 'residential', etc.
    weather_conditions VARCHAR(30), -- If available from external API
    time_of_day VARCHAR(20), -- 'morning', 'afternoon', 'evening', 'night'
    
    -- Additional data
    description TEXT,
    metadata JSONB DEFAULT '{}', -- Raw sensor data, additional context
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip waypoints table - stores detailed location points during a trip
CREATE TABLE IF NOT EXISTS public.trip_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    altitude DECIMAL(10, 2),
    
    -- Movement data
    speed_kmh DECIMAL(6, 2),
    heading DECIMAL(5, 2), -- Direction in degrees
    acceleration_ms2 DECIMAL(8, 2), -- Current acceleration
    
    -- Timestamp
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sequence_number INTEGER, -- Order of waypoint in trip
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_device_id ON public.trips(device_id);
CREATE INDEX IF NOT EXISTS idx_trips_started_at ON public.trips(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_is_complete ON public.trips(is_complete);

CREATE INDEX IF NOT EXISTS idx_driving_events_trip_id ON public.driving_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_driving_events_user_id ON public.driving_events(user_id);
CREATE INDEX IF NOT EXISTS idx_driving_events_device_id ON public.driving_events(device_id);
CREATE INDEX IF NOT EXISTS idx_driving_events_event_type ON public.driving_events(event_type);
CREATE INDEX IF NOT EXISTS idx_driving_events_recorded_at ON public.driving_events(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_trip_waypoints_trip_id ON public.trip_waypoints(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_recorded_at ON public.trip_waypoints(recorded_at);

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DECIMAL,
    lng1 DECIMAL,
    lat2 DECIMAL,
    lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    earth_radius DECIMAL := 6371000; -- Earth radius in meters
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := radians(lat2 - lat1);
    dlng := radians(lng2 - lng1);
    
    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlng/2) * sin(dlng/2);
    
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to detect if user is driving based on speed
CREATE OR REPLACE FUNCTION is_driving(speed_kmh DECIMAL) RETURNS BOOLEAN AS $$
BEGIN
    -- Consider driving if speed is above 15 km/h (walking/running is typically < 10 km/h)
    RETURN speed_kmh >= 15;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RLS Policies
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driving_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_waypoints ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trips
CREATE POLICY "Users can view their own trips"
    ON public.trips FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trips"
    ON public.trips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
    ON public.trips FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only see their own driving events
CREATE POLICY "Users can view their own driving events"
    ON public.driving_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own driving events"
    ON public.driving_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only see waypoints for their trips
CREATE POLICY "Users can view waypoints for their trips"
    ON public.trip_waypoints FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_waypoints.trip_id
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert waypoints for their trips"
    ON public.trip_waypoints FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trips
            WHERE trips.id = trip_waypoints.trip_id
            AND trips.user_id = auth.uid()
        )
    );

