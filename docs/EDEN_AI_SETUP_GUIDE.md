# 🌟 Eden AI Integration - Complete Setup Guide

## 📋 Overview

This guide walks you through integrating **Eden AI** as your unified AI image generation provider. Eden AI gives you access to multiple AI providers (OpenAI, Midjourney, Stable Diffusion, Leonardo AI, etc.) through a single API, with admin-controlled model access.

---

## 🎯 Key Features

✅ **Admin-Controlled Access** - Enable/disable models from admin panel  
✅ **Multi-Provider Support** - DALL-E 3, Midjourney, SDXL, Leonardo AI, and more  
✅ **Usage Tracking** - Monitor generations, costs, and performance  
✅ **Dynamic Model List** - Models stored in database, not hardcoded  
✅ **Cost Optimization** - Choose models based on quality vs. cost  
✅ **Security** - API key protected, server-side validation  

---

## 📊 Database Schema

### **Tables Created:**

1. **`ai_image_models`** - Stores available AI models with configuration
2. **`ai_image_generation_logs`** - Tracks all generation attempts for analytics

### **Analytics Views:**

1. **`v_popular_ai_models`** - Model usage statistics
2. **`v_daily_ai_usage`** - Daily generation metrics

---

## 🚀 Phase 1: Database Setup (START HERE)

### **Step 1: Apply Schema**

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy the contents of: `database/eden-ai-models-schema.sql`
5. Paste into SQL Editor
6. Click **"Run"** or press `Cmd + Enter`

**Quick Copy (macOS):**
```bash
cat "database/eden-ai-models-schema.sql" | pbcopy
```

### **Step 2: Seed with Top 10 Models**

1. In Supabase SQL Editor, click **"New Query"** again
2. Copy the contents of: `database/seed-eden-ai-models.sql`
3. Paste into SQL Editor
4. Click **"Run"** or press `Cmd + Enter`

**Quick Copy (macOS):**
```bash
cat "database/seed-eden-ai-models.sql" | pbcopy
```

### **Step 3: Verify Setup**

Run this query in Supabase SQL Editor to confirm:

```sql
-- Check enabled models
SELECT id, name, provider, enabled, cost_per_generation, estimated_time
FROM ai_image_models 
WHERE enabled = true 
ORDER BY display_order;
```

**Expected Result:** 5 enabled models
- ✅ DALL-E 3 (OpenAI)
- ✅ Stable Diffusion XL
- ✅ Midjourney (Eden AI)
- ✅ Leonardo AI
- ✅ SDXL (Replicate)

---

## 🔐 Phase 2: Environment Variables

Add your Eden AI API key to Google Cloud Functions:

### **Your Eden AI API Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDY3MWNhYzgtYTQ5OS00YzZkLTkxNTMtMDlkYjAwNDZlZjNlIiwidHlwZSI6ImFwaV90b2tlbiJ9.L9jegZ-9iZXUTKmMNu_vK3CB75CJyHxN2kGOqohUZtE
```

### **How to Add to GCF:**

For existing functions (will be done during GCF updates):
```bash
gcloud functions deploy FUNCTION_NAME \
  --set-env-vars EDENAI_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MediaPicker Component                              │   │
│  │  - Loads models from database (enabled only)        │   │
│  │  - User selects model and enters prompt             │   │
│  │  - Calls ai-image-generation-edenai GCF             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AIModelSettings Component (Admin Only)             │   │
│  │  - Toggle models on/off                             │   │
│  │  - View usage statistics                            │   │
│  │  - Calls ai-models-admin GCF                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│          Google Cloud Functions (Backend)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ai-models                                          │   │
│  │  - Queries ai_image_models table                    │   │
│  │  - Returns only enabled models                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ai-image-generation-edenai                         │   │
│  │  - Validates model is enabled                       │   │
│  │  - Calls Eden AI API                                │   │
│  │  - Logs usage to database                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ai-models-admin (Admin Only)                       │   │
│  │  - Updates ai_image_models table                    │   │
│  │  - Requires admin authentication                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database (PostgreSQL)                  │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ ai_image_models  │  │ ai_image_generation_logs     │    │
│  │ - 10 models      │  │ - Usage tracking             │    │
│  │ - 5 enabled      │  │ - Cost analytics             │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Eden AI Platform                          │
│  Routes to: OpenAI, Midjourney, StabilityAI, Leonardo, etc. │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Database Schema Details

### **Table: `ai_image_models`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key: "provider-model" format |
| `provider` | TEXT | Provider name (openai, stabilityai, etc.) |
| `name` | TEXT | Display name (DALL-E 3, Midjourney, etc.) |
| `model_identifier` | TEXT | Eden AI's provider string for API calls |
| `enabled` | BOOLEAN | **Admin controls** - only enabled models shown to users |
| `display_order` | INTEGER | Sort order in UI (1 = first) |
| `description` | TEXT | User-friendly description |
| `estimated_time` | INTEGER | Average generation time (seconds) |
| `cost_per_generation` | DECIMAL | Cost per image in USD |
| `supported_resolutions` | JSONB | Array of supported sizes |
| `max_resolution` | TEXT | Maximum supported resolution |
| `features` | JSONB | Array of capabilities |

### **Table: `ai_image_generation_logs`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Who generated the image |
| `organization_id` | UUID | Which organization |
| `model_id` | TEXT | Which AI model was used |
| `prompt` | TEXT | User's prompt |
| `success` | BOOLEAN | Did generation succeed? |
| `generation_time` | INTEGER | Actual time taken (ms) |
| `cost` | DECIMAL | Actual cost incurred |
| `image_url` | TEXT | Generated image URL |
| `created_at` | TIMESTAMPTZ | When it happened |

---

## 🎨 Top 10 Models Included

| # | Model | Provider | Enabled | Cost | Time | Best For |
|---|-------|----------|---------|------|------|----------|
| 1 | DALL-E 3 | OpenAI | ✅ | $0.040 | 15s | Marketing materials, professional content |
| 2 | Stable Diffusion XL | StabilityAI | ✅ | $0.020 | 10s | Creative content, cost-effective |
| 3 | Midjourney | Midjourney | ✅ | $0.050 | 30s | Artistic content, social media |
| 4 | Leonardo AI | Leonardo | ✅ | $0.025 | 15s | Illustrations, character art |
| 5 | SDXL (Replicate) | Replicate | ✅ | $0.015 | 12s | Production use, reliable |
| 6 | Amazon Titan | Amazon | ❌ | $0.030 | 8s | Enterprise, AWS users |
| 7 | Google Imagen | Google | ❌ | $0.050 | 20s | Photorealistic needs |
| 8 | DeepAI | DeepAI | ❌ | $0.010 | 5s | Quick mockups, testing |
| 9 | Runware SDXL | Runware | ❌ | $0.018 | 7s | Alternative SDXL host |
| 10 | DALL-E 2 | OpenAI | ❌ | $0.020 | 10s | Legacy, cost savings |

**Default: 5 enabled, 5 disabled** (admins can toggle anytime)

---

## 🔒 Security & Access Control

### **Row Level Security (RLS) Policies:**

#### **ai_image_models:**
- ✅ **Public** can view enabled models (for image generation)
- ✅ **Authenticated users** can view all models (for admin UI)
- ✅ **Service role** can manage models (admin operations)

#### **ai_image_generation_logs:**
- ✅ **Users** can view their own logs
- ✅ **Organization members** can view org logs
- ✅ **Service role** can insert logs (backend only)

### **Admin Access:**
- Model management requires admin authentication
- Will be enforced in `ai-models-admin` GCF
- Consider adding `role` column to `users` table if not present

---

## 📈 Analytics & Monitoring

### **View: `v_popular_ai_models`**

Shows usage statistics per model:
- Total generations
- Success/failure counts
- Average generation time
- Total cost
- Last used timestamp

### **View: `v_daily_ai_usage`**

Shows daily breakdown:
- Generations per day per model
- Success rate
- Daily costs
- Performance metrics

### **Usage Example:**

```sql
-- Top 3 most used models
SELECT name, total_generations, total_cost_usd 
FROM v_popular_ai_models 
LIMIT 3;

-- Cost this week
SELECT 
  SUM(total_cost_usd) as weekly_cost,
  SUM(total_generations) as weekly_generations
FROM v_daily_ai_usage
WHERE usage_date >= CURRENT_DATE - INTERVAL '7 days';
```

---

## 🎯 Next Steps After Database Setup

Once you've applied the schema and seed data to Supabase:

### **Phase 2: Update Backend**
- [ ] Update `ai-models` GCF to query database instead of static list
- [ ] Create `ai-image-generation-edenai` GCF for Eden AI API calls
- [ ] Create `ai-models-admin` GCF for admin model management

### **Phase 3: Update Frontend**
- [ ] MediaPicker already compatible (just needs backend updates)
- [ ] Create `AIModelSettings` admin component
- [ ] Add route to Settings page

### **Phase 4: Testing & Verification**
- [ ] Test model loading in MediaPicker
- [ ] Test image generation with each enabled model
- [ ] Test admin toggle functionality
- [ ] Verify usage logging

---

## 🛠️ Troubleshooting

### **Schema Application Failed?**

**Error:** "relation already exists"
- **Solution:** Tables already created, skip schema step

**Error:** "permission denied"
- **Solution:** Use service role key, not anon key

**Error:** "syntax error near..."
- **Solution:** Ensure you copied entire SQL file, including all lines

### **Seed Data Failed?**

**Error:** "duplicate key value violates unique constraint"
- **Solution:** Data already seeded, run DELETE queries first

**Error:** "foreign key violation"
- **Solution:** Run schema script first, then seed script

### **Models Not Appearing?**

**Check 1:** Verify models were inserted
```sql
SELECT COUNT(*) FROM ai_image_models;
-- Should return: 10
```

**Check 2:** Verify enabled models
```sql
SELECT COUNT(*) FROM ai_image_models WHERE enabled = true;
-- Should return: 5
```

**Check 3:** Test RLS policies
```sql
-- As public (should only see enabled)
SELECT * FROM ai_image_models;
-- Should return: 5 rows
```

---

## 💰 Cost Analysis

### **Enabled Models Cost Comparison:**

| Model | Cost per Image | Images per $1 | Best For |
|-------|----------------|---------------|----------|
| SDXL (Replicate) | $0.015 | 67 images | **Most economical** |
| Stable Diffusion XL | $0.020 | 50 images | **Best value** |
| Leonardo AI | $0.025 | 40 images | Balanced quality/cost |
| DALL-E 3 | $0.040 | 25 images | Premium quality |
| Midjourney | $0.050 | 20 images | **Highest quality** |

### **Monthly Cost Estimates:**

**100 images/month:**
- Cheapest (SDXL): $1.50/month
- Balanced (SDXL): $2.00/month
- Premium (DALL-E 3): $4.00/month

**1,000 images/month:**
- Cheapest: $15/month
- Balanced: $20/month
- Premium: $40/month

**Strategy:** Use cheaper models for drafts, premium for final assets

---

## 📖 Eden AI API Reference

### **Image Generation Request Format:**

```javascript
const response = await fetch("https://api.edenai.run/v2/image/generation", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${EDENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    providers: ["openai"],  // or "stabilityai", "replicate", etc.
    text: "A beautiful sunset over the ocean",
    resolution: "1024x1024",
    fallback_providers: ["stabilityai"] // Optional fallback
  }),
});
```

### **Response Format:**

```json
{
  "openai": {
    "status": "success",
    "items": [
      {
        "image": "https://...",
        "image_resource_url": "https://...",
        "cost": 0.04
      }
    ]
  }
}
```

---

## 🔄 Migration Path from Current System

### **Current System:**
- Static model list in `ai-models` GCF
- Hardcoded 4 models (Apiframe Midjourney, DALL-E)
- No admin control
- No usage tracking

### **New System:**
- Dynamic model list from database
- 10 curated models (5 enabled by default)
- Admin can enable/disable via UI
- Full usage tracking and analytics
- Unified Eden AI integration

### **Backwards Compatibility:**

The new system maintains the same API interface:
- `GET /api/ai/models?type=image` still works
- Returns same JSON structure
- MediaPicker requires no changes
- Existing prompts and workflows unaffected

---

## ✅ Verification Checklist

After database setup, verify these:

- [ ] Schema applied successfully (no errors in Supabase)
- [ ] Seed data inserted (10 models in table)
- [ ] 5 models enabled by default
- [ ] RLS policies active
- [ ] Analytics views created
- [ ] Can query `v_popular_ai_models` view

### **Quick Verification Script:**

```sql
-- Run this in Supabase SQL Editor
DO $$
DECLARE
  total_models INTEGER;
  enabled_models INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_models FROM ai_image_models;
  SELECT COUNT(*) INTO enabled_models FROM ai_image_models WHERE enabled = true;
  
  RAISE NOTICE '✅ Database Setup Verification:';
  RAISE NOTICE '   Total Models: %', total_models;
  RAISE NOTICE '   Enabled Models: %', enabled_models;
  
  IF total_models = 10 AND enabled_models = 5 THEN
    RAISE NOTICE '🎉 DATABASE SETUP SUCCESSFUL!';
  ELSE
    RAISE WARNING '⚠️  Unexpected model count!';
  END IF;
END $$;
```

---

## 🎯 What's Next?

Once database setup is complete:

1. **Update `ai-models` GCF** - Query database instead of static list
2. **Create Eden AI integration GCF** - Handle image generation
3. **Build admin UI** - Model management interface
4. **Test end-to-end** - Generate images with Eden AI

---

## 📞 Support & Documentation

- **Eden AI Docs:** https://docs.edenai.co/reference/image_generation_create
- **Eden AI Dashboard:** https://app.edenai.run/
- **Your API Key Dashboard:** https://app.edenai.run/admin/account/settings

---

## 🎨 UI Previews

### **End-User Experience:**

Users will see in MediaPicker:
```
🤖 Select AI Model:
  ◉ DALL-E 3               ~15s  [Premium Quality]
  ○ Stable Diffusion XL    ~10s  [Best Value]
  ○ Midjourney             ~30s  [Most Artistic]
  ○ Leonardo AI            ~15s  [Character Art]
  ○ SDXL (Replicate)       ~12s  [Most Economical]
```

### **Admin Experience:**

Admin settings will show:
```
AI Image Models Management

[✅ ON]  DALL-E 3          OpenAI      1,234 uses  $49.36
[✅ ON]  Stable Diffusion  StabilityAI 2,456 uses  $49.12
[✅ ON]  Midjourney        Midjourney    567 uses  $28.35
[❌ OFF] Google Imagen     Google          0 uses   $0.00
[❌ OFF] DeepAI            DeepAI          0 uses   $0.00
```

---

## 🚀 Ready to Proceed!

Database scripts are ready! Follow **Phase 1** steps above to apply to your Supabase instance.

**Questions?** Check the troubleshooting section or review the SQL comments for detailed explanations.

