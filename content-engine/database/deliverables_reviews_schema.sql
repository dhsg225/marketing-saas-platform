-- [October 16, 2025] - Deliverables & Reviews Enhancement Schema
-- Purpose: Deliverable uploads and enhanced review system
-- Features: File uploads, review responses, rating calculations

-- =====================================================
-- DELIVERABLES SYSTEM
-- =====================================================

-- Booking deliverables
CREATE TABLE IF NOT EXISTS booking_deliverables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE CASCADE,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Deliverable info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (
        status IN ('pending_review', 'approved', 'rejected', 'revision_requested')
    ),
    
    -- Review feedback
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Version tracking
    version INTEGER DEFAULT 1,
    is_final BOOLEAN DEFAULT false,
    parent_deliverable_id UUID REFERENCES booking_deliverables(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review responses (talent can reply to reviews)
CREATE TABLE IF NOT EXISTS review_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES talent_reviews(id) ON DELETE CASCADE,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Response content
    response_text TEXT NOT NULL,
    
    -- Visibility
    is_public BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review helpful votes (clients can mark reviews as helpful)
CREATE TABLE IF NOT EXISTS review_helpful_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES talent_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Deliverable indexes
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_booking ON booking_deliverables(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_talent ON booking_deliverables(talent_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_status ON booking_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_created ON booking_deliverables(created_at);

-- Review response indexes
CREATE INDEX IF NOT EXISTS idx_review_responses_review ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_talent ON review_responses(talent_id);

-- Review helpful votes indexes
CREATE INDEX IF NOT EXISTS idx_review_helpful_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_user ON review_helpful_votes(user_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update deliverable updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_booking_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_deliverables_updated_at
    BEFORE UPDATE ON booking_deliverables
    FOR EACH ROW
    EXECUTE FUNCTION trigger_booking_deliverables_updated_at();

-- Update review response updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_review_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_responses_updated_at
    BEFORE UPDATE ON review_responses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_review_responses_updated_at();

-- Update talent profile rating when review is added/updated
CREATE OR REPLACE FUNCTION update_talent_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate average rating for the talent
    UPDATE talent_profiles
    SET 
        average_rating = (
            SELECT AVG(overall_rating)::DECIMAL(3,2)
            FROM talent_reviews
            WHERE talent_id = NEW.talent_id AND is_public = true
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM talent_reviews
            WHERE talent_id = NEW.talent_id AND is_public = true
        )
    WHERE id = NEW.talent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_talent_rating
    AFTER INSERT OR UPDATE ON talent_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_talent_rating();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Deliverables summary view
CREATE OR REPLACE VIEW deliverables_summary AS
SELECT 
    bd.id,
    bd.booking_id,
    bd.title,
    bd.file_name,
    bd.status,
    bd.version,
    bd.is_final,
    bd.created_at,
    tp.display_name as talent_name,
    tb.booking_date,
    cu.name as client_name
FROM booking_deliverables bd
JOIN talent_bookings tb ON bd.booking_id = tb.id
JOIN talent_profiles tp ON bd.talent_id = tp.id
JOIN users cu ON tb.client_user_id = cu.id;

-- Reviews with responses view
CREATE OR REPLACE VIEW reviews_with_responses AS
SELECT 
    tr.id as review_id,
    tr.booking_id,
    tr.overall_rating,
    tr.quality_rating,
    tr.professionalism_rating,
    tr.communication_rating,
    tr.value_rating,
    tr.review_title,
    tr.review_text,
    tr.is_public,
    tr.created_at as review_date,
    tp.display_name as talent_name,
    cu.name as client_name,
    rr.id as response_id,
    rr.response_text,
    rr.created_at as response_date,
    (SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = tr.id AND is_helpful = true) as helpful_count,
    (SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = tr.id AND is_helpful = false) as not_helpful_count
FROM talent_reviews tr
JOIN talent_profiles tp ON tr.talent_id = tp.id
JOIN users cu ON tr.reviewer_user_id = cu.id
LEFT JOIN review_responses rr ON tr.id = rr.review_id
WHERE tr.is_public = true;

COMMIT;
