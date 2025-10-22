import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handleCors } from './_utils/cors';

// Initialize Supabase client with fallback
let supabase: any = null;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
} catch (error) {
  console.warn('⚠️ Supabase client initialization failed:', error);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (handleCors(req, res)) return;
  
  // Set CORS headers for all responses
  setCorsHeaders(res);

  const { action } = req.query;
  const pathSegments = req.url?.split('/').filter(Boolean) || [];

  // Route based on URL path or action parameter
  if (pathSegments.includes('organizations')) {
    return handleOrganizations(req, res);
  } else if (pathSegments.includes('register')) {
    return handleRegister(req, res);
  } else if (pathSegments.includes('forgot-password')) {
    return handleForgotPassword(req, res);
  } else if (req.method === 'POST' || action === 'login') {
    return handleLogin(req, res);
  } else if (req.method === 'GET' || action === 'verify') {
    return handleVerify(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleLogin(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if JWT secret is configured
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn('⚠️ JWT_SECRET not configured, using fallback');
      // Use a fallback secret for development
      const fallbackSecret = 'dev-secret-key-change-in-production';
      
      // Create a mock user for development
      const user = {
        id: 'user-123',
        email: email,
        name: 'Demo User'
      };

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        fallbackSecret,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        data: {
          user,
          token
        }
      });
    }

    // Create a mock user for development
    const user = {
      id: 'user-123',
      email: email,
      name: 'Demo User'
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleVerify(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.warn('⚠️ JWT_SECRET not configured, using fallback');
      // Use fallback secret for development
      const fallbackSecret = 'dev-secret-key-change-in-production';
      
      try {
        const decoded = jwt.verify(token, fallbackSecret) as any;
        return res.json({
          success: true,
          user: {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name
          }
        });
      } catch (fallbackError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const decoded = jwt.verify(token, secret) as any;
    
    res.json({
      success: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      }
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function handleOrganizations(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Mock organizations data for now
    const organizations = [
      {
        id: 'org-1',
        name: 'Demo Organization',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: organizations
    });

  } catch (error) {
    console.error('❌ Organizations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleRegister(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Mock user registration for now
    const user = {
      id: `user-${Date.now()}`,
      email: email,
      name: name,
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        user,
        message: 'User registered successfully'
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleForgotPassword(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Mock password reset for now
    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

