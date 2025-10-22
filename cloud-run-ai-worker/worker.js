#!/usr/bin/env node

/**
 * Google Cloud Run Jobs - AI Worker
 * Processes AI jobs from Redis queue
 */

const { Redis } = require('@upstash/redis');
const OpenAI = require('openai');

// Initialize services
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('🤖 AI Worker starting...');

/**
 * Process a content generation job
 */
async function processContentGeneration(job) {
  try {
    console.log(`📝 Processing content generation job: ${job.id}`);
    
    const { prompt, parameters } = job;
    const { tone, length, style, targetAudience, platform } = parameters;
    
    // Build the OpenAI prompt
    let systemPrompt = `You are a professional content creator for ${platform || 'social media'}.`;
    
    if (tone) systemPrompt += ` Write in a ${tone} tone.`;
    if (length) systemPrompt += ` Keep it ${length}.`;
    if (style) systemPrompt += ` Use a ${style} style.`;
    if (targetAudience) systemPrompt += ` Target audience: ${targetAudience}.`;
    
    systemPrompt += `\n\nCreate engaging, high-quality content that drives engagement and conversions.`;
    
    // Generate content with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    const generatedContent = completion.choices[0].message.content;
    
    console.log(`✅ Content generated for job ${job.id}`);
    
    return {
      content: generatedContent,
      metadata: {
        model: "gpt-4",
        tokens: completion.usage.total_tokens,
        generatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`❌ Error processing content generation job ${job.id}:`, error);
    throw error;
  }
}

/**
 * Process a content optimization job
 */
async function processContentOptimization(job) {
  try {
    console.log(`🔧 Processing content optimization job: ${job.id}`);
    
    const { prompt, parameters } = job;
    const { originalContent, optimizationGoals } = parameters;
    
    const systemPrompt = `You are a content optimization expert. Optimize the following content based on these goals: ${optimizationGoals || 'improve engagement and readability'}.`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Original content: ${originalContent}\n\nOptimization request: ${prompt}` }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    const optimizedContent = completion.choices[0].message.content;
    
    console.log(`✅ Content optimized for job ${job.id}`);
    
    return {
      optimizedContent,
      originalContent,
      metadata: {
        model: "gpt-4",
        tokens: completion.usage.total_tokens,
        optimizedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`❌ Error processing content optimization job ${job.id}:`, error);
    throw error;
  }
}

/**
 * Main worker loop
 */
async function main() {
  console.log('🔄 Starting AI worker loop...');
  
  while (true) {
    try {
      // Get next job from queue
      const job = await redis.rpop('ai-jobs');
      
      if (!job) {
        console.log('⏳ No jobs in queue, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      const jobData = JSON.parse(job);
      console.log(`📋 Processing job: ${jobData.id} (${jobData.type})`);
      
      let result;
      
      // Process based on job type
      switch (jobData.type) {
        case 'content-generation':
          result = await processContentGeneration(jobData);
          break;
        case 'content-optimization':
          result = await processContentOptimization(jobData);
          break;
        default:
          throw new Error(`Unknown job type: ${jobData.type}`);
      }
      
      // Mark job as completed
      await redis.hset(`job:${jobData.id}`, {
        status: 'completed',
        result: JSON.stringify(result),
        completedAt: new Date().toISOString()
      });
      
      console.log(`✅ Job ${jobData.id} completed successfully`);
      
    } catch (error) {
      console.error('❌ Worker error:', error);
      
      // Mark job as failed if we have job data
      if (jobData && jobData.id) {
        await redis.hset(`job:${jobData.id}`, {
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the worker
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
