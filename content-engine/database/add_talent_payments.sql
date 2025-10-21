-- Add talent_payments table for manual payment tracking
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_talent_payments_booking_id ON talent_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_talent_payments_status ON talent_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_talent_payments_created_at ON talent_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_talent_payments_escrow_release ON talent_payments(escrow_release_date);

-- Add trigger for updated_at
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

COMMIT;
