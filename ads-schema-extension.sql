-- TagsTrackr Ads System Schema Extension
-- This schema adds the ad system tables and premium features to the existing TagsTrackr database

-- Add is_premium field to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Ads table (stores all available ads)
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT NOT NULL,
    page_context VARCHAR(50) NOT NULL CHECK (page_context IN ('dashboard', 'track', 'account', 'general')),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    max_daily_views INTEGER DEFAULT 1000,
    current_daily_views INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad views table (tracks when users view ads)
CREATE TABLE IF NOT EXISTS public.ad_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
    page_context VARCHAR(50) NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_click BOOLEAN DEFAULT false,
    session_id VARCHAR(255)
);

-- Ad credits table (tracks user earning and redemptions)
CREATE TABLE IF NOT EXISTS public.ad_credits (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    credit_balance DECIMAL(10, 2) DEFAULT 0.00,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    total_redeemed DECIMAL(10, 2) DEFAULT 0.00,
    last_redeemed TIMESTAMPTZ,
    daily_views_count INTEGER DEFAULT 0,
    last_view_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad redemptions table (tracks when users redeem credits)
CREATE TABLE IF NOT EXISTS public.ad_redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    redemption_type VARCHAR(50) NOT NULL CHECK (redemption_type IN ('tag_discount', 'premium_trial', 'cash_out')),
    amount DECIMAL(10, 2) NOT NULL,
    credit_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ads_page_context ON public.ads(page_context);
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON public.ads(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_priority ON public.ads(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ad_views_user_id ON public.ad_views(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_ad_id ON public.ad_views(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_viewed_at ON public.ad_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_ad_credits_user_id ON public.ad_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_redemptions_user_id ON public.ad_redemptions(user_id);

-- Enable RLS on new tables
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ads
CREATE POLICY "Anyone can view active ads" ON public.ads 
    FOR SELECT USING (is_active = true AND (end_date IS NULL OR end_date > NOW()));

-- RLS Policies for ad_views
CREATE POLICY "Users can view own ad views" ON public.ad_views 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ad views" ON public.ad_views 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ad_credits
CREATE POLICY "Users can view own ad credits" ON public.ad_credits 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own ad credits" ON public.ad_credits 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ad credits" ON public.ad_credits 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ad_redemptions
CREATE POLICY "Users can view own redemptions" ON public.ad_redemptions 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON public.ad_redemptions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at columns
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_credits_updated_at BEFORE UPDATE ON public.ad_credits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to process ad view and credit earning
CREATE OR REPLACE FUNCTION process_ad_view(
    p_user_id UUID,
    p_ad_id UUID,
    p_page_context VARCHAR(50),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_can_earn BOOLEAN := false;
    v_credit_amount DECIMAL(10, 2) := 0.01;
    v_daily_limit INTEGER := 5;
    v_current_daily_views INTEGER;
    v_result JSONB;
BEGIN
    -- Insert the ad view
    INSERT INTO public.ad_views (user_id, ad_id, page_context, ip_address, user_agent, session_id)
    VALUES (p_user_id, p_ad_id, p_page_context, p_ip_address, p_user_agent, p_session_id);
    
    -- Update ad total views count
    UPDATE public.ads 
    SET total_views = total_views + 1,
        current_daily_views = current_daily_views + 1
    WHERE id = p_ad_id;
    
    -- Check if user can earn credits (not premium and under daily limit)
    SELECT 
        NOT COALESCE(u.is_premium, false) AND 
        COALESCE(ac.daily_views_count, 0) < v_daily_limit AND
        (ac.last_view_date != CURRENT_DATE OR ac.last_view_date IS NULL)
    INTO v_can_earn
    FROM public.users u
    LEFT JOIN public.ad_credits ac ON ac.user_id = u.id
    WHERE u.id = p_user_id;
    
    -- If user can earn, update or create their credits
    IF v_can_earn THEN
        INSERT INTO public.ad_credits (user_id, credit_balance, total_earned, daily_views_count, last_view_date)
        VALUES (p_user_id, v_credit_amount, v_credit_amount, 1, CURRENT_DATE)
        ON CONFLICT (user_id) DO UPDATE SET
            credit_balance = ad_credits.credit_balance + v_credit_amount,
            total_earned = ad_credits.total_earned + v_credit_amount,
            daily_views_count = CASE 
                WHEN ad_credits.last_view_date = CURRENT_DATE 
                THEN ad_credits.daily_views_count + 1 
                ELSE 1 
            END,
            last_view_date = CURRENT_DATE,
            updated_at = NOW();
    END IF;
    
    -- Get current daily views count
    SELECT COALESCE(daily_views_count, 0) INTO v_current_daily_views
    FROM public.ad_credits 
    WHERE user_id = p_user_id;
    
    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'earned_credit', v_can_earn,
        'credit_amount', CASE WHEN v_can_earn THEN v_credit_amount ELSE 0 END,
        'daily_views_remaining', GREATEST(0, v_daily_limit - COALESCE(v_current_daily_views, 0))
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample ads
INSERT INTO public.ads (title, body, image_url, link_url, page_context, priority) VALUES
('Premium TagsTrackr', 'Upgrade to Premium for unlimited tracking, no ads, and priority support!', NULL, '/premium', 'dashboard', 100),
('GPS Tag Sale', 'Get 20% off your next GPS tag order. Limited time offer!', NULL, '/register-tag', 'dashboard', 90),
('Travel Insurance', 'Protect your luggage with comprehensive travel insurance. Get a quote today.', NULL, 'https://example-travel-insurance.com', 'track', 80),
('Lost & Found Service', 'Professional lost item recovery service. We help reunite you with your belongings.', NULL, 'https://example-recovery.com', 'track', 70),
('Smart Luggage', 'Upgrade to smart luggage with built-in GPS tracking and charging ports.', NULL, 'https://example-luggage.com', 'general', 60),
('Airport Lounge Access', 'Skip the wait with premium airport lounge access worldwide.', NULL, 'https://example-lounge.com', 'general', 50); 