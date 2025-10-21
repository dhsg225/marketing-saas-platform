-- [October 15, 2025] - Talent Marketplace Schema (Feature 5)
-- Purpose: Complete marketplace for booking photographers, videographers, and creative talent
-- Features: Stripe Connect payments, escrow, commissions, invoicing, tax docs, disputes

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- =====================================================
-- TALENT PROFILES & PORTFOLIO
-- =====================================================

-- Core talent profiles
CREATE TABLE IF NOT EXISTS talent_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- User linkage (talent can also be a regular user)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    business_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    
    -- Professional info
    talent_type VARCHAR(50) NOT NULL CHECK (talent_type IN ('photographer', 'videographer', 'copywriter', 'graphic_designer', 'social_media_manager', 'other')),
    bio TEXT,
    tagline VARCHAR(255), -- Short one-liner
    years_experience INTEGER,
    
    -- Location
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'USA',
    service_radius_miles INTEGER DEFAULT 25,
    willing_to_travel BOOLEAN DEFAULT false,
    
    -- Pricing
    hourly_rate DECIMAL(10,2),
    minimum_booking_hours INTEGER DEFAULT 2,
    base_rate DECIMAL(10,2), -- Flat rate for common services
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Profile media
    profile_image_url TEXT,
    cover_image_url TEXT,
    website_url TEXT,
    
    -- Social links
    instagram_handle VARCHAR(100),
    facebook_url TEXT,
    linkedin_url TEXT,
    
    -- Stripe integration
    stripe_account_id VARCHAR(255) UNIQUE, -- Connected account ID
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    stripe_charges_enabled BOOLEAN DEFAULT false,
    stripe_payouts_enabled BOOLEAN DEFAULT false,
    
    -- Tax info (encrypted)
    tax_id_encrypted TEXT, -- SSN or EIN (encrypted with pgcrypto)
    tax_classification VARCHAR(50) CHECK (tax_classification IN ('individual', 'sole_proprietor', 'llc', 'corporation', 's_corp')),
    w9_submitted BOOLEAN DEFAULT false,
    w9_submitted_date DATE,
    
    -- Status & verification
    profile_status VARCHAR(50) DEFAULT 'pending' CHECK (profile_status IN ('pending', 'active', 'suspended', 'inactive')),
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    
    -- Performance metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    response_time_hours DECIMAL(5,2), -- Average response time
    completion_rate DECIMAL(5,2), -- % of bookings completed
    
    -- Availability
    is_accepting_bookings BOOLEAN DEFAULT true,
    next_available_date DATE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio items (images/videos of past work)
CREATE TABLE IF NOT EXISTS talent_portfolios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Media info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('image', 'video', 'pdf')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Categorization
    project_type VARCHAR(100), -- e.g., "Wedding", "Product Photography", "Corporate Video"
    tags TEXT[], -- Array of tags for searchability
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services offered by talent
CREATE TABLE IF NOT EXISTS talent_services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Service details
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100), -- e.g., "Event Photography", "Video Editing"
    
    -- Pricing
    pricing_model VARCHAR(50) NOT NULL CHECK (pricing_model IN ('hourly', 'fixed', 'custom', 'package')),
    base_price DECIMAL(10,2),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    
    -- Package details (if applicable)
    package_includes JSONB, -- e.g., {"hours": 4, "edited_photos": 50, "prints": 10}
    
    -- Delivery
    typical_turnaround_days INTEGER,
    rush_available BOOLEAN DEFAULT false,
    rush_fee_percentage DECIMAL(5,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Talent availability calendar
CREATE TABLE IF NOT EXISTS talent_availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Date/time
    available_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_all_day BOOLEAN DEFAULT true,
    
    -- Status
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
    
    -- If booked, link to booking (no FK constraint to avoid circular reference)
    booking_id UUID,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate entries for same date/time
    UNIQUE(talent_id, available_date, start_time)
);

-- =====================================================
-- BOOKING SYSTEM
-- =====================================================

-- Main bookings table
CREATE TABLE IF NOT EXISTS talent_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Relationships
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL, -- For multi-tenant isolation
    booked_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES talent_services(id) ON DELETE SET NULL,
    
    -- Booking details
    booking_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "BK-2025-001234"
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dates
    requested_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_hours DECIMAL(5,2),
    
    -- Location
    location_address TEXT,
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    is_remote BOOLEAN DEFAULT false,
    
    -- Pricing
    quoted_price DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2), -- May differ after negotiation
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Platform fees
    platform_fee_percentage DECIMAL(5,2) DEFAULT 12.00,
    platform_fee_amount DECIMAL(10,2),
    stripe_fee_amount DECIMAL(10,2),
    talent_payout_amount DECIMAL(10,2),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',        -- Waiting for talent response
        'accepted',       -- Talent accepted, waiting for payment
        'paid',          -- Payment captured, waiting to start
        'in_progress',   -- Work is ongoing
        'review_pending', -- Deliverables submitted, waiting for client approval
        'completed',     -- Successfully completed
        'cancelled',     -- Cancelled before completion
        'declined',      -- Talent declined
        'disputed',      -- Dispute opened
        'refunded'       -- Payment refunded
    )),
    
    -- Status timestamps
    accepted_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Cancellation/dispute info
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2),
    
    -- Deliverables tracking
    expected_deliverables_count INTEGER,
    delivered_assets_count INTEGER DEFAULT 0,
    client_approved BOOLEAN DEFAULT false,
    client_approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Requirements
    special_requirements TEXT,
    deliverable_format VARCHAR(100), -- e.g., "RAW + JPEG", "4K Video"
    usage_rights VARCHAR(100), -- e.g., "Full commercial rights", "Social media only"
    
    -- Contract/agreement
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    contract_url TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generate unique booking numbers
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

-- Booking deliverables (links to assets table)
CREATE TABLE IF NOT EXISTS booking_deliverables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE CASCADE,
    
    -- Asset reference
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    
    -- Deliverable info
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    
    -- Status
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    
    -- Notes
    talent_notes TEXT,
    client_feedback TEXT,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PAYMENT SYSTEM
-- =====================================================

-- Payment records
CREATE TABLE IF NOT EXISTS booking_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE RESTRICT,
    
    -- Stripe IDs
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_charge_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255), -- Transfer to talent's connected account
    
    -- Amounts
    total_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    stripe_fee DECIMAL(10,2),
    talent_payout DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment status
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',
        'processing',
        'succeeded',
        'failed',
        'cancelled',
        'refunded',
        'partially_refunded'
    )),
    
    -- Escrow tracking
    funds_held_in_escrow BOOLEAN DEFAULT true,
    escrow_released_at TIMESTAMP WITH TIME ZONE,
    
    -- Refund info
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment method
    payment_method_type VARCHAR(50), -- 'card', 'bank_account'
    card_last4 VARCHAR(4),
    card_brand VARCHAR(50),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform fee tracking
CREATE TABLE IF NOT EXISTS platform_fees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES booking_payments(id) ON DELETE SET NULL,
    
    -- Fee details
    fee_amount DECIMAL(10,2) NOT NULL,
    fee_percentage DECIMAL(5,2) NOT NULL,
    booking_amount DECIMAL(10,2) NOT NULL,
    
    -- Status
    collected BOOLEAN DEFAULT false,
    collected_at TIMESTAMP WITH TIME ZONE,
    
    -- Accounting
    accounting_month VARCHAR(7), -- YYYY-MM format
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Talent payouts
CREATE TABLE IF NOT EXISTS talent_payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE RESTRICT,
    
    -- Stripe payout ID
    stripe_payout_id VARCHAR(255) UNIQUE,
    
    -- Payout details
    payout_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Related bookings (JSONB array of booking IDs)
    booking_ids JSONB NOT NULL,
    
    -- Status
    payout_status VARCHAR(50) DEFAULT 'pending' CHECK (payout_status IN (
        'pending',
        'in_transit',
        'paid',
        'failed',
        'cancelled'
    )),
    
    -- Timing
    scheduled_date DATE,
    paid_date DATE,
    arrival_date DATE, -- Expected arrival in bank account
    
    -- Failure info
    failure_reason TEXT,
    
    -- Bank info (last 4 digits only)
    bank_last4 VARCHAR(4),
    bank_name VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Talent earnings summary (for dashboard)
CREATE TABLE IF NOT EXISTS talent_earnings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Earnings summary
    total_earned_lifetime DECIMAL(12,2) DEFAULT 0.00,
    total_earned_this_year DECIMAL(12,2) DEFAULT 0.00,
    total_earned_this_month DECIMAL(12,2) DEFAULT 0.00,
    
    -- Pending/available
    pending_amount DECIMAL(12,2) DEFAULT 0.00, -- In escrow
    available_for_payout DECIMAL(12,2) DEFAULT 0.00,
    
    -- Completed bookings
    bookings_completed_lifetime INTEGER DEFAULT 0,
    bookings_completed_this_year INTEGER DEFAULT 0,
    bookings_completed_this_month INTEGER DEFAULT 0,
    
    -- Last updated
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(talent_id)
);

-- =====================================================
-- INVOICING
-- =====================================================

-- Invoice generation
CREATE TABLE IF NOT EXISTS talent_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE RESTRICT,
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "INV-2025-001234"
    invoice_date DATE NOT NULL,
    due_date DATE,
    
    -- Parties
    billed_to_organization_id UUID NOT NULL,
    billed_to_name VARCHAR(255) NOT NULL,
    billed_to_email VARCHAR(255),
    billed_to_address TEXT,
    
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE RESTRICT,
    talent_name VARCHAR(255) NOT NULL,
    
    -- Line items (JSONB array)
    line_items JSONB NOT NULL,
    /*
    Example:
    [
      {
        "description": "4 hours photography session",
        "quantity": 4,
        "unit_price": 150.00,
        "total": 600.00
      },
      {
        "description": "Photo editing (50 images)",
        "quantity": 1,
        "unit_price": 200.00,
        "total": 200.00
      }
    ]
    */
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment info
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    
    -- PDF generation
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    
    -- Notes
    notes TEXT,
    terms TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generate unique invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- =====================================================
-- MESSAGING SYSTEM
-- =====================================================

-- In-platform messaging
CREATE TABLE IF NOT EXISTS talent_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE CASCADE,
    
    -- Sender/receiver
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('client', 'talent', 'admin')),
    
    -- Message content
    message_text TEXT NOT NULL,
    
    -- Attachments
    has_attachments BOOLEAN DEFAULT false,
    attachment_urls TEXT[], -- Array of URLs
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- System messages (automated notifications)
    is_system_message BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REVIEWS & RATINGS
-- =====================================================

-- Reviews and ratings
CREATE TABLE IF NOT EXISTS talent_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE CASCADE,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    
    -- Reviewer
    reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255),
    
    -- Rating (1-5 stars)
    overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    
    -- Breakdown ratings
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    professionalism_rating INTEGER CHECK (professionalism_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
    
    -- Review text
    review_title VARCHAR(255),
    review_text TEXT,
    
    -- Status
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT true, -- Only clients who completed booking can review
    is_featured BOOLEAN DEFAULT false,
    
    -- Talent response
    talent_response TEXT,
    talent_responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    moderated_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one review per booking
    UNIQUE(booking_id)
);

-- =====================================================
-- DISPUTE RESOLUTION
-- =====================================================

-- Dispute management
CREATE TABLE IF NOT EXISTS talent_disputes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES talent_bookings(id) ON DELETE CASCADE,
    
    -- Dispute details
    dispute_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., "DSP-2025-001234"
    opened_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_by_role VARCHAR(50) NOT NULL CHECK (opened_by_role IN ('client', 'talent')),
    
    -- Issue
    dispute_reason VARCHAR(100) NOT NULL CHECK (dispute_reason IN (
        'work_not_delivered',
        'poor_quality',
        'missed_deadline',
        'scope_disagreement',
        'payment_issue',
        'communication_issue',
        'other'
    )),
    dispute_description TEXT NOT NULL,
    
    -- Evidence
    evidence_urls TEXT[], -- Screenshots, documents, etc.
    
    -- Status
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN (
        'open',
        'under_review',
        'awaiting_response',
        'resolved',
        'closed'
    )),
    
    -- Resolution
    resolution_outcome VARCHAR(50) CHECK (resolution_outcome IN (
        'refund_full',
        'refund_partial',
        'no_refund',
        'rework_required',
        'mutual_agreement'
    )),
    resolution_notes TEXT,
    refund_amount DECIMAL(10,2),
    
    -- Assigned admin
    assigned_to_admin_id UUID REFERENCES users(id),
    
    -- Timeline
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generate unique dispute numbers
CREATE SEQUENCE IF NOT EXISTS dispute_number_seq START 1;

-- Dispute responses/updates
CREATE TABLE IF NOT EXISTS dispute_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dispute_id UUID NOT NULL REFERENCES talent_disputes(id) ON DELETE CASCADE,
    
    -- Responder
    responder_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    responder_role VARCHAR(50) NOT NULL CHECK (responder_role IN ('client', 'talent', 'admin')),
    
    -- Response
    response_text TEXT NOT NULL,
    evidence_urls TEXT[],
    
    -- Admin actions
    is_admin_decision BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TAX DOCUMENTATION
-- =====================================================

-- Tax documents (1099-NEC forms)
CREATE TABLE IF NOT EXISTS tax_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE RESTRICT,
    
    -- Tax year
    tax_year INTEGER NOT NULL,
    
    -- Form type
    form_type VARCHAR(50) DEFAULT '1099-NEC' CHECK (form_type IN ('1099-NEC', '1099-K', 'W9')),
    
    -- Amounts
    total_earnings DECIMAL(12,2) NOT NULL,
    
    -- Tax info (from talent profile, cached here)
    recipient_name VARCHAR(255) NOT NULL,
    recipient_tax_id_last4 VARCHAR(4), -- Last 4 of SSN/EIN for verification
    recipient_address TEXT,
    
    -- Document generation
    pdf_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE,
    generated_by UUID REFERENCES users(id),
    
    -- Delivery
    sent_to_talent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_via VARCHAR(50), -- 'email', 'mail', 'portal'
    
    -- IRS filing
    filed_with_irs BOOLEAN DEFAULT false,
    filed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'filed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One form per talent per year
    UNIQUE(talent_id, tax_year, form_type)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Talent profiles
CREATE INDEX IF NOT EXISTS idx_talent_profiles_user ON talent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_status ON talent_profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_type ON talent_profiles(talent_type);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_location ON talent_profiles(city, state);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_stripe ON talent_profiles(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_rating ON talent_profiles(average_rating DESC);

-- Portfolios
CREATE INDEX IF NOT EXISTS idx_talent_portfolios_talent ON talent_portfolios(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_portfolios_featured ON talent_portfolios(is_featured, display_order);

-- Services
CREATE INDEX IF NOT EXISTS idx_talent_services_talent ON talent_services(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_services_active ON talent_services(is_active);

-- Availability
CREATE INDEX IF NOT EXISTS idx_talent_availability_talent_date ON talent_availability(talent_id, available_date);
CREATE INDEX IF NOT EXISTS idx_talent_availability_status ON talent_availability(status);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_talent_bookings_talent ON talent_bookings(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_bookings_project ON talent_bookings(project_id);
CREATE INDEX IF NOT EXISTS idx_talent_bookings_org ON talent_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_talent_bookings_user ON talent_bookings(booked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_talent_bookings_status ON talent_bookings(status);
CREATE INDEX IF NOT EXISTS idx_talent_bookings_date ON talent_bookings(requested_date);
CREATE INDEX IF NOT EXISTS idx_talent_bookings_number ON talent_bookings(booking_number);

-- Payments
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_status ON booking_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_booking_payments_stripe ON booking_payments(stripe_payment_intent_id);

-- Platform fees
CREATE INDEX IF NOT EXISTS idx_platform_fees_booking ON platform_fees(booking_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_month ON platform_fees(accounting_month);

-- Payouts
CREATE INDEX IF NOT EXISTS idx_talent_payouts_talent ON talent_payouts(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_payouts_status ON talent_payouts(payout_status);
CREATE INDEX IF NOT EXISTS idx_talent_payouts_date ON talent_payouts(scheduled_date);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_talent_invoices_booking ON talent_invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_talent_invoices_number ON talent_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_talent_invoices_talent ON talent_invoices(talent_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_talent_messages_booking ON talent_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_talent_messages_sender ON talent_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_talent_messages_created ON talent_messages(created_at DESC);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_talent_reviews_talent ON talent_reviews(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_reviews_booking ON talent_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_talent_reviews_public ON talent_reviews(is_public, created_at DESC);

-- Disputes
CREATE INDEX IF NOT EXISTS idx_talent_disputes_booking ON talent_disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_talent_disputes_status ON talent_disputes(status);
CREATE INDEX IF NOT EXISTS idx_talent_disputes_assigned ON talent_disputes(assigned_to_admin_id);

-- Tax documents
CREATE INDEX IF NOT EXISTS idx_tax_documents_talent ON tax_documents(talent_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_year ON tax_documents(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_documents_status ON tax_documents(status);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_talent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER trigger_talent_profiles_updated_at BEFORE UPDATE ON talent_profiles FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_portfolios_updated_at BEFORE UPDATE ON talent_portfolios FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_services_updated_at BEFORE UPDATE ON talent_services FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_availability_updated_at BEFORE UPDATE ON talent_availability FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_bookings_updated_at BEFORE UPDATE ON talent_bookings FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_booking_payments_updated_at BEFORE UPDATE ON booking_payments FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_earnings_updated_at BEFORE UPDATE ON talent_earnings FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_invoices_updated_at BEFORE UPDATE ON talent_invoices FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_reviews_updated_at BEFORE UPDATE ON talent_reviews FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_disputes_updated_at BEFORE UPDATE ON talent_disputes FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_tax_documents_updated_at BEFORE UPDATE ON tax_documents FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trigger_talent_payouts_updated_at BEFORE UPDATE ON talent_payouts FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();

-- Generate booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_number = 'BK-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('booking_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_booking_number 
    BEFORE INSERT ON talent_bookings 
    FOR EACH ROW 
    WHEN (NEW.booking_number IS NULL)
    EXECUTE FUNCTION generate_booking_number();

-- Generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_invoice_number 
    BEFORE INSERT ON talent_invoices 
    FOR EACH ROW 
    WHEN (NEW.invoice_number IS NULL)
    EXECUTE FUNCTION generate_invoice_number();

-- Generate dispute numbers
CREATE OR REPLACE FUNCTION generate_dispute_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dispute_number = 'DSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('dispute_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_dispute_number 
    BEFORE INSERT ON talent_disputes 
    FOR EACH ROW 
    WHEN (NEW.dispute_number IS NULL)
    EXECUTE FUNCTION generate_dispute_number();

-- Update talent profile stats when review is added
CREATE OR REPLACE FUNCTION update_talent_stats_from_review()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE talent_profiles
    SET 
        total_reviews = total_reviews + 1,
        average_rating = (
            SELECT AVG(overall_rating)::DECIMAL(3,2)
            FROM talent_reviews
            WHERE talent_id = NEW.talent_id AND is_public = true
        ),
        updated_at = NOW()
    WHERE id = NEW.talent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_talent_stats_from_review
    AFTER INSERT ON talent_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_talent_stats_from_review();

-- Update talent booking count when booking is completed
CREATE OR REPLACE FUNCTION update_talent_booking_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE talent_profiles
        SET 
            total_bookings = total_bookings + 1,
            completed_bookings = completed_bookings + 1,
            completion_rate = (
                CASE 
                    WHEN total_bookings > 0 
                    THEN (completed_bookings::DECIMAL / total_bookings::DECIMAL * 100)
                    ELSE 0
                END
            ),
            updated_at = NOW()
        WHERE id = NEW.talent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_talent_booking_count
    AFTER UPDATE ON talent_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_talent_booking_count();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE talent_profiles IS 'Core talent profiles with Stripe Connect integration';
COMMENT ON TABLE talent_bookings IS 'Main booking system with escrow payment workflow';
COMMENT ON TABLE booking_payments IS 'Stripe payment tracking with platform fees';
COMMENT ON TABLE talent_earnings IS 'Denormalized earnings summary for talent dashboard';
COMMENT ON TABLE talent_invoices IS 'Auto-generated invoices for completed bookings';
COMMENT ON TABLE tax_documents IS '1099-NEC tax forms for talent earning $600+/year';
COMMENT ON TABLE talent_disputes IS 'Dispute resolution workflow with admin assignment';

-- Schema complete

