# Google Cloud Run Jobs Setup Guide

## Overview
This guide sets up Google Cloud Run Jobs for AI processing workers that consume jobs from the Redis queue.

## Prerequisites
- Google Cloud Platform account
- Billing enabled on GCP project
- Cloud Build API enabled
- Cloud Run API enabled

## Setup Steps

### 1. Create GCP Project
```bash
# Create new project (or use existing)
gcloud projects create marketing-saas-ai --name="Marketing SaaS AI"
gcloud config set project marketing-saas-ai
```

### 2. Enable Required APIs
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable container.googleapis.com
```

### 3. Build and Deploy AI Worker

#### Option A: Using Cloud Build (Recommended)
```bash
# Submit build
gcloud builds submit --config cloud-run-ai-worker/cloudbuild.yaml \
  --substitutions=_UPSTASH_REDIS_REST_URL="your-redis-url",_UPSTASH_REDIS_REST_TOKEN="your-redis-token",_OPENAI_API_KEY="your-openai-key"
```

#### Option B: Manual Build
```bash
# Build Docker image
cd cloud-run-ai-worker
docker build -t gcr.io/marketing-saas-ai/ai-worker .

# Push to Container Registry
docker push gcr.io/marketing-saas-ai/ai-worker

# Create Cloud Run Job
gcloud run jobs create ai-worker-job \
  --image=gcr.io/marketing-saas-ai/ai-worker \
  --region=us-central1 \
  --memory=2Gi \
  --cpu=2 \
  --max-retries=3 \
  --parallelism=1 \
  --task-count=1 \
  --set-env-vars="UPSTASH_REDIS_REST_URL=your-redis-url,UPSTASH_REDIS_REST_TOKEN=your-redis-token,OPENAI_API_KEY=your-openai-key"
```

### 4. Execute the Job
```bash
# Run the job manually (for testing)
gcloud run jobs execute ai-worker-job --region=us-central1

# Set up scheduled execution (optional)
gcloud scheduler jobs create http ai-worker-scheduler \
  --schedule="*/5 * * * *" \
  --uri="https://us-central1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/marketing-saas-ai/jobs/ai-worker-job:run" \
  --http-method=POST \
  --oauth-service-account-email=your-service-account@marketing-saas-ai.iam.gserviceaccount.com
```

## Environment Variables
The AI worker needs these environment variables:
- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token
- `OPENAI_API_KEY`: Your OpenAI API key

## Monitoring
- **Cloud Run Jobs Console**: Monitor job executions
- **Cloud Logging**: View worker logs
- **Cloud Monitoring**: Set up alerts for failures

## Cost Optimization
- **CPU**: 2 vCPU (adjustable based on workload)
- **Memory**: 2GB (adjustable based on workload)
- **Concurrency**: 1 (processes one job at a time)
- **Retries**: 3 (handles temporary failures)

## Troubleshooting
1. **Job fails to start**: Check environment variables
2. **Redis connection issues**: Verify Upstash credentials
3. **OpenAI API errors**: Check API key and rate limits
4. **Memory issues**: Increase memory allocation

## Next Steps
1. Set up monitoring and alerting
2. Configure auto-scaling based on queue depth
3. Implement job prioritization
4. Add more AI model support
