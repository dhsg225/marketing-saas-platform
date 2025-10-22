# Bunny.net CDN Setup Guide

## Overview
This guide sets up Bunny.net for file storage, CDN delivery, and image processing for the Marketing SaaS Platform.

## Prerequisites
- Bunny.net account (free tier available)
- Domain for CDN (optional, can use Bunny.net subdomain)

## Setup Steps

### 1. Create Bunny.net Account
1. **Visit**: [bunny.net](https://bunny.net)
2. **Sign up** for a free account
3. **Verify** your email address

### 2. Create Storage Zone
1. **Go to**: Storage → Storage Zones
2. **Click**: "Add Storage Zone"
3. **Configure**:
   - **Name**: `marketing-saas-storage`
   - **Region**: Choose closest to your users (e.g., "New York" for US)
   - **Replication**: Enable for better performance
4. **Click**: "Add Storage Zone"
5. **Note down**:
   - Storage Zone name
   - Password (from the storage zone details)

### 3. Create Pull Zone (CDN)
1. **Go to**: CDN → Pull Zones
2. **Click**: "Add Pull Zone"
3. **Configure**:
   - **Name**: `marketing-saas-cdn`
   - **Origin URL**: Your storage zone URL
   - **Cache Expiry**: 1 month (for images)
   - **Enable**: Gzip compression
   - **Enable**: Image optimization
4. **Click**: "Add Pull Zone"
5. **Note down**: CDN URL (e.g., `https://marketing-saas-cdn.b-cdn.net`)

### 4. Configure Environment Variables

Add these to your Vercel environment variables:

```bash
# Bunny.net Storage
BUNNY_STORAGE_ZONE=marketing-saas-storage
BUNNY_STORAGE_PASSWORD=your-storage-password
BUNNY_CDN_URL=https://marketing-saas-cdn.b-cdn.net
BUNNY_REGION=ny
```

### 5. Install Dependencies
```bash
npm install formidable @types/formidable
```

### 6. Test the Setup

#### Test File Upload
```bash
curl -X POST https://your-api-url.vercel.app/api/uploads/process-image \
  -F "file=@test-image.jpg"
```

#### Test Image Optimization
```bash
# Original image
https://marketing-saas-cdn.b-cdn.net/uploads/image.jpg

# Thumbnail (300x300)
https://marketing-saas-cdn.b-cdn.net/uploads/image.jpg?w=300&h=300&q=80&f=webp&c=center

# Medium size (800x600)
https://marketing-saas-cdn.b-cdn.net/uploads/image.jpg?w=800&h=600&q=85&f=webp
```

## Features

### Image Processing
- **Automatic optimization**: WebP conversion, quality adjustment
- **Multiple sizes**: Thumbnails, medium, large
- **Smart cropping**: Center, top, bottom, left, right
- **Format conversion**: JPEG, PNG, WebP, GIF

### CDN Benefits
- **Global delivery**: Fast loading worldwide
- **Caching**: Reduced server load
- **Compression**: Gzip and image optimization
- **HTTPS**: Secure delivery

### Storage Management
- **File uploads**: Direct to Bunny.net storage
- **File deletion**: Clean up unused files
- **File listing**: Browse uploaded assets
- **Metadata**: File info and statistics

## Cost Optimization

### Free Tier Limits
- **Storage**: 1GB free
- **Bandwidth**: 1GB/month free
- **Requests**: Unlimited

### Paid Plans
- **Storage**: $0.01/GB/month
- **Bandwidth**: $0.01/GB
- **No setup fees**

## Security

### Access Control
- **Storage passwords**: Secure API access
- **HTTPS only**: Encrypted transfers
- **Origin protection**: Prevent hotlinking

### Best Practices
- **Unique filenames**: Prevent conflicts
- **File validation**: Check file types and sizes
- **Cleanup**: Remove unused files
- **Monitoring**: Track usage and costs

## Monitoring

### Bunny.net Dashboard
- **Storage usage**: Track space consumption
- **Bandwidth**: Monitor data transfer
- **Requests**: Count API calls
- **Performance**: Response times

### Alerts
- **Storage limits**: Warn when approaching limits
- **Bandwidth spikes**: Monitor unusual usage
- **Error rates**: Track failed requests

## Troubleshooting

### Common Issues
1. **Upload failures**: Check storage credentials
2. **Slow loading**: Verify CDN configuration
3. **Image not displaying**: Check file permissions
4. **High costs**: Monitor bandwidth usage

### Debug Steps
1. **Check credentials**: Verify storage zone password
2. **Test connectivity**: Ping CDN URLs
3. **Review logs**: Check error messages
4. **Contact support**: Bunny.net support team

## Next Steps
1. Set up monitoring and alerting
2. Configure custom domain (optional)
3. Implement file cleanup automation
4. Add image processing presets
5. Set up backup strategies
