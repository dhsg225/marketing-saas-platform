// Vercel API endpoint for checking AI job status
import { NextApiRequest, NextApiResponse } from 'next';
import { redisQueue } from '../../src/services/redisQueue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid jobId parameter'
      });
    }

    // Get job status from Redis
    const jobStatus = await redisQueue.getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found',
        jobId
      });
    }

    res.json({
      success: true,
      jobId,
      ...jobStatus
    });

  } catch (error) {
    console.error('❌ Error getting job status:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
