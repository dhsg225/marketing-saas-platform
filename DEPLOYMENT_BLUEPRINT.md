# 🚀 Zero-Cost Deployment Blueprint
## Marketing SaaS Platform → Cloud Architecture

### 📊 Current State Analysis
- **Frontend**: React app (ready for Vercel)
- **Backend**: Node.js API (ready for Vercel Functions)
- **Database**: PostgreSQL (ready for Supabase)
- **AI**: Content generation (needs async processing)
- **Files**: Asset management (needs CDN)

---

## 🎯 Phase 1: Vercel + Supabase Foundation

### Step 1.1: Vercel Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Initialize project
vercel init

# Configure vercel.json
{
  "functions": {
    "content-engine/backend/routes/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/content-engine/backend/routes/$1" }
  ]
}
```

### Step 1.2: Supabase Migration
```sql
-- Enable RLS on all tenant tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Add tenant_id columns
ALTER TABLE projects ADD COLUMN tenant_id UUID;
ALTER TABLE content_ideas ADD COLUMN tenant_id UUID;
ALTER TABLE posts ADD COLUMN tenant_id UUID;

-- Create RLS policies
CREATE POLICY tenant_isolation_projects ON projects 
FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_content_ideas ON content_ideas 
FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_posts ON posts 
FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));
```

---

## 🔄 Phase 2: Async AI Pipeline

### Step 2.1: Redis Queue Setup (Upstash)
```javascript
// content-engine/backend/utils/queue.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const queueAIJob = async (jobData) => {
  const jobId = `ai-job-${Date.now()}-${Math.random()}`;
  await redis.lpush('ai-jobs', JSON.stringify({
    id: jobId,
    ...jobData,
    createdAt: new Date().toISOString()
  }));
  return jobId;
};
```

### Step 2.2: Vercel AI Endpoint
```javascript
// content-engine/backend/routes/ai-generate.js
import { queueAIJob } from '../utils/queue.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const jobId = await queueAIJob({
      type: 'content-generation',
      projectId: req.body.projectId,
      prompt: req.body.prompt,
      userId: req.user.userId
    });

    res.status(202).json({ 
      success: true, 
      jobId,
      message: 'AI job queued successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Step 2.3: Google Cloud Run Worker
```dockerfile
# Dockerfile for AI worker
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "worker.js"]
```

```javascript
// worker.js
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function processAIJobs() {
  while (true) {
    try {
      const jobData = await redis.brpop('ai-jobs', 10);
      if (jobData) {
        const job = JSON.parse(jobData[1]);
        await processJob(job);
      }
    } catch (error) {
      console.error('Job processing error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function processJob(job) {
  // Your AI content generation logic here
  const result = await generateContent(job.prompt);
  
  // Save to Supabase
  await supabase
    .from('content_ideas')
    .insert({
      title: result.title,
      content: result.content,
      project_id: job.projectId,
      tenant_id: job.tenantId,
      status: 'generated'
    });
}

processAIJobs();
```

---

## 📁 Phase 3: File Storage (Bunny.net)

### Step 3.1: Bunny.net Setup
```javascript
// content-engine/backend/utils/bunny.js
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  endpoint: 'https://storage.bunnycdn.com',
  accessKeyId: process.env.BUNNY_ACCESS_KEY,
  secretAccessKey: process.env.BUNNY_SECRET_KEY,
  region: 'ny',
  s3ForcePathStyle: true
});

export const generateUploadURL = async (key, contentType) => {
  const params = {
    Bucket: process.env.BUNNY_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    Expires: 3600 // 1 hour
  };
  
  return s3.getSignedUrl('putObject', params);
};
```

### Step 3.2: Upload Endpoint
```javascript
// content-engine/backend/routes/upload.js
import { generateUploadURL } from '../utils/bunny.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, contentType } = req.body;
    const key = `uploads/${req.user.userId}/${Date.now()}-${fileName}`;
    
    const uploadURL = await generateUploadURL(key, contentType);
    
    res.json({
      uploadURL,
      fileKey: key,
      cdnURL: `https://${process.env.BUNNY_CDN_HOSTNAME}/${key}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 🔧 Phase 4: Migration Strategy

### Step 4.1: Environment Variables
```bash
# .env.production
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

BUNNY_ACCESS_KEY=your_bunny_access_key
BUNNY_SECRET_KEY=your_bunny_secret_key
BUNNY_BUCKET_NAME=your_bucket_name
BUNNY_CDN_HOSTNAME=your_cdn_hostname

OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key
```

### Step 4.2: Database Migration Script
```javascript
// migrate-to-supabase.js
import { createClient } from '@supabase/supabase-js';
import { query } from './content-engine/database/config.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateData() {
  // Export from local PostgreSQL
  const projects = await query('SELECT * FROM projects');
  const contentIdeas = await query('SELECT * FROM content_ideas');
  const posts = await query('SELECT * FROM posts');
  
  // Import to Supabase
  await supabase.from('projects').insert(projects.rows);
  await supabase.from('content_ideas').insert(contentIdeas.rows);
  await supabase.from('posts').insert(posts.rows);
  
  console.log('Migration completed!');
}

migrateData();
```

---

## 🚀 Deployment Commands

### Vercel Deployment
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add BUNNY_ACCESS_KEY
vercel env add BUNNY_SECRET_KEY
```

### Google Cloud Run Deployment
```bash
# Build and deploy worker
gcloud builds submit --tag gcr.io/your-project/ai-worker
gcloud run jobs create ai-worker \
  --image gcr.io/your-project/ai-worker \
  --region us-central1 \
  --set-env-vars="UPSTASH_REDIS_REST_URL=your_url,SUPABASE_URL=your_url"
```

---

## 💰 Cost Breakdown (Development Phase)

| Component | Platform | Cost | Notes |
|-----------|----------|------|-------|
| Frontend | Vercel | $0 | Free tier: 100GB bandwidth |
| API | Vercel Functions | $0 | Free tier: 100GB-hours |
| Database | Supabase | $0 | Free tier: 500MB storage |
| Queue | Upstash Redis | $0 | Free tier: 10K requests/day |
| AI Worker | Google Cloud Run | $0 | Free tier: 2M requests/month |
| Storage | Bunny.net | ~$1-5/month | Pay-per-use, minimal in dev |
| **Total** | | **~$1-5/month** | **Zero fixed costs!** |

---

## 🎯 Next Steps

1. **Set up Vercel account** and deploy frontend
2. **Create Supabase project** and migrate database
3. **Set up Upstash Redis** for job queue
4. **Create Google Cloud project** for AI worker
5. **Configure Bunny.net** for file storage
6. **Test the complete pipeline** with a simple content generation

This architecture will give you a production-ready, scalable platform with minimal costs during development! 🚀
