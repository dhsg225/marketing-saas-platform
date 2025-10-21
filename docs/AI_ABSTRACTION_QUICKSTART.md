# AI Abstraction Layer - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will get you up and running with the AI Abstraction Layer.

---

## ✅ Prerequisites

- PostgreSQL database running
- Node.js backend server configured
- Environment variables set in `.env`

---

## 📋 Step 1: Run the Database Migration

```bash
cd content-engine/database
node apply_ai_abstraction_schema.js
```

**Expected Output:**
```
🚀 Starting AI Abstraction Layer schema migration...
📋 Creating tables and indexes...
✅ Schema applied successfully!

📊 Created tables:
   ✓ ai_generation_jobs
   ✓ model_configs
   ✓ user_api_keys

🌱 Seed data: 3 model configurations loaded
```

---

## 🔑 Step 2: Configure API Keys

### For Apiframe (Midjourney)

Add to your `.env` file:

```bash
APIFRAME_MIDJOURNEY_V6_API_KEY=your-apiframe-key-here
```

### For OpenAI DALL-E (User-Specific)

Users will add their own keys through the Settings UI (coming in frontend update).

---

## 🖥️ Step 3: Start the Backend

```bash
cd content-engine/backend
npm start
```

**Expected Output:**
```
📋 PlaybookService initialized
🏢 ClientService initialized
📦 [AdapterRegistry] Registered 2 adapters
✅ [AdapterRegistry] Registered adapter: ApiframeAdapter
✅ [AdapterRegistry] Registered adapter: DalleAdapter
🚀 Content Engine API running on port 5001
```

---

## 🧪 Step 4: Test the API

### Test 1: Get Available Models

```bash
curl http://localhost:5001/api/ai/models
```

**Expected Response:**
```json
{
  "success": true,
  "models": [
    {
      "modelId": "apiframe-midjourney-v6",
      "providerName": "Apiframe (Midjourney v6)",
      "modelType": "image",
      ...
    },
    ...
  ],
  "count": 3
}
```

### Test 2: Generate an Image (Requires Auth)

First, get a JWT token by logging in, then:

```bash
curl -X POST http://localhost:5001/api/ai/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "apiframe-midjourney-v6",
    "prompt": "A serene mountain landscape at sunset",
    "options": {
      "aspectRatio": "16:9"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "estimatedTime": 60,
  "message": "Generation job created successfully"
}
```

### Test 3: Check Job Status

```bash
curl http://localhost:5001/api/ai/status/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 4: Get Results (When Completed)

```bash
curl http://localhost:5001/api/ai/results/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎨 Step 5: Integrate with Frontend

### Update Your MediaPicker Component

```typescript
// Example integration
const [models, setModels] = useState([]);
const [generating, setGenerating] = useState(false);

// Load available models
useEffect(() => {
  fetch('/api/ai/models?type=image')
    .then(res => res.json())
    .then(data => setModels(data.models));
}, []);

// Generate with AI
const generateImage = async (modelId, prompt) => {
  setGenerating(true);
  
  // 1. Start generation
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ modelId, prompt })
  });
  
  const { jobId } = await response.json();
  
  // 2. Poll for completion
  const pollInterval = setInterval(async () => {
    const statusRes = await fetch(`/api/ai/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const status = await statusRes.json();
    
    if (status.status === 'completed') {
      clearInterval(pollInterval);
      
      // 3. Fetch results
      const resultsRes = await fetch(`/api/ai/results/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const results = await resultsRes.json();
      
      // Use the generated images
      console.log('Generated images:', results.assets);
      setGenerating(false);
    }
  }, 3000);
};
```

---

## 🔧 Troubleshooting

### Issue: "Cannot find module"
**Solution**: Make sure you're running `npm install` in the backend directory.

### Issue: "Model not found"
**Solution**: Verify the migration ran successfully and models are in the database:
```sql
SELECT model_id, provider_name, is_active FROM model_configs;
```

### Issue: "Global API key not configured"
**Solution**: Check your `.env` file for the correct environment variable name. It should match the model_id in SCREAMING_SNAKE_CASE:
- `apiframe-midjourney-v6` → `APIFRAME_MIDJOURNEY_V6_API_KEY`

### Issue: Backend won't start
**Solution**: Check for syntax errors:
```bash
cd content-engine/backend
node --check server.js
```

---

## 📊 Verify Installation

Run this checklist to ensure everything is working:

- [ ] Database tables created (`model_configs`, `ai_generation_jobs`, `user_api_keys`)
- [ ] 3 model configurations loaded (2 DALL-E, 1 Apiframe)
- [ ] Backend starts without errors
- [ ] `/api/ai/models` endpoint returns 3 models
- [ ] API key environment variable is set
- [ ] Can successfully create a test generation job

---

## 🎓 Next Steps

1. **Update MediaPicker**: Replace old image generation with new abstraction layer
2. **Add Admin UI**: Create interface for managing model configs
3. **Add More Providers**: Implement adapters for Stability AI, Google Imagen, etc.
4. **Monitor Costs**: Track generation costs per user/organization
5. **Optimize**: Implement caching, webhooks, batch generation

---

## 📚 Full Documentation

For complete details, see [AI Abstraction Layer Documentation](./ai-abstraction-layer.md)

---

## 🆘 Need Help?

Check the logs:
```bash
# Backend logs
tail -f content-engine/backend/logs/server.log

# Database queries
SELECT * FROM ai_generation_jobs ORDER BY created_at DESC LIMIT 10;
```

---

**You're all set! Start generating AI content! 🎉**

