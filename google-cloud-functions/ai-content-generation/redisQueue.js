// Redis queue service for Google Cloud Functions
const Redis = require('redis');

// Create Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connect to Redis
redis.connect().catch(console.error);

// Redis queue implementation
const redisQueue = {
  async addJob(jobData) {
    try {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store job data
      await redis.hSet(`job:${jobId}`, {
        id: jobId,
        type: jobData.type,
        projectId: jobData.projectId,
        userId: jobData.userId,
        organizationId: jobData.organizationId,
        prompt: jobData.prompt,
        parameters: JSON.stringify(jobData.parameters),
        priority: jobData.priority,
        status: 'queued',
        createdAt: new Date().toISOString()
      });

      // Add to priority queue
      const priorityScore = jobData.priority === 'high' ? 1 : jobData.priority === 'medium' ? 2 : 3;
      await redis.zAdd('job_queue', { score: priorityScore, value: jobId });

      console.log(`✅ Job ${jobId} queued successfully`);
      return jobId;
    } catch (error) {
      console.error('❌ Error adding job to queue:', error);
      throw error;
    }
  },

  async getJobStatus(jobId) {
    try {
      const jobData = await redis.hGetAll(`job:${jobId}`);
      return jobData;
    } catch (error) {
      console.error('❌ Error getting job status:', error);
      throw error;
    }
  }
};

module.exports = { redisQueue };
