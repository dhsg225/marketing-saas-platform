# Bunny.net Storage Integration

## Overview

Bunny.net has been integrated as the primary cloud storage provider for the Marketing SaaS Platform's Multi-Scoped Image Library. This provides cost-effective storage ($0.01/GB), global CDN delivery, and optional image optimization.

## Architecture

### Upload Flow
1. **Frontend Request**: User selects a file in Asset Library
2. **Backend Signs**: Backend generates upload URL with scoped path
3. **Direct Upload**: Frontend uploads directly to Bunny.net Storage
4. **Database Record**: Backend creates asset record with CDN URL
5. **CDN Delivery**: Files served globally via Bunny CDN

### Scoped Storage Paths

Files are organized by scope for access control:

```
project/{project_id}/{timestamp}_{hash}_{filename}
user/{user_id}/{timestamp}_{hash}_{filename}
organization/{org_id}/{timestamp}_{hash}_{filename}
```

## API Integration

### Backend Endpoint: `/api/uploads/signed-url`

**Request:**
```
GET /api/uploads/signed-url?fileName=hero.jpg&contentType=image/jpeg&scope=project&project_id=123
```

**Response (Bunny.net):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.bunnycdn.com/zone-name/project/123/1234567890_abc123_hero.jpg",
    "publicUrl": "https://your-cdn.b-cdn.net/project/123/1234567890_abc123_hero.jpg",
    "key": "project/123/1234567890_abc123_hero.jpg",
    "headers": {
      "AccessKey": "your-bunny-api-key",
      "Content-Type": "image/jpeg"
    }
  }
}
```

### Frontend Upload

```typescript
// 1. Request signed URL
const res = await fetch(`/api/uploads/signed-url?fileName=${file.name}&...`);
const { uploadUrl, publicUrl, headers } = (await res.json()).data;

// 2. Upload to Bunny.net
await fetch(uploadUrl, { 
  method: 'PUT', 
  headers: headers,  // Includes AccessKey
  body: file 
});

// 3. Save asset record
await fetch('/api/assets', {
  method: 'POST',
  body: JSON.stringify({ 
    scope: 'project',
    storage_path: publicUrl,
    file_name: file.name
  })
});
```

## Configuration

### Environment Variables

Required in `content-engine/backend/.env`:

```bash
# Bunny.net Configuration
BUNNY_API_KEY=your-api-key-here
BUNNY_STORAGE_ZONE=your-storage-zone-name
BUNNY_CDN_HOSTNAME=your-cdn.b-cdn.net
```

### Fallback to AWS S3

The system supports fallback to AWS S3 if Bunny.net is not configured:

```bash
# AWS S3 Configuration (optional fallback)
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Image Optimization

### Bunny Optimizer ($9.50/month)

When enabled, images can be transformed via URL parameters:

```
https://your-cdn.b-cdn.net/path/image.jpg?width=800&height=600&format=webp
```

**Supported Parameters:**
- `width`, `height` - Resize dimensions
- `aspect_ratio` - Crop to aspect ratio (e.g., `16:9`)
- `quality` - JPEG quality (1-100)
- `format` - Convert format (`webp`, `avif`, `jpeg`)
- `blur` - Blur radius
- `sharpen` - Sharpen amount

### Example Use Cases

**Thumbnail generation:**
```
<img src="https://cdn.b-cdn.net/hero.jpg?width=300&height=200&aspect_ratio=3:2" />
```

**WebP conversion:**
```
<img src="https://cdn.b-cdn.net/hero.jpg?format=webp&quality=85" />
```

**Responsive images:**
```html
<picture>
  <source srcset="hero.jpg?width=1920" media="(min-width: 1200px)">
  <source srcset="hero.jpg?width=1024" media="(min-width: 768px)">
  <img src="hero.jpg?width=640" alt="Hero">
</picture>
```

## Cost Analysis

### Monthly Cost Estimates

| Usage | Storage | Bandwidth | Optimizer | Total |
|-------|---------|-----------|-----------|-------|
| **Development** | 10GB = $0.10 | 50GB = $0.50 | - | **$1.00** (min) |
| **Small Agency** | 100GB = $1.00 | 500GB = $5.00 | $9.50 | **$15.50** |
| **Medium Agency** | 500GB = $5.00 | 2TB = $20.00 | $9.50 | **$34.50** |
| **Large Agency** | 2TB = $20.00 | 10TB = $100.00 | $9.50 | **$129.50** |

### Comparison with Alternatives

| Provider | Free Tier | Paid Start | Image Optimization | Global CDN |
|----------|-----------|------------|-------------------|------------|
| **Bunny.net** | $1 trial | $1/mo | ✅ $9.50/mo | ✅ 119 PoPs |
| Cloudinary | 25GB free | $99/mo | ✅ Included | ✅ |
| AWS S3 + CloudFront | 5GB/12mo | ~$25/mo | ❌ (Lambda@Edge) | ✅ |
| Supabase Storage | 1GB free | $25/mo | ❌ | ❌ |

## Security

### Access Control

- **Storage API Key**: Kept server-side only, never exposed to frontend
- **Scoped Paths**: Files organized by scope for logical separation
- **Database RLS**: PostgreSQL Row Level Security enforces access control
- **CDN Public**: All uploaded files are publicly accessible via CDN URL

### Recommendations

1. **Sensitive Files**: Use database `RLS` policies to restrict access
2. **Signed URLs**: Consider implementing expiring signed URLs for private files
3. **Watermarking**: Enable Bunny Optimizer watermark for client-specific branding
4. **Audit Logs**: Track asset downloads and usage (future enhancement)

## Setup Instructions

See [`content-engine/backend/BUNNY_SETUP.md`](../content-engine/backend/BUNNY_SETUP.md) for complete setup guide.

## Next Steps

- [ ] **User completes Bunny.net setup** (create storage zone, add credentials)
- [ ] **Test upload flow** (upload image via Asset Library)
- [ ] **Enable Optimizer** (optional, $9.50/month)
- [ ] **Implement URL transformations** (frontend helper for resizing)
- [ ] **Add image processing pipeline** (server-side manipulation)
- [ ] **AI image generation** (DALL-E integration)

## Troubleshooting

### 501 Not Configured
Backend returns 501 if `BUNNY_API_KEY`, `BUNNY_STORAGE_ZONE`, or `BUNNY_CDN_HOSTNAME` are missing.

**Fix:** Add credentials to `.env` and restart backend.

### 401 Unauthorized
Bunny.net rejects upload with 401 if API key is invalid.

**Fix:** Verify API key in Bunny.net dashboard → Account → API.

### 404 Not Found
Upload fails with 404 if storage zone name is incorrect.

**Fix:** Check storage zone name exactly matches dashboard.

### CORS Errors
Frontend may encounter CORS errors when uploading directly to Bunny.net.

**Fix:** Enable CORS in Bunny.net storage zone settings:
1. Go to Storage → Your Zone → Edge Rules
2. Add rule: `Access-Control-Allow-Origin: *` (or your domain)

## References

- [Bunny.net Storage API Docs](https://docs.bunny.net/reference/storage-api)
- [Bunny.net Optimizer Docs](https://support.bunny.net/hc/en-us/articles/360027448392)
- [Bunny.net Pricing](https://bunny.net/pricing/)

