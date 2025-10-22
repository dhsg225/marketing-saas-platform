#!/bin/bash

# Deploy AI Worker to Google Cloud Run Jobs
# This script builds and deploys the AI worker container

set -e

# Configuration
PROJECT_ID="marketing-saas-ai"  # Change this to your project ID
REGION="us-central1"
JOB_NAME="ai-worker-job"
IMAGE_NAME="gcr.io/$PROJECT_ID/ai-worker"

echo "🚀 Deploying AI Worker to Google Cloud Run Jobs..."

# Step 1: Build the Docker image
echo "📦 Building Docker image..."
cd cloud-run-ai-worker
docker build -t $IMAGE_NAME .

# Step 2: Push to Google Container Registry
echo "📤 Pushing to Google Container Registry..."
docker push $IMAGE_NAME

# Step 3: Create Cloud Run Job
echo "☁️ Creating Cloud Run Job..."
gcloud run jobs create $JOB_NAME \
  --image=$IMAGE_NAME \
  --region=$REGION \
  --memory=2Gi \
  --cpu=2 \
  --max-retries=3 \
  --parallelism=1 \
  --task-count=1 \
  --set-env-vars="UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN,OPENAI_API_KEY=$OPENAI_API_KEY"

echo "✅ AI Worker deployed successfully!"
echo "🔗 View in Console: https://console.cloud.google.com/run/jobs"
echo "📊 Monitor logs: gcloud run jobs logs $JOB_NAME --region=$REGION"
