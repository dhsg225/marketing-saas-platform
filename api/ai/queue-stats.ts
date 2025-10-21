// Vercel API endpoint for AI queue statistics
import { NextApiRequest, NextApiResponse } from 'next';
import { redisQueue } from '../../src/services/redisQueue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get queue statistics
    const stats = await redisQueue.getQueueStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting queue stats:', error);
    res.status(500).json({
      error: 'Failed to get queue statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
