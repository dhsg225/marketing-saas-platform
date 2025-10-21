# Image Processing Pipeline Guide

## Overview

The Marketing SaaS Platform now includes a powerful **server-side image processing pipeline** using Sharp. This allows automatic generation of optimized image variants, brand filters, watermarks, and more - all without additional monthly costs.

## Features

✅ **Automatic Variant Generation**: thumbnail, medium, large, original  
✅ **Smart Compression**: JPEG quality optimization based on variant  
✅ **Brand Filters**: vibrant, muted, warm, cool, neutral  
✅ **Watermarking**: Optional watermark overlay  
✅ **Crop Support**: Custom crop areas  
✅ **Bunny.net Integration**: Automatic upload to CDN  
✅ **Database Tracking**: All variants stored in PostgreSQL

---

## Quick Start

### 1. Test Image Processing (Local)

```bash
cd content-engine/backend
node test-image-processing.js /path/to/test-image.jpg
```

This will:
- Process the image locally
- Generate all variants
- Display metadata and compression ratios
- Test all brand filters

### 2. Upload with Processing (API)

**Endpoint**: `POST /api/uploads/process-image`

**Request Type**: `multipart/form-data`

**Parameters**:
- `file` (required): Image file
- `scope`: 'project' | 'user' | 'organization' (default: 'project')
- `project_id`: UUID (if scope = 'project')
- `organization_id`: UUID (if scope = 'organization')
- `owner_user_id`: UUID (if scope = 'user')
- `generateVariants`: 'true' | 'false' (default: 'true')
- `addWatermark`: 'true' | 'false' (default: 'false')
- `brandFilter`: 'vibrant' | 'muted' | 'warm' | 'cool' | 'neutral' (default: 'neutral')
- `cropConfig`: JSON string `{"x": 0, "y": 0, "width": 500, "height": 500}` (optional)

**Example using cURL**:

```bash
curl -X POST http://localhost:5001/api/uploads/process-image \
  -F "file=@/path/to/image.jpg" \
  -F "scope=project" \
  -F "project_id=123e4567-e89b-12d3-a456-426614174000" \
  -F "generateVariants=true" \
  -F "brandFilter=vibrant"
```

**Example using JavaScript/Fetch**:

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('scope', 'project');
formData.append('project_id', projectId);
formData.append('generateVariants', 'true');
formData.append('brandFilter', 'vibrant');

const response = await fetch('http://localhost:5001/api/uploads/process-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data.variants);
```

**Response**:

```json
{
  "success": true,
  "data": {
    "variants": {
      "thumbnail": {
        "url": "https://marketing-saas-assets.b-cdn.net/project/123/thumbnail_1234567890_abc123_image.jpg",
        "path": "project/123/thumbnail_1234567890_abc123_image.jpg",
        "width": 400,
        "height": 300,
        "size": 45678,
        "format": "jpeg"
      },
      "medium": { ... },
      "large": { ... },
      "original": { ... }
    },
    "originalMetadata": {
      "width": 4000,
      "height": 3000,
      "format": "jpeg",
      "size": 2456789
    },
    "fileName": "image.jpg",
    "scope": "project",
    "basePath": "project/123"
  }
}
```

---

## Image Variants

### Default Configurations

| Variant | Max Width | Max Height | Fit Mode | Quality | Use Case |
|---------|-----------|------------|----------|---------|----------|
| **thumbnail** | 400px | 300px | cover | 80% | Gallery thumbnails, previews |
| **medium** | 1280px | 720px | inside | 85% | Web display, blog posts |
| **large** | 1920px | 1080px | inside | 90% | Full screen, hero images |
| **original** | original | original | - | 95% | Downloads, print quality |

### Fit Modes

- **cover**: Crop to exact dimensions (may crop image)
- **inside**: Resize to fit within dimensions (maintains aspect ratio)
- **contain**: Similar to inside but adds padding if needed
- **outside**: Resize to cover dimensions, may overflow
- **fill**: Stretch to exact dimensions (may distort)

---

## Brand Filters

Apply consistent brand aesthetics across all images:

### Available Filters

| Filter | Saturation | Brightness | Best For |
|--------|------------|------------|----------|
| **vibrant** | +30% | +5% | Social media, energetic content |
| **muted** | -30% | -5% | Professional, minimalist designs |
| **warm** | +10% | +2% | Food, lifestyle, hospitality |
| **cool** | -10% | -2% | Technology, corporate, finance |
| **neutral** | 0% | 0% | Natural, no modifications |

### Usage Example

```javascript
formData.append('brandFilter', 'vibrant');
```

---

## Watermarking

### Setup

1. Place your watermark image in `/content-engine/backend/assets/watermark.png`
2. Recommended: PNG with transparency, white/light color
3. Watermark will be auto-resized to 20% of image width

### Enable Watermarking

```javascript
formData.append('addWatermark', 'true');
```

### Position Options

- `southeast` (default): Bottom right corner
- `southwest`: Bottom left corner
- `northeast`: Top right corner
- `northwest`: Top left corner
- `center`: Center of image

To customize position, modify the watermark code in `imageProcessingService.js`.

---

## Cropping

### Crop Before Processing

```javascript
const cropConfig = {
  x: 100,      // Left offset in pixels
  y: 100,      // Top offset in pixels
  width: 1000, // Crop width
  height: 800  // Crop height
};

formData.append('cropConfig', JSON.stringify(cropConfig));
```

This crops the image **before** generating variants, so all variants will use the cropped version.

---

## Database Schema

### Assets Table

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  scope TEXT,
  file_name TEXT,
  storage_path TEXT,
  variants JSONB,  -- NEW: Stores all variant metadata
  ...
);
```

### Variants Structure

```json
{
  "thumbnail": {
    "url": "https://cdn.example.com/thumbnail.jpg",
    "path": "project/123/thumbnail.jpg",
    "width": 400,
    "height": 300,
    "size": 45678,
    "format": "jpeg"
  },
  "medium": { ... },
  "large": { ... },
  "original": { ... }
}
```

### Querying Variants

```javascript
// Get assets with specific variant
const result = await query(
  `SELECT * FROM assets WHERE variants->>'thumbnail' IS NOT NULL`
);

// Get thumbnail URL
const thumbnailUrl = asset.variants.thumbnail.url;
```

---

## Performance Optimization

### Tips for Best Performance

1. **Client-Side Compression** (Optional): Add browser-side compression before upload
   ```javascript
   import imageCompression from 'browser-image-compression';
   const compressed = await imageCompression(file, { maxSizeMB: 2 });
   ```

2. **Selective Variants**: Only generate needed sizes
   ```javascript
   formData.append('generateVariants', 'false'); // Original only
   ```

3. **Batch Processing**: Process multiple images in parallel
   ```javascript
   const uploads = files.map(file => uploadAndProcess(file));
   await Promise.all(uploads);
   ```

4. **CDN Caching**: Bunny.net automatically caches all variants

---

## Cost Comparison

| Method | Setup | Monthly | Processing Speed | Control |
|--------|-------|---------|------------------|---------|
| **Sharp (Current)** | Free | $0 | Fast (server CPU) | Full |
| **Bunny Image Optimizer** | Free | $9.50 | Very Fast (edge) | Limited |
| **AWS Lambda** | Free tier | ~$5-20 | Medium | Full |
| **Cloudinary** | Free tier | $89+ | Very Fast | Full |

**Current Setup**: Perfect for startups and early stage. Migrate to Bunny Image Optimizer when scaling.

---

## Frontend Integration Example

### React Component

```jsx
import React, { useState } from 'react';

function ImageUploader({ projectId }) {
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scope', 'project');
    formData.append('project_id', projectId);
    formData.append('brandFilter', 'vibrant');

    try {
      const response = await fetch('/api/uploads/process-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setVariants(result.data.variants);
        
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
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Processing...</p>}
      {variants && (
        <div>
          <h3>Uploaded Successfully!</h3>
          <img src={variants.thumbnail.url} alt="Thumbnail" />
        </div>
      )}
    </div>
  );
}
```

---

## Troubleshooting

### Common Issues

**1. "Sharp processing failed"**
- Check image format is supported (JPEG, PNG, WebP, GIF, SVG)
- Verify file size is under 50MB limit
- Check server has enough memory

**2. "Bunny.net upload failed"**
- Verify `BUNNY_API_KEY` is the Storage API Key (not CDN API Key)
- Check storage zone name matches
- Verify Singapore region endpoint

**3. "Database insert failed"**
- Run migration: `node database/apply_variants_migration.js`
- Check variants column exists: `\d assets` in psql

**4. "Out of memory"**
- Reduce max file size in multer config
- Process images sequentially instead of parallel
- Increase Node.js memory: `node --max-old-space-size=4096 server.js`

---

## Next Steps

### Future Enhancements

1. **AI Background Removal**: Integrate with Remove.bg API
2. **Smart Cropping**: AI-powered face detection and centering
3. **Format Conversion**: Auto-convert to WebP for browsers that support it
4. **Lazy Processing**: Generate variants on-demand instead of upfront
5. **Image Analytics**: Track which variants are most used

### Migrate to Bunny Image Optimizer (When Ready)

When you have paying customers and want edge processing:

1. Sign up for Bunny Image Optimizer ($9.50/month)
2. Update URLs to use optimization parameters: `?width=400&height=300&aspect_ratio=4:3`
3. Remove server-side processing
4. Keep variant metadata in database for tracking

---

## API Reference

### Image Processing Service

```javascript
const imageProcessingService = require('./services/imageProcessingService');

// Process with all options
const result = await imageProcessingService.processImage(buffer, {
  generateVariants: true,
  addWatermark: false,
  watermarkPath: './assets/watermark.png',
  brandFilter: 'vibrant',
  cropConfig: { x: 0, y: 0, width: 1000, height: 800 }
});

// Individual functions
const resized = await imageProcessingService.resize(buffer, 800, 600, 'inside');
const cropped = await imageProcessingService.crop(buffer, { x: 0, y: 0, width: 500, height: 500 });
const watermarked = await imageProcessingService.addWatermark(buffer, watermarkPath, 'southeast');
const filtered = await imageProcessingService.applyBrandFilter(buffer, 'vibrant');
const metadata = await imageProcessingService.getMetadata(buffer);
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Sharp documentation: https://sharp.pixelplumbing.com/
3. Check Bunny.net status: https://status.bunny.net/

---

**Last Updated**: October 8, 2025  
**Version**: 1.0.0

