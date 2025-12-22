-- Family Circles Schema for Life360-style location sharing
-- This extends the existing schema with family circle functionality

-- Family Circles table
CREATE TABLE IF NOT EXISTS public.family_circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Circle color for UI
    settings JSONB DEFAULT '{}' -- Circle-specific settings
);

-- Circle Members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.circle_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    location_sharing_enabled BOOLEAN DEFAULT true, -- Whether this member shares location in this circle
    UNIQUE(circle_id, user_id)
);

-- Circle Invitations table
CREATE TABLE IF NOT EXISTS public.circle_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    invitee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Set when user accepts
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    token VARCHAR(255) UNIQUE NOT NULL, -- Unique token for invitation link
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    message TEXT -- Optional invitation message
);

-- Places table (saved favorite places)
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID REFERENCES public.family_circles(id) ON DELETE CASCADE, -- Can be circle-specific or user-specific
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Owner of the place
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius INTEGER DEFAULT 100, -- Geofence radius in meters
    place_type VARCHAR(50) DEFAULT 'custom', -- 'home', 'work', 'school', 'custom', etc.
    icon VARCHAR(50) DEFAULT '📍', -- Icon for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Place Alerts table (arrival/departure alerts)
CREATE TABLE IF NOT EXISTS public.place_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who should receive alert
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('arrival', 'departure', 'both')),
    device_id UUID REFERENCES public.personal_devices(id) ON DELETE CASCADE, -- Which device to monitor (null = all user's devices)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Place Events table (logs when users arrive/leave places)
CREATE TABLE IF NOT EXISTS public.place_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.personal_devices(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('arrived', 'left')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_sent BOOLEAN DEFAULT false
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.personal_devices(id) ON DELETE CASCADE,
    circle_id UUID REFERENCES public.family_circles(id) ON DELETE CASCADE, -- Share with specific circle
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    message TEXT, -- Optional status message
    is_safe BOOLEAN DEFAULT true, -- "I'm safe" check-in
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON public.circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON public.circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_circle_id ON public.circle_invitations(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_token ON public.circle_invitations(token);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_status ON public.circle_invitations(status);
CREATE INDEX IF NOT EXISTS idx_places_circle_id ON public.places(circle_id);
CREATE INDEX IF NOT EXISTS idx_places_user_id ON public.places(user_id);
CREATE INDEX IF NOT EXISTS idx_place_alerts_user_id ON public.place_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_place_alerts_place_id ON public.place_alerts(place_id);
CREATE INDEX IF NOT EXISTS idx_place_events_place_id ON public.place_events(place_id);
CREATE INDEX IF NOT EXISTS idx_place_events_user_id ON public.place_events(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_circle_id ON public.check_ins(circle_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON public.check_ins(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.family_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_circles
CREATE POLICY "Users can view circles they belong to" ON public.family_circles
    FOR SELECT USING (
        id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can create circles" ON public.family_circles
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Circle admins can update circles" ON public.family_circles
    FOR UPDATE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
    );

-- RLS Policies for circle_members
CREATE POLICY "Users can view members of their circles" ON public.circle_members
    FOR SELECT USING (
        circle_id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Circle admins can add members" ON public.circle_members
    FOR INSERT WITH CHECK (
        circle_id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
    );

CREATE POLICY "Users can update their own membership" ON public.circle_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Circle admins can remove members" ON public.circle_members
    FOR DELETE USING (
        circle_id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
    );

-- RLS Policies for circle_invitations
CREATE POLICY "Users can view invitations for their circles" ON public.circle_invitations
    FOR SELECT USING (
        circle_id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND is_active = true
        ) OR
        invitee_user_id = auth.uid() OR
        invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Circle admins can create invitations" ON public.circle_invitations
    FOR INSERT WITH CHECK (
        circle_id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
    );

CREATE POLICY "Users can update their own invitations" ON public.circle_invitations
    FOR UPDATE USING (
        invitee_user_id = auth.uid() OR
        invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- RLS Policies for places
CREATE POLICY "Users can view places in their circles" ON public.places
    FOR SELECT USING (
        user_id = auth.uid() OR
        (circle_id IS NOT NULL AND circle_id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND is_active = true
        ))
    );

CREATE POLICY "Users can create places" ON public.places
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own places" ON public.places
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for place_alerts
CREATE POLICY "Users can view their own alerts" ON public.place_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create alerts for themselves" ON public.place_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON public.place_alerts
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for place_events
CREATE POLICY "Users can view events for their places" ON public.place_events
    FOR SELECT USING (
        user_id = auth.uid() OR
        place_id IN (
            SELECT id FROM public.places 
            WHERE circle_id IN (
                SELECT circle_id FROM public.circle_members 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "System can create place events" ON public.place_events
    FOR INSERT WITH CHECK (true);

-- RLS Policies for check_ins
CREATE POLICY "Users can view check-ins in their circles" ON public.check_ins
    FOR SELECT USING (
        user_id = auth.uid() OR
        circle_id IN (
            SELECT circle_id FROM public.circle_members 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can create their own check-ins" ON public.check_ins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_circle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_family_circles_updated_at 
    BEFORE UPDATE ON public.family_circles 
    FOR EACH ROW EXECUTE FUNCTION update_circle_updated_at();

CREATE TRIGGER update_places_updated_at 
    BEFORE UPDATE ON public.places 
    FOR EACH ROW EXECUTE FUNCTION update_circle_updated_at();

CREATE TRIGGER update_place_alerts_updated_at 
    BEFORE UPDATE ON public.place_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_circle_updated_at();

-- Function to automatically add circle creator as admin member
CREATE OR REPLACE FUNCTION add_circle_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.circle_members (circle_id, user_id, role, location_sharing_enabled)
    VALUES (NEW.id, NEW.created_by, 'admin', true)
    ON CONFLICT (circle_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_creator_to_circle
    AFTER INSERT ON public.family_circles
    FOR EACH ROW EXECUTE FUNCTION add_circle_creator_as_admin();

