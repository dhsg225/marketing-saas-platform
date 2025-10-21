# AI Abstraction Layer - Complete Documentation

## 🎯 Overview

The AI Abstraction Layer is a provider-agnostic system that decouples the Marketing SaaS Platform from specific AI providers. It allows seamless integration of multiple AI services (Apiframe/Midjourney, OpenAI DALL-E, Google Imagen, etc.) through a universal interface.

### Key Benefits

- **Provider Agnostic**: Switch or add AI providers without frontend changes
- **Unified API**: Single consistent interface for all AI operations
- **Extensible**: Add new providers by implementing one adapter class
- **Job Tracking**: Centralized tracking of all generation jobs
- **BYOK Support**: Both platform-wide and user-specific API keys
- **Type Safety**: Full TypeScript support (adapters use JSDoc)

---

## 📊 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend                               │
│  (MediaPicker, Content Generator, etc.)                      │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ HTTP/REST
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    Universal API Layer                        │
│  POST /api/ai/generate                                       │
│  GET  /api/ai/status/:jobId                                  │
│  GET  /api/ai/results/:jobId                                 │
│  GET  /api/ai/models                                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    AI Service Layer                           │
│  - Model config lookup                                       │
│  - API key resolution                                        │
│  - Adapter routing                                           │
│  - Job persistence                                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
┌───────────▼──────┐  ┌──────▼────────────┐
│ ApiframeAdapter  │  │  DalleAdapter     │  ...
│ (Midjourney)     │  │  (OpenAI)         │
└───────────┬──────┘  └──────┬────────────┘
            │                │
┌───────────▼─────────────────▼────────────┐
│        External AI Providers             │
│  Apiframe API    OpenAI API    etc.     │
└──────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Table: `model_configs`

Stores configuration for all AI models/providers.

| Column | Type | Description |
|--------|------|-------------|
| `model_id` | VARCHAR(100) PK | Unique identifier (e.g., 'apiframe-midjourney-v6') |
| `provider_name` | VARCHAR(255) | Display name (e.g., 'Apiframe (Midjourney v6)') |
| `model_type` | VARCHAR(50) | Type: 'image', 'video', or 'text' |
| `adapter_module` | VARCHAR(255) | Adapter class name (e.g., 'ApiframeAdapter') |
| `api_endpoint` | TEXT | Provider base URL |
| `api_key_type` | VARCHAR(50) | 'user_specific' or 'global' |
| `description` | TEXT | Model description for UI |
| `config_options` | JSONB | Provider-specific config |
| `is_active` | BOOLEAN | Whether model is available |
| `max_concurrent_jobs` | INTEGER | Concurrency limit |
| `estimated_time_seconds` | INTEGER | Expected generation time |
| `cost_per_generation` | DECIMAL(10,4) | Cost tracking |

### Table: `ai_generation_jobs`

Tracks all AI generation requests.

| Column | Type | Description |
|--------|------|-------------|
| `job_id` | UUID PK | Platform job ID |
| `model_id` | VARCHAR(100) FK | Reference to model_configs |
| `user_id` | UUID FK | User who created job |
| `organization_id` | UUID FK | Organization context |
| `project_id` | UUID FK | Project context (optional) |
| `prompt` | TEXT | Generation prompt |
| `options` | JSONB | User options (aspect ratio, etc.) |
| `status` | VARCHAR(50) | 'pending', 'processing', 'completed', 'failed', 'cancelled' |
| `progress` | INTEGER | 0-100 completion percentage |
| `provider_job_id` | VARCHAR(255) | External provider's job ID |
| `provider_metadata` | JSONB | Provider-specific metadata |
| `result_assets` | JSONB | Generated asset URLs and metadata |
| `error_message` | TEXT | Error details if failed |
| `started_at` | TIMESTAMP | When processing started |
| `completed_at` | TIMESTAMP | When job completed |

### Table: `user_api_keys`

Stores user-provided API keys (BYOK).

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Primary key |
| `user_id` | UUID FK | User who owns the key |
| `model_id` | VARCHAR(100) FK | Which model this key is for |
| `encrypted_api_key` | TEXT | Encrypted API key |
| `key_name` | VARCHAR(255) | Friendly name (optional) |
| `is_valid` | BOOLEAN | Whether key is still valid |
| `last_validated_at` | TIMESTAMP | Last validation check |

---

## 🔌 API Endpoints

### GET `/api/ai/models`

Get list of available AI models.

**Query Parameters:**
- `type` (optional): Filter by model type ('image', 'video', 'text')
- `activeOnly` (optional): Only show active models (default: true)

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "modelId": "apiframe-midjourney-v6",
      "providerName": "Apiframe (Midjourney v6)",
      "modelType": "image",
      "description": "High-quality artistic image generation",
      "apiKeyType": "global",
      "estimatedTime": 60,
      "costPerGeneration": 0.05
    }
  ],
  "count": 3
}
```

### POST `/api/ai/generate`

Initiate a new AI content generation job.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Body:**
```json
{
  "modelId": "apiframe-midjourney-v6",
  "prompt": "A beautiful sunset over mountains",
  "options": {
    "aspectRatio": "16:9",
    "negativePrompt": "blurry, low quality",
    "style": "photorealistic"
  },
  "projectId": "uuid-optional"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "estimatedTime": 60,
  "message": "Generation job created successfully"
}
```

### GET `/api/ai/status/:jobId`

Check the status of a generation job.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "message": "Job is processing",
  "createdAt": "2025-10-11T12:00:00Z"
}
```

### GET `/api/ai/results/:jobId`

Get the results of a completed generation job.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "assets": [
    {
      "url": "https://cdn.provider.com/image.png",
      "type": "image",
      "metadata": {
        "provider": "apiframe",
        "model": "midjourney-v6",
        "prompt": "A beautiful sunset over mountains",
        "width": 1792,
        "height": 1024,
        "format": "png",
        "generatedAt": "2025-10-11T12:01:00Z"
      }
    }
  ],
  "completedAt": "2025-10-11T12:01:00Z",
  "prompt": "A beautiful sunset over mountains"
}
```

### GET `/api/ai/jobs`

Get user's generation job history.

**Query Parameters:**
- `limit` (optional): Max results (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "model_id": "apiframe-midjourney-v6",
      "prompt": "A beautiful sunset",
      "status": "completed",
      "progress": 100,
      "created_at": "2025-10-11T12:00:00Z",
      "completed_at": "2025-10-11T12:01:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## 🔧 Adding a New AI Provider

To add a new AI provider, follow these steps:

### Step 1: Create the Adapter

Create a new file in `/backend/services/adapters/`:

```javascript
// Example: StabilityAdapter.js
const BaseAdapter = require('./BaseAdapter');
const axios = require('axios');

class StabilityAdapter extends BaseAdapter {
  async generateJob(modelConfig, prompt, options, authContext) {
    // Implementation
    return {
      providerJobId: 'provider-job-id',
      status: 'processing',
      metadata: { /* provider metadata */ }
    };
  }

  async checkStatus(jobId, providerJobId, modelConfig, authContext) {
    // Implementation
    return {
      status: 'completed',
      progress: 100,
      message: 'Job completed'
    };
  }

  async getResults(jobId, providerJobId, modelConfig, authContext) {
    // Implementation
    return [
      {
        url: 'https://cdn.example.com/image.png',
        type: 'image',
        metadata: { /* asset metadata */ }
      }
    ];
  }
}

module.exports = StabilityAdapter;
```

### Step 2: Register the Adapter

Add to `/backend/services/adapters/AdapterRegistry.js`:

```javascript
const StabilityAdapter = require('./StabilityAdapter');

// In _registerDefaultAdapters():
this.register('StabilityAdapter', StabilityAdapter);
```

### Step 3: Add Model Configuration

Insert into `model_configs` table:

```sql
INSERT INTO model_configs (
  model_id,
  provider_name,
  model_type,
  adapter_module,
  api_endpoint,
  api_key_type,
  description,
  estimated_time_seconds
) VALUES (
  'stability-sdxl-1.0',
  'Stability AI (SDXL 1.0)',
  'image',
  'StabilityAdapter',
  'https://api.stability.ai/v1',
  'user_specific',
  'High-quality Stable Diffusion XL model',
  20
);
```

### Step 4: Set API Key (if global)

Add to `.env`:

```bash
STABILITY_SDXL_1_0_API_KEY=your-api-key-here
```

---

## 🎨 Frontend Integration Example

```typescript
// In your React component
import { useState } from 'react';
import axios from 'axios';

const AIImageGenerator = () => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState(null);

  // Load available models
  useEffect(() => {
    const loadModels = async () => {
      const response = await axios.get('/api/ai/models?type=image');
      setModels(response.data.models);
    };
    loadModels();
  }, []);

  // Generate image
  const handleGenerate = async () => {
    const response = await axios.post('/api/ai/generate', {
      modelId: selectedModel,
      prompt: prompt,
      options: { aspectRatio: '16:9' }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setJobId(response.data.jobId);
    pollStatus(response.data.jobId);
  };

  // Poll for status
  const pollStatus = async (jobId) => {
    const interval = setInterval(async () => {
      const response = await axios.get(`/api/ai/status/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.status === 'completed') {
        clearInterval(interval);
        fetchResults(jobId);
      } else if (response.data.status === 'failed') {
        clearInterval(interval);
        alert('Generation failed');
      }
    }, 3000);
  };

  // Fetch results
  const fetchResults = async (jobId) => {
    const response = await axios.get(`/api/ai/results/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setResults(response.data.assets);
  };

  return (
    <div>
      <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
        {models.map(model => (
          <option key={model.modelId} value={model.modelId}>
            {model.providerName}
          </option>
        ))}
      </select>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button onClick={handleGenerate}>Generate</button>
      
      {results && results.map((asset, i) => (
        <img key={i} src={asset.url} alt="Generated" />
      ))}
    </div>
  );
};
```

---

## 🔐 Security Considerations

### API Key Management

1. **Global Keys**: Store in environment variables, never commit to Git
2. **User Keys**: Store encrypted in database using a secure encryption library
3. **Key Rotation**: Implement expiry and rotation for security

### Rate Limiting

Consider implementing rate limiting per user to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 requests per window
  message: 'Too many generation requests, please try again later'
});

app.use('/api/ai/generate', aiLimiter);
```

### Cost Tracking

Monitor costs per user/organization to prevent bill shock:

```javascript
// In aiService.js
async generateContent(params) {
  // Calculate estimated cost
  const estimatedCost = modelConfig.cost_per_generation;
  
  // Check user's budget (implement your logic)
  await this._checkUserBudget(userId, estimatedCost);
  
  // Proceed with generation...
}
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Model not found"
- **Solution**: Ensure model_id exists in model_configs table and is_active=true

**Issue**: "No API key found"
- **Solution**: For global keys, check .env file. For user keys, check user_api_keys table

**Issue**: "Adapter not found"
- **Solution**: Verify adapter is registered in AdapterRegistry.js

**Issue**: "Job stuck in 'processing' state"
- **Solution**: Check provider's API status, implement timeout logic

---

## 📈 Future Enhancements

1. **Webhooks**: Support provider webhooks for instant status updates
2. **Batch Generation**: Generate multiple variations simultaneously
3. **Result Caching**: Cache popular prompts to save costs
4. **A/B Testing**: Compare outputs from different models
5. **Style Library**: Pre-defined style presets for consistency
6. **Cost Analytics**: Detailed cost breakdowns and forecasting

---

## 📝 Changelog

### Version 1.0.0 (2025-10-11)
- Initial release
- Apiframe (Midjourney) adapter
- OpenAI DALL-E 2/3 adapter
- PostgreSQL schema implementation
- Complete API endpoints
- Frontend integration ready

---

## 🤝 Contributing

When adding new adapters:

1. Extend `BaseAdapter`
2. Implement all three required methods
3. Add comprehensive error handling
4. Include provider-specific documentation
5. Update this documentation
6. Add tests

---

## 📚 Additional Resources

- [Apiframe API Docs](https://api.apiframe.pro/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [BaseAdapter Source](/backend/services/adapters/BaseAdapter.js)
- [Database Schema](/database/ai_abstraction_schema.sql)

---

**Built with ❤️ for the Marketing SaaS Platform**

