import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handleCors } from './_utils/cors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (handleCors(req, res)) return;
  
  // Set CORS headers for all responses
  setCorsHeaders(res);

  const { action } = req.query;

  // POST /api/auth?action=login - Login
  // GET /api/auth?action=verify - Verify token
  // Default: POST = login, GET = verify

  if (req.method === 'POST' || action === 'login') {
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

    // For now, create a simple JWT token
    // In production, you'd verify credentials against Supabase Auth
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
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
      return res.status(500).json({ error: 'JWT secret not configured' });
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

