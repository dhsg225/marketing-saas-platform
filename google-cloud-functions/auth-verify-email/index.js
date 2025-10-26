// Google Cloud Function for Email Verification
// [Oct 24, 2025] - Verify user email with token
const { createClient } = require('@supabase/supabase-js');

exports['auth-verify-email'] = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error' 
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get token from query params or body
    const token = req.query.token || req.body?.token;

    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'Verification token is required' 
      });
    }

    console.log('🔍 Verifying email token:', token.substring(0, 10) + '...');

    // Find user with this verification token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (userError || !user) {
      console.error('❌ Invalid or expired token');
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired verification link. Please request a new one.' 
      });
    }

    // Check if token has expired
    if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
      console.error('❌ Token expired for user:', user.email);
      return res.status(400).json({ 
        success: false,
        error: 'Verification link has expired. Please request a new one.',
        expired: true
      });
    }

    // Check if already verified
    if (user.email_verified) {
      console.log('ℹ️ Email already verified for:', user.email);
      
      // Generate auth token for automatic login
      const authToken = `token_${user.id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
      
      return res.json({ 
        success: true,
        message: 'Email already verified. Welcome back!',
        alreadyVerified: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.company_name,
          emailVerified: true,
          onboardingCompleted: user.onboarding_completed
        },
        token: authToken,
        nextStep: user.onboarding_completed ? 'dashboard' : 'onboarding'
      });
    }

    // Mark email as verified
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null, // Clear token after use
        verification_token_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update user:', updateError);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to verify email' 
      });
    }

    console.log(`✅ Email verified for: ${user.email}`);

    // Update verification record
    await supabase
      .from('email_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('token', token);

    // Log activity
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        activity_type: 'email_verified',
        activity_data: {
          email: user.email,
          verified_at: new Date().toISOString()
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    // Generate auth token for automatic login
    const authToken = `token_${user.id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;

    // Return success with auth token (auto-login after verification)
    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to Cognito!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
        emailVerified: true,
        onboardingCompleted: user.onboarding_completed || false,
        accountStatus: user.account_status,
        trialEndsAt: user.trial_ends_at
      },
      token: authToken,
      nextStep: user.onboarding_completed ? 'dashboard' : 'onboarding'
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

