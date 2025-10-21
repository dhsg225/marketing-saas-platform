-- [October 16, 2025] - Payment System Schema
-- Purpose: Manual payments, escrow, and payout tracking
-- Features: Payment verification, escrow management, automated payouts

-- =====================================================
-- PAYMENT SYSTEM TABLES
-- =====================================================

-- Talent payments tracking
CREATE TABLE IF NOT EXISTS talent_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (payment_type IN ('manual', 'stripe', 'paypal', 'bank_transfer')),
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    stripe_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    talent_payout DECIMAL(10,2) NOT NULL,
    
    -- Payment status
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending_verification' CHECK (
        payment_status IN (
            'pending_verification', 'verified', 'released', 'failed', 'refunded'
        )
    ),
    
    -- Manual payment details
    payment_method VARCHAR(100), -- 'bank_transfer', 'check', 'cash', 'other'
    client_notes TEXT,
    
    -- Verification details
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Escrow management
    escrow_release_date TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    release_reason VARCHAR(100), -- 'delivery_completed', 'automatic_release', 'manual_release'
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Talent payouts tracking
CREATE TABLE IF NOT EXISTS talent_payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES talent_payments(id) ON DELETE CASCADE,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Payout details
    amount DECIMAL(10,2) NOT NULL,
    payout_method VARCHAR(50) NOT NULL DEFAULT 'manual_transfer' CHECK (
        payout_method IN ('manual_transfer', 'stripe_connect', 'paypal', 'bank_transfer')
    ),
    
    -- Payout status
    payout_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        payout_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    
    -- Processing details
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_notes TEXT,
    
    -- Bank details (encrypted)
    bank_account_encrypted TEXT,
    routing_number_encrypted TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment disputes
CREATE TABLE IF NOT EXISTS payment_disputes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES talent_payments(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE CASCADE,
    
    -- Dispute details
    dispute_type VARCHAR(50) NOT NULL CHECK (
        dispute_type IN ('payment_dispute', 'service_dispute', 'refund_request')
    ),
    dispute_reason TEXT NOT NULL,
    dispute_amount DECIMAL(10,2),
    
    -- Parties involved
    raised_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disputed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Dispute status
    dispute_status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (
        dispute_status IN ('open', 'under_review', 'resolved', 'closed')
    ),
    
    -- Resolution
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    resolution_amount DECIMAL(10,2),
    
    -- Metadata
    evidence_files JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform earnings tracking
CREATE TABLE IF NOT EXISTS platform_earnings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES talent_payments(id) ON DELETE CASCADE,
    
    -- Earnings details
    platform_fee DECIMAL(10,2) NOT NULL,
    stripe_fee DECIMAL(10,2) NOT NULL,
    net_platform_earnings DECIMAL(10,2) NOT NULL,
    
    -- Period tracking
    earnings_period DATE NOT NULL,
    earnings_month INTEGER NOT NULL,
    earnings_year INTEGER NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_talent_payments_booking_id ON talent_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_talent_payments_status ON talent_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_talent_payments_created_at ON talent_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_talent_payments_escrow_release ON talent_payments(escrow_release_date);

-- Payout indexes
CREATE INDEX IF NOT EXISTS idx_talent_payouts_talent_id ON talent_payouts(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_payouts_status ON talent_payouts(payout_status);
CREATE INDEX IF NOT EXISTS idx_talent_payouts_created_at ON talent_payouts(created_at);

-- Dispute indexes
CREATE INDEX IF NOT EXISTS idx_payment_disputes_payment_id ON payment_disputes(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(dispute_status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_raised_by ON payment_disputes(raised_by);

-- Platform earnings indexes
CREATE INDEX IF NOT EXISTS idx_platform_earnings_period ON platform_earnings(earnings_period);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_month_year ON platform_earnings(earnings_month, earnings_year);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update payment updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_talent_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_talent_payments_updated_at
    BEFORE UPDATE ON talent_payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_talent_payments_updated_at();

-- Update payout updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_talent_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_talent_payouts_updated_at
    BEFORE UPDATE ON talent_payouts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_talent_payouts_updated_at();

-- Update dispute updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_payment_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_disputes_updated_at
    BEFORE UPDATE ON payment_disputes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_payment_disputes_updated_at();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Payment summary view
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    tp.id,
    tp.booking_id,
    tp.payment_type,
    tp.amount,
    tp.platform_fee,
    tp.stripe_fee,
    tp.talent_payout,
    tp.payment_status,
    tp.escrow_release_date,
    tp.released_at,
    tb.booking_date,
    tprof.display_name as talent_name,
    cu.name as client_name,
    tp.created_at
FROM talent_payments tp
JOIN talent_bookings tb ON tp.booking_id = tb.id
JOIN talent_profiles tprof ON tb.talent_id = tprof.id
JOIN users cu ON tb.client_user_id = cu.id;

-- Talent earnings view
CREATE OR REPLACE VIEW talent_earnings_summary AS
SELECT 
    tprof.id as talent_profile_id,
    tprof.display_name,
    COUNT(tp.id) as total_payments,
    SUM(tp.talent_payout) as total_earnings,
    SUM(tp.platform_fee) as total_platform_fees,
    AVG(tp.talent_payout) as average_payout,
    COUNT(CASE WHEN tp.payment_status = 'released' THEN 1 END) as completed_payouts,
    COUNT(CASE WHEN tp.payment_status = 'verified' THEN 1 END) as pending_payouts,
    MAX(tp.released_at) as last_payout_date
FROM talent_profiles tprof
LEFT JOIN talent_bookings tb ON tprof.id = tb.talent_id
LEFT JOIN talent_payments tp ON tb.id = tp.booking_id
GROUP BY tprof.id, tprof.display_name;

-- Platform earnings view
CREATE OR REPLACE VIEW platform_earnings_summary AS
SELECT 
    DATE_TRUNC('month', tp.created_at) as earnings_month,
    COUNT(tp.id) as total_transactions,
    SUM(tp.amount) as total_volume,
    SUM(tp.platform_fee) as total_platform_fees,
    SUM(tp.stripe_fee) as total_stripe_fees,
    SUM(tp.platform_fee - tp.stripe_fee) as net_platform_earnings
FROM talent_payments tp
WHERE tp.payment_status = 'released'
GROUP BY DATE_TRUNC('month', tp.created_at)
ORDER BY earnings_month DESC;

COMMIT;
