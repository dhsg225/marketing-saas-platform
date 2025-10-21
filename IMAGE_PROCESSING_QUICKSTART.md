# Image Processing - Quick Start Guide

## ✅ What's Been Implemented

You now have a **free, server-side image processing pipeline** using Sharp that:

1. ✅ Automatically generates 4 optimized variants (thumbnail, medium, large, original)
2. ✅ Applies brand filters (vibrant, muted, warm, cool, neutral)
3. ✅ Supports watermarking (optional)
4. ✅ Handles cropping and resizing
5. ✅ Uploads all variants to Bunny.net CDN
6. ✅ Stores metadata in PostgreSQL database
7. ✅ **Zero monthly cost** (vs $9.50/month for Bunny Image Optimizer)

---

## 🚀 How to Use

### Option 1: Test Locally (Recommended First)

```bash
# Navigate to backend
cd content-engine/backend

# Test with any image
node test-image-processing.js /path/to/your/test-image.jpg
```

**What this does:**
- Processes the image locally with Sharp
- Shows all generated variants and their sizes
- Displays compression ratios
- Tests all brand filters
- **Does NOT upload** to Bunny.net (just testing)

---

### Option 2: Upload via API

**Endpoint**: `POST http://localhost:5001/api/uploads/process-image`

**Using cURL**:

```bash
curl -X POST http://localhost:5001/api/uploads/process-image \
  -F "file=@/path/to/image.jpg" \
  -F "scope=project" \
  -F "project_id=YOUR_PROJECT_ID" \
  -F "generateVariants=true" \
  -F "brandFilter=vibrant"
```

**Using Postman**:
1. Method: POST
2. URL: `http://localhost:5001/api/uploads/process-image`
3. Body: form-data
   - `file`: [Select Image File]
   - `scope`: `project`
   - `project_id`: `[Your Project UUID]`
   - `brandFilter`: `vibrant`

**Response**:
```json
{
  "success": true,
  "data": {
    "variants": {
      "thumbnail": {
        "url": "https://marketing-saas-assets.b-cdn.net/project/123/thumbnail_xxx.jpg",
        "width": 400,
        "height": 300,
        "size": 45678
      },
      "medium": { ... },
      "large": { ... },
      "original": { ... }
    }
  }
}
```

---

## 📊 What Gets Generated

| Variant | Size | Quality | Use Case |
|---------|------|---------|----------|
| **Thumbnail** | 400x300px | 80% | Gallery previews |
| **Medium** | 1280x720px | 85% | Web display |
| **Large** | 1920x1080px | 90% | Full screen |
| **Original** | Original size | 95% | Downloads |

All variants are:
- ✅ Automatically uploaded to Bunny.net CDN
- ✅ Optimized for web (progressive JPEG)
- ✅ Saved in database with metadata
- ✅ Available via public CDN URLs

---

## 🎨 Brand Filters

Apply consistent aesthetics:

```bash
# Vibrant (Social media)
-F "brandFilter=vibrant"

# Muted (Professional)
-F "brandFilter=muted"

# Warm (Food/Hospitality)
-F "brandFilter=warm"

# Cool (Tech/Corporate)
-F "brandFilter=cool"

# Neutral (No changes)
-F "brandFilter=neutral"
```

---

## 🔧 Advanced Options

### Disable Variants (Upload Original Only)

```bash
-F "generateVariants=false"
```

### Add Watermark

```bash
# First, add watermark image to: content-engine/backend/assets/watermark.png
-F "addWatermark=true"
```

### Crop Before Processing

```bash
-F 'cropConfig={"x":100,"y":100,"width":1000,"height":800}'
```

---

## 💾 Database Storage

All variant metadata is stored in the `assets` table:

```sql
SELECT 
  file_name,
  variants->'thumbnail'->>'url' as thumbnail_url,
  variants->'medium'->>'url' as medium_url,
  variants->'large'->>'url' as large_url
FROM assets
WHERE scope = 'project';
```

---

## 🔄 Frontend Integration (Next Step)

Update your existing upload component to use the new endpoint:

```javascript
// OLD: Direct upload to Bunny.net
// NEW: Upload to process-image endpoint

const formData = new FormData();
formData.append('file', imageFile);
formData.append('scope', 'project');
formData.append('project_id', projectId);
formData.append('brandFilter', 'vibrant');

const response = await fetch('/api/uploads/process-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();

// Save to database
await fetch('/api/assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scope: 'project',
    project_id: projectId,
    file_name: result.data.fileName,
    storage_path: result.data.variants.original.path,
    variants: result.data.variants,
    width: result.data.originalMetadata.width,
    height: result.data.originalMetadata.height
  })
});
```

---

## 📚 Full Documentation

See **`docs/image-processing-guide.md`** for:
- Detailed API reference
- Performance optimization tips
- Troubleshooting guide
- Migration to Bunny Image Optimizer (when ready)

---

## 💰 Cost Savings

| Solution | Monthly Cost |
|----------|--------------|
| **Current (Sharp)** | $0 |
| Bunny Image Optimizer | $9.50 |
| Cloudinary | $89+ |
| AWS Lambda + S3 | ~$5-20 |

**Recommendation**: Use free Sharp processing now, upgrade to Bunny Image Optimizer ($9.50/month) when you have paying customers for edge processing.

---

## ✅ Testing Checklist

- [ ] Test local processing: `node test-image-processing.js image.jpg`
- [ ] Upload via cURL with project scope
- [ ] Verify variants uploaded to Bunny.net CDN
- [ ] Check database has variant metadata
- [ ] Test different brand filters
- [ ] Try with PNG and JPEG images
- [ ] Test large images (> 5MB)

---

## 🆘 Troubleshooting

**"Sharp processing failed"**
→ Check image format is JPEG/PNG and under 50MB

**"Bunny.net upload failed"**
→ Verify BUNNY_API_KEY in .env is the Storage API Key

**"Database error"**
→ Run: `node database/apply_variants_migration.js`

**Need help?**
→ Check `docs/image-processing-guide.md` for detailed troubleshooting

---

## 🎯 What's Next?

1. **Test the pipeline** with a sample image
2. **Update frontend** to use new endpoint
3. **Add watermark** (optional)
4. **Later**: Migrate to Bunny Image Optimizer when scaling

---

**Ready to test? Run this:**

```bash
cd content-engine/backend
node test-image-processing.js /path/to/test-image.jpg
```

🎉 **Image processing pipeline is fully implemented and ready to use!**

