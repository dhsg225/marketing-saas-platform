import { NextApiRequest, NextApiResponse } from 'next';
import { setCorsHeaders, handleCors } from './_utils/cors';

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

    // Simple test response
    res.json({
      success: true,
      message: 'Auth test endpoint working',
      data: {
        user: {
          id: 'test-user',
          email: email,
          name: 'Test User'
        },
        token: 'test-token-123'
      }
    });

  } catch (error) {
    console.error('❌ Auth test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
