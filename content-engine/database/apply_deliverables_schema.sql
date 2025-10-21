-- Just the tables first
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

CREATE TABLE IF NOT EXISTS review_helpful_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES talent_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

COMMIT;
