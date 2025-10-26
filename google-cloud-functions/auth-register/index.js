// Google Cloud Function for User Registration
// [Oct 24, 2025] - Self-service B2B registration with email verification
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

exports['auth-register'] = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
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

    // Parse request body
    const { email, password, companyName, fullName } = req.body;

    console.log('📝 Registration request for:', email, companyName);

    // Validate required fields
    if (!email || !password || !companyName) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: email, password, and companyName are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 8 characters long' 
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email)
      .single();

    if (existingUser) {
      if (existingUser.email_verified) {
        return res.status(400).json({ 
          success: false,
          error: 'An account with this email already exists. Please sign in instead.' 
        });
      } else {
        // User exists but email not verified - allow re-registration (update user)
        console.log('⚠️ User exists but not verified, allowing re-registration');
      }
    }

    // Hash password (simple hash - in production use bcrypt)
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate user ID
    const userId = crypto.randomUUID();

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create or update user
    let user;
    if (existingUser) {
      // Update existing unverified user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          company_name: companyName,
          name: fullName || companyName,
          verification_token: verificationToken,
          verification_token_expires: verificationExpires.toISOString(),
          account_status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to update user account' 
        });
      }

      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          password: hashedPassword,
          name: fullName || companyName,
          company_name: companyName,
          email_verified: false,
          verification_token: verificationToken,
          verification_token_expires: verificationExpires.toISOString(),
          onboarding_completed: false,
          onboarding_step: 'not_started',
          account_status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
          login_count: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating user:', createError);
        
        if (createError.code === '23505') { // Unique constraint violation
          return res.status(400).json({ 
            success: false,
            error: 'An account with this email already exists' 
          });
        }

        return res.status(500).json({ 
          success: false,
          error: 'Failed to create user account',
          details: createError.message 
        });
      }

      user = newUser;
    }

    console.log(`✅ User created/updated: ${user.id} (${user.email})`);

    // Create email verification record
    const { error: verificationError } = await supabase
      .from('email_verifications')
      .insert({
        user_id: user.id,
        email: email,
        token: verificationToken,
        expires_at: verificationExpires.toISOString(),
        ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    if (verificationError) {
      console.error('⚠️ Failed to create verification record:', verificationError);
      // Non-critical, continue
    }

    // Create default organization for the user
    const organizationId = crypto.randomUUID();
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: organizationId,
        name: companyName,
        created_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orgError) {
      console.error('⚠️ Failed to create organization:', orgError);
      // Non-critical for registration, can be created during onboarding
    } else {
      console.log(`✅ Organization created: ${organization.id}`);

      // Link user to organization
      await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          role: 'owner',
          created_at: new Date().toISOString()
        });

      console.log(`✅ User linked to organization`);
    }

    // Create onboarding progress record
    await supabase
      .from('onboarding_progress')
      .insert({
        user_id: user.id,
        current_step: 1,
        step_1_welcome: false,
        data: {
          company_name: companyName,
          full_name: fullName
        }
      });

    // Log activity
    await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        activity_type: 'user_registered',
        activity_data: {
          email: email,
          company_name: companyName,
          registration_method: 'self_service'
        },
        ip_address: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    // Send verification email (will be implemented in separate GCF)
    try {
      const verificationUrl = `${req.headers.origin || 'https://cognito.guru'}/verify-email?token=${verificationToken}`;
      
      // Call email service
      const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'https://us-central1-marketing-saas-ai.cloudfunctions.net/send-email';
      
      await fetch(emailServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          template: 'verification',
          data: {
            name: fullName || companyName,
            verificationUrl: verificationUrl,
            companyName: companyName
          }
        })
      });

      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Return success response (don't return sensitive data)
    res.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        companyName: user.company_name,
        emailVerified: false,
        trialEndsAt: user.trial_ends_at
      },
      nextStep: 'email_verification',
      verificationEmailSent: true
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

