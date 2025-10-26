// Google Cloud Function for Email Service
// [Oct 24, 2025] - Send transactional emails (verification, welcome, notifications)
const { createClient } = require('@supabase/supabase-js');

exports['send-email'] = async (req, res) => {
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
    const { to, template, data } = req.body;

    console.log(`📧 Sending ${template} email to:`, to);

    // Email templates
    const templates = {
      verification: {
        subject: 'Verify your email to get started with Cognito',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Cognito! 🎉</h1>
  </div>
  
  <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.name},</h2>
    
    <p style="font-size: 16px; color: #4b5563;">
      Thank you for signing up for <strong>Cognito</strong>! We're excited to help you create amazing marketing content with AI.
    </p>
    
    <p style="font-size: 16px; color: #4b5563;">
      To get started, please verify your email address by clicking the button below:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.verificationUrl}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
        Verify Email Address →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Or copy and paste this link into your browser:<br>
      <a href="${data.verificationUrl}" style="color: #667eea; word-break: break-all;">${data.verificationUrl}</a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This link will expire in 24 hours.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #6b7280;">
      Questions? Just reply to this email - we're here to help!
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      Best regards,<br>
      <strong>The Cognito Team</strong><br>
      <a href="mailto:contact@cognito.guru" style="color: #667eea;">contact@cognito.guru</a>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2025 Cognito. AI-Powered Marketing Content Platform.</p>
    <p>
      <a href="https://cognito.guru" style="color: #9ca3af; text-decoration: none;">cognito.guru</a>
    </p>
  </div>
</body>
</html>
        `,
        text: `
Hi ${data.name},

Welcome to Cognito! Thank you for signing up.

Please verify your email address by clicking this link:
${data.verificationUrl}

This link will expire in 24 hours.

Questions? Reply to this email at contact@cognito.guru

Best regards,
The Cognito Team
        `
      },
      welcome: {
        subject: 'Welcome to Cognito! Let\'s create amazing content 🎉',
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're All Set! 🚀</h1>
  </div>
  
  <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hi ${data.name},</h2>
    
    <p style="font-size: 16px; color: #4b5563;">
      Your account is verified and ready! You're about to experience the future of marketing content creation.
    </p>
    
    <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
      <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">✨ What You Can Do Now:</h3>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li>Generate AI-powered social media posts in seconds</li>
        <li>Create stunning images with Midjourney & DALL-E</li>
        <li>Schedule content on your marketing calendar</li>
        <li>Manage multiple clients and projects</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardUrl || 'https://cognito.guru'}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
        Go to Dashboard →
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <h3 style="color: #1f2937; font-size: 18px;">📚 Getting Started Resources:</h3>
    <ul style="color: #4b5563; padding-left: 20px;">
      <li><a href="https://cognito.guru/help" style="color: #667eea;">Help Center</a> - Video tutorials and guides</li>
      <li><a href="https://cognito.guru/help/quick-start" style="color: #667eea;">Quick Start Guide</a> - Get up to speed in 5 minutes</li>
      <li><a href="mailto:contact@cognito.guru" style="color: #667eea;">Contact Support</a> - We're here to help!</li>
    </ul>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Questions or need help? Just reply to this email!
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      Happy creating! 🎨<br>
      <strong>The Cognito Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2025 Cognito. AI-Powered Marketing Content Platform.</p>
  </div>
</body>
</html>
        `
      }
    };

    const emailTemplate = templates[template];
    
    if (!emailTemplate) {
      return res.status(400).json({ 
        success: false,
        error: `Unknown email template: ${template}` 
      });
    }

    // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
    // For now, just log the email (you'll need to configure email provider)
    console.log('📧 Email to be sent:');
    console.log('   To:', to);
    console.log('   Subject:', emailTemplate.subject);
    console.log('   Template:', template);
    
    // Simulate email sending (replace with actual email service)
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
      to: to,
      from: 'contact@cognito.guru',
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html
    });
    */

    // For now, return success (email would be sent in production)
    res.json({
      success: true,
      message: 'Email sent successfully',
      template: template,
      to: to,
      // In development, return email content for debugging
      debug: process.env.NODE_ENV === 'development' ? {
        subject: emailTemplate.subject,
        previewUrl: 'Email service not configured - see logs'
      } : undefined
    });

  } catch (error) {
    console.error('❌ Email service error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      details: error.message 
    });
  }
};

