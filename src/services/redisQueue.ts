// Redis Queue Service for AI Job Processing
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface AIJob {
  id: string;
  type: 'content-generation' | 'image-generation' | 'content-optimization';
  projectId: string;
  userId: string;
  organizationId: string;
  prompt: string;
  parameters: {
    tone?: string;
    length?: string;
    style?: string;
    targetAudience?: string;
    platform?: string;
  };
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class RedisQueueService {
  private readonly QUEUE_NAME = 'ai-jobs';
  private readonly PROCESSING_QUEUE = 'ai-jobs-processing';
  private readonly COMPLETED_QUEUE = 'ai-jobs-completed';
  private readonly FAILED_QUEUE = 'ai-jobs-failed';

  /**
   * Add a new AI job to the queue
   */
  async addJob(job: Omit<AIJob, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const jobId = `ai-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullJob: AIJob = {
      ...job,
      id: jobId,
      createdAt: new Date().toISOString(),
      status: 'queued'
    };

    // Add to main queue
    await redis.lpush(this.QUEUE_NAME, JSON.stringify(fullJob));
    
    // Set job status in Redis for tracking
    await redis.hset(`job:${jobId}`, {
      status: 'queued',
      createdAt: fullJob.createdAt,
      type: job.type
    });

    console.log(`✅ AI job ${jobId} added to queue`);
    return jobId;
  }

  /**
   * Get the next job from the queue (for workers)
   */
  async getNextJob(): Promise<AIJob | null> {
    try {
      // Use blocking pop to wait for jobs
      const result = await redis.brpop(this.QUEUE_NAME, 10); // Wait up to 10 seconds
      
      if (!result || !result[1]) {
        return null;
      }

      const job: AIJob = JSON.parse(result[1]);
      
      // Move to processing queue
      await redis.lpush(this.PROCESSING_QUEUE, JSON.stringify(job));
      
      // Update job status
      await redis.hset(`job:${job.id}`, {
        status: 'processing',
        startedAt: new Date().toISOString()
      });

      console.log(`🔄 Processing AI job ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Error getting next job:', error);
      return null;
    }
  }

  /**
   * Mark a job as completed
   */
  async completeJob(jobId: string, result: any): Promise<void> {
    const jobData = await redis.hgetall(`job:${jobId}`);
    if (!jobData) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job with result
    const updatedJob = {
      ...JSON.parse(await redis.lindex(this.PROCESSING_QUEUE, 0) || '{}'),
      status: 'completed' as const,
      result,
      completedAt: new Date().toISOString()
    };

    // Move to completed queue
    await redis.lpush(this.COMPLETED_QUEUE, JSON.stringify(updatedJob));
    
    // Remove from processing queue
    await redis.lrem(this.PROCESSING_QUEUE, 1, JSON.stringify(updatedJob));
    
    // Update job status
    await redis.hset(`job:${jobId}`, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });

    console.log(`✅ AI job ${jobId} completed`);
  }

  /**
   * Mark a job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    const jobData = await redis.hgetall(`job:${jobId}`);
    if (!jobData) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update job with error
    const failedJob = {
      ...JSON.parse(await redis.lindex(this.PROCESSING_QUEUE, 0) || '{}'),
      status: 'failed' as const,
      error,
      failedAt: new Date().toISOString()
    };

    // Move to failed queue
    await redis.lpush(this.FAILED_QUEUE, JSON.stringify(failedJob));
    
    // Remove from processing queue
    await redis.lrem(this.PROCESSING_QUEUE, 1, JSON.stringify(failedJob));
    
    // Update job status
    await redis.hset(`job:${jobId}`, {
      status: 'failed',
      error,
      failedAt: new Date().toISOString()
    });

    console.log(`❌ AI job ${jobId} failed: ${error}`);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    createdAt?: string;
    startedAt?: string;
    completedAt?: string;
    failedAt?: string;
    error?: string;
  } | null> {
    const jobData = await redis.hgetall(`job:${jobId}`);
    return jobData || null;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [queued, processing, completed, failed] = await Promise.all([
      redis.llen(this.QUEUE_NAME),
      redis.llen(this.PROCESSING_QUEUE),
      redis.llen(this.COMPLETED_QUEUE),
      redis.llen(this.FAILED_QUEUE)
    ]);

    return { queued, processing, completed, failed };
  }

  /**
   * Clean up old completed jobs (keep last 100)
   */
  async cleanupOldJobs(): Promise<void> {
    await redis.ltrim(this.COMPLETED_QUEUE, 0, 99);
    await redis.ltrim(this.FAILED_QUEUE, 0, 99);
    console.log('🧹 Cleaned up old completed jobs');
  }
}

// Export singleton instance
export const redisQueue = new RedisQueueService();
