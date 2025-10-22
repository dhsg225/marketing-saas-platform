import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handleCors } from '../_utils/cors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (handleCors(req, res)) return;
  
  // Set CORS headers for all responses
  setCorsHeaders(res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
