import { NextApiRequest, NextApiResponse } from 'next';
import { redisQueue } from '../../src/services/redisQueue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      projectId,
      userId,
      organizationId,
      prompt,
      parameters = {},
      priority = 'medium'
    } = req.body;

    // Validate required fields
    if (!projectId || !userId || !organizationId || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, userId, organizationId, prompt'
      });
    }

    // Add job to Redis queue
    const jobId = await redisQueue.addJob({
      type: 'content-generation',
      projectId,
      userId,
      organizationId,
      prompt,
      parameters,
      priority
    });

    // Return immediately with job ID
    res.status(202).json({
      success: true,
      jobId,
      message: 'Content generation job queued successfully',
      status: 'queued'
    });

  } catch (error) {
    console.error('❌ Content generation error:', error);
    res.status(500).json({
      error: 'Failed to queue content generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
