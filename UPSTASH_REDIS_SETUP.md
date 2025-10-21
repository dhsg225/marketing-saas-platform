# 🚀 Upstash Redis Setup Guide
## AI Job Queue for Marketing SaaS Platform

### 📋 **Step 1: Create Upstash Account**

1. **Go to**: [upstash.com](https://upstash.com)
2. **Sign up** with your GitHub account
3. **Click "Create Database"**
4. **Fill in details**:
   - **Database Name**: `marketing-saas-ai-queue`
   - **Region**: Choose closest to your users (e.g., Asia Pacific)
   - **Type**: **Redis** (not Redis Stack)
   - **Pricing Plan**: **Free tier** (10K requests/day)

### 📋 **Step 2: Get Connection Details**

After creating the database, copy these values:

- **REST URL**: `https://region.upstash.io`
- **REST Token**: `your_rest_token_here`

### 📋 **Step 3: Add Environment Variables to Vercel**

Go to your Vercel project settings and add:

```bash
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here
```

### 📋 **Step 4: Test the Setup**

You can test the Redis connection by calling:

```bash
# Test queue stats
curl https://your-vercel-domain.vercel.app/api/ai/queue-stats

# Expected response:
{
  "success": true,
  "stats": {
    "queued": 0,
    "processing": 0,
    "completed": 0,
    "failed": 0
  },
  "timestamp": "2025-01-21T12:00:00.000Z"
}
```

---

## 🎯 **How the AI Queue Works**

### **1. Job Submission (Frontend → Vercel)**
```javascript
// Frontend submits AI job
const response = await fetch('/api/ai/generate-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'project-123',
    userId: 'user-456',
    organizationId: 'org-789',
    prompt: 'Create a social media post about our new product',
    parameters: {
      tone: 'professional',
      length: 'short',
      platform: 'linkedin'
    },
    priority: 'high'
  })
});

const { jobId } = await response.json();
// jobId: "ai-job-1737465123456-abc123def"
```

### **2. Job Processing (Google Cloud Run Worker)**
```javascript
// Worker gets next job from queue
const job = await redisQueue.getNextJob();
if (job) {
  // Process with AI (OpenAI/Claude)
  const result = await generateContent(job.prompt, job.parameters);
  
  // Mark as completed
  await redisQueue.completeJob(job.id, result);
}
```

### **3. Status Checking (Frontend)**
```javascript
// Check job status
const response = await fetch(`/api/ai/job-status?jobId=${jobId}`);
const { status, result } = await response.json();

if (status === 'completed') {
  // Use the AI-generated content
  console.log(result);
}
```

---

## 💰 **Cost Breakdown**

| Feature | Free Tier | Limits |
|---------|-----------|--------|
| Requests | ✅ | 10,000/day |
| Data Transfer | ✅ | 1GB/month |
| Storage | ✅ | 256MB |
| **Total** | **$0/month** | **Perfect for development!** |

---

## 🔧 **API Endpoints Created**

### **POST /api/ai/generate-content**
- **Purpose**: Submit new AI content generation job
- **Returns**: `{ jobId, status: 'queued' }`
- **Response Time**: ~100ms (immediate)

### **GET /api/ai/job-status?jobId=xxx**
- **Purpose**: Check status of specific job
- **Returns**: `{ status, result?, error? }`
- **Response Time**: ~50ms

### **GET /api/ai/queue-stats**
- **Purpose**: Get overall queue statistics
- **Returns**: `{ queued, processing, completed, failed }`
- **Response Time**: ~50ms

---

## 🚀 **Next Steps**

1. **Set up Upstash Redis** (follow steps above)
2. **Add environment variables** to Vercel
3. **Deploy the API endpoints** to Vercel
4. **Test the queue system**
5. **Set up Google Cloud Run worker** (next step)

---

**Ready to create your Upstash Redis database?** 🚀
