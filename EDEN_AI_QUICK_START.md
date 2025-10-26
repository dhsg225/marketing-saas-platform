# 🚀 Eden AI Integration - Quick Start

## ✅ What's Been Created

### **Database Files:**
1. ✅ `database/eden-ai-models-schema.sql` - Complete database schema
2. ✅ `database/seed-eden-ai-models.sql` - Top 10 AI models seed data
3. ✅ `database/apply-eden-ai-schema.js` - Helper script with instructions

### **Documentation:**
4. ✅ `docs/EDEN_AI_SETUP_GUIDE.md` - Comprehensive setup guide

---

## ⚡ Quick Setup (3 Steps)

### **Step 1: Copy Schema to Clipboard**
```bash
cat "database/eden-ai-models-schema.sql" | pbcopy
```

### **Step 2: Apply in Supabase**
1. Open: https://supabase.com/dashboard (your project)
2. Go to: **SQL Editor** → **New Query**
3. Paste and click **"Run"**

### **Step 3: Copy Seed Data to Clipboard**
```bash
cat "database/seed-eden-ai-models.sql" | pbcopy
```

Then:
1. In Supabase: **New Query**
2. Paste and click **"Run"**

---

## ✅ Verify Success

Run this in Supabase SQL Editor:
```sql
SELECT name, provider, enabled, cost_per_generation
FROM ai_image_models 
WHERE enabled = true 
ORDER BY display_order;
```

**Should return 5 enabled models:**
- DALL-E 3
- Stable Diffusion XL
- Midjourney
- Leonardo AI
- SDXL (Replicate)

---

## 🔑 Your Eden AI API Key

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDY3MWNhYzgtYTQ5OS00YzZkLTkxNTMtMDlkYjAwNDZlZjNlIiwidHlwZSI6ImFwaV90b2tlbiJ9.L9jegZ-9iZXUTKmMNu_vK3CB75CJyHxN2kGOqohUZtE
```

**Will be added to Google Cloud Functions in next phase**

---

## 🎯 What's Next?

After database setup:
1. Update `ai-models` GCF to query database
2. Create `ai-image-generation-edenai` GCF
3. Build admin UI for model management

---

## 📊 At a Glance

**Tables:** 2 (ai_image_models, ai_image_generation_logs)  
**Views:** 2 (v_popular_ai_models, v_daily_ai_usage)  
**Models:** 10 total, 5 enabled by default  
**Cost Range:** $0.015 - $0.050 per image  
**Time Range:** 10-30 seconds per image  

**Ready to integrate Eden AI! 🚀**

