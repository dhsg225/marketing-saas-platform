-- ============================================================================
-- Self-Service B2B Onboarding System - Database Schema
-- ============================================================================
-- Purpose: Add onboarding and email verification fields to support self-service registration
-- Created: October 24, 2025
-- ============================================================================

-- ============================================================================
-- Step 1: Update users table with onboarding fields
-- ============================================================================

-- Add onboarding tracking fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'not_started';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- Add business profile fields (collected during onboarding)
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS use_case TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add password reset fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Add account status fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- ============================================================================
-- Step 2: Create email verification logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Step 3: Create onboarding progress tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  step_1_welcome BOOLEAN DEFAULT FALSE,
  step_2_business_info BOOLEAN DEFAULT FALSE,
  step_3_client_setup BOOLEAN DEFAULT FALSE,
  step_4_project_setup BOOLEAN DEFAULT FALSE,
  step_5_brand_setup BOOLEAN DEFAULT FALSE,
  step_6_sample_content BOOLEAN DEFAULT FALSE,
  step_7_completion BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  abandoned BOOLEAN DEFAULT FALSE,
  abandoned_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Step 4: Create user activity log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Email verification lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token) 
  WHERE verified = false;
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at) 
  WHERE verified = false;

-- Onboarding progress lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed ON onboarding_progress(step_7_completion);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_abandoned ON onboarding_progress(abandoned) 
  WHERE abandoned = true;

-- User activity lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_org ON user_activity_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_log(activity_type, created_at DESC);

-- User table lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) 
  WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_trial_ends ON users(trial_ends_at) 
  WHERE account_status = 'trial';

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Email verifications: Users can view their own
CREATE POLICY "Users can view own email verifications" 
  ON email_verifications
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can manage verifications
CREATE POLICY "Service role can manage email verifications" 
  ON email_verifications
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Onboarding progress: Users can view and update their own
CREATE POLICY "Users can view own onboarding progress" 
  ON onboarding_progress
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress" 
  ON onboarding_progress
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Service role can manage onboarding progress
CREATE POLICY "Service role can manage onboarding progress" 
  ON onboarding_progress
  FOR ALL 
  USING (auth.role() = 'service_role');

-- User activity: Users can view their own
CREATE POLICY "Users can view own activity" 
  ON user_activity_log
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can insert activity logs
CREATE POLICY "Service role can insert activity logs" 
  ON user_activity_log
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update onboarding_progress.updated_at automatically
CREATE OR REPLACE FUNCTION update_onboarding_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_progress_timestamp
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_timestamp();

-- Mark onboarding as abandoned if not completed within 7 days
CREATE OR REPLACE FUNCTION mark_abandoned_onboarding()
RETURNS void AS $$
BEGIN
  UPDATE onboarding_progress
  SET 
    abandoned = true,
    abandoned_at = NOW()
  WHERE 
    step_7_completion = false 
    AND abandoned = false
    AND started_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Clean up expired verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications
  WHERE verified = false
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helpful Views for Analytics
-- ============================================================================

-- View: Onboarding funnel metrics
CREATE OR REPLACE VIEW v_onboarding_funnel AS
SELECT 
  COUNT(*) FILTER (WHERE step_1_welcome) as completed_step_1,
  COUNT(*) FILTER (WHERE step_2_business_info) as completed_step_2,
  COUNT(*) FILTER (WHERE step_3_client_setup) as completed_step_3,
  COUNT(*) FILTER (WHERE step_4_project_setup) as completed_step_4,
  COUNT(*) FILTER (WHERE step_5_brand_setup) as completed_step_5,
  COUNT(*) FILTER (WHERE step_6_sample_content) as completed_step_6,
  COUNT(*) FILTER (WHERE step_7_completion) as completed_step_7,
  COUNT(*) FILTER (WHERE abandoned) as abandoned_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60)::NUMERIC, 2) as avg_completion_time_minutes
FROM onboarding_progress;

-- View: User registration metrics
CREATE OR REPLACE VIEW v_user_registration_metrics AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE email_verified) as verified_users,
  COUNT(*) FILTER (WHERE onboarding_completed) as onboarded_users,
  COUNT(*) FILTER (WHERE account_status = 'trial') as trial_users,
  COUNT(*) FILTER (WHERE account_status = 'active') as active_users,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_signups,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - 7) as week_signups,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - 30) as month_signups
FROM users;

-- View: User engagement metrics
CREATE OR REPLACE VIEW v_user_engagement AS
SELECT 
  u.id,
  u.email,
  u.company_name,
  u.email_verified,
  u.onboarding_completed,
  u.account_status,
  u.created_at as registered_at,
  u.last_login_at,
  u.login_count,
  EXTRACT(DAYS FROM (NOW() - u.created_at)) as days_since_registration,
  EXTRACT(DAYS FROM (NOW() - u.last_login_at)) as days_since_last_login,
  op.current_step as onboarding_current_step,
  op.abandoned as onboarding_abandoned,
  COUNT(DISTINCT c.id) as client_count,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT ci.id) as content_ideas_count
FROM users u
LEFT JOIN onboarding_progress op ON u.id = op.user_id
LEFT JOIN user_organizations uo ON u.id = uo.user_id
LEFT JOIN organizations o ON uo.organization_id = o.id
LEFT JOIN clients c ON o.id = c.organization_id
LEFT JOIN projects p ON c.id = p.client_id
LEFT JOIN content_ideas ci ON p.id = ci.project_id
GROUP BY u.id, u.email, u.company_name, u.email_verified, u.onboarding_completed, 
         u.account_status, u.created_at, u.last_login_at, u.login_count,
         op.current_step, op.abandoned;

-- ============================================================================
-- Set trial period for new users (14 days default)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_trial_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Set trial period if account_status is 'trial' and trial_ends_at is not set
  IF NEW.account_status = 'trial' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at = NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_trial_period
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_period();

-- ============================================================================
-- Update existing users (backward compatibility)
-- ============================================================================

-- Mark existing users as already onboarded (so they don't see wizard)
UPDATE users 
SET 
  email_verified = true,
  onboarding_completed = true,
  onboarding_step = 'completed',
  account_status = 'active'
WHERE email_verified IS NULL OR onboarding_completed IS NULL;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT ON v_onboarding_funnel TO authenticated;
GRANT SELECT ON v_user_registration_metrics TO authenticated;
GRANT SELECT ON v_user_engagement TO authenticated;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.verification_token IS 'Token sent in verification email';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed onboarding wizard';
COMMENT ON COLUMN users.onboarding_step IS 'Current step in onboarding: not_started, in_progress, completed, skipped';
COMMENT ON COLUMN users.onboarding_data IS 'JSON data collected during onboarding (industry, company size, etc.)';
COMMENT ON COLUMN users.account_status IS 'Account status: trial, active, cancelled, expired';
COMMENT ON COLUMN users.trial_ends_at IS 'When trial period ends (14 days from registration)';

COMMENT ON TABLE email_verifications IS 'Email verification tokens and history';
COMMENT ON TABLE onboarding_progress IS 'Detailed tracking of user onboarding wizard progress';
COMMENT ON TABLE user_activity_log IS 'Log of all user activities for analytics and support';

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
DECLARE
  user_count INTEGER;
  verified_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO verified_count FROM users WHERE email_verified = true;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Onboarding System Schema Applied!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 Tables Updated:';
  RAISE NOTICE '   - users (added 15 new columns)';
  RAISE NOTICE '   - email_verifications (new table)';
  RAISE NOTICE '   - onboarding_progress (new table)';
  RAISE NOTICE '   - user_activity_log (new table)';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📈 Views Created:';
  RAISE NOTICE '   - v_onboarding_funnel';
  RAISE NOTICE '   - v_user_registration_metrics';
  RAISE NOTICE '   - v_user_engagement';
  RAISE NOTICE '============================================';
  RAISE NOTICE '👥 Current Users:';
  RAISE NOTICE '   Total: %', user_count;
  RAISE NOTICE '   Verified: %', verified_count;
  RAISE NOTICE '   (Existing users marked as verified/onboarded)';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Create auth/register GCF';
  RAISE NOTICE '   2. Create email verification GCF';
  RAISE NOTICE '   3. Build SignUp component';
  RAISE NOTICE '   4. Build OnboardingWizard component';
  RAISE NOTICE '============================================';
END $$;

