# Bunny.net Storage Setup Guide

## Step 1: Create Storage Zone

1. Log in to your Bunny.net dashboard at https://dash.bunny.net/
2. Navigate to **Storage** → **Add Storage Zone**
3. Enter a name (e.g., `marketing-saas-assets`)
4. Choose your region (Europe/Frankfurt is default, cheapest)
5. Click **Add Storage Zone**

## Step 2: Get Your Credentials

After creating the storage zone, you'll need three pieces of information:

### 1. Storage API Key (Storage Zone Password)
**Important:** You need the **Storage API Key** (storage zone password), NOT the global API key!

1. Go to your **Storage Zone** → **FTP & API Access** tab
2. Copy the **Storage API Key** (also called "storage zone password")
```
BUNNY_API_KEY=your_storage_api_key_from_ftp_tab
```

### 2. Storage Zone Name
- Found in the **Storage** section
- Example: `marketing-saas-assets`
```
BUNNY_STORAGE_ZONE=marketing-saas-assets
```

### 3. CDN Hostname (Pull Zone)
You need to create a Pull Zone to serve your files via CDN:

1. Go to **CDN** → **Add Pull Zone**
2. Choose **"I want to connect my own storage zone"**
3. Select your storage zone (`marketing-saas-assets`)
4. Enter a name (e.g., `marketing-saas-cdn`)
5. Click **Add Pull Zone**
6. Copy the hostname (e.g., `marketing-saas-cdn.b-cdn.net`)

```
BUNNY_CDN_HOSTNAME=marketing-saas-cdn.b-cdn.net
```

## Step 3: Add to .env File

Create or update `content-engine/backend/.env`:

```bash
# Bunny.net Configuration
BUNNY_API_KEY=9c760586-35c3-4323-85df-20ce89f136dd3b3fd1a3-d61f-4f17-b325-7b5aa278d59b
BUNNY_STORAGE_ZONE=marketing-saas-assets
BUNNY_CDN_HOSTNAME=marketing-saas-cdn.b-cdn.net
```

## Step 4: Enable Image Optimization (Optional - $9.50/month)

1. In your Pull Zone settings, find **"Bunny Optimizer"**
2. Enable it for automatic WebP conversion and resizing
3. You can now use URL parameters like:
   ```
   https://marketing-saas-cdn.b-cdn.net/project/123/image.jpg?width=800&height=600
   ```

## Step 5: Test Upload

1. Restart your backend server: `cd content-engine/backend && node server.js`
2. Open your frontend
3. Go to Playbook Manager → Asset Library
4. Click **Add Asset**
5. Choose a file and click **Upload**

The file should upload to Bunny.net and appear in the list!

## Pricing Summary

- **Storage**: $0.01/GB (1000GB = $10/month)
- **Bandwidth**: $0.01/GB (1000GB = $10/month)
- **Image Optimizer**: $9.50/month (optional)
- **Minimum**: $1/month

## Troubleshooting

### Upload fails with 401 Unauthorized
- Check your BUNNY_API_KEY is correct
- Verify the API key has write permissions

### Upload fails with 404 Not Found
- Check your BUNNY_STORAGE_ZONE name matches exactly
- Ensure the storage zone exists in your dashboard

### Files upload but don't display
- Check your BUNNY_CDN_HOSTNAME is correct
- Wait 1-2 minutes for CDN propagation
- Try accessing the file directly: `https://your-cdn.b-cdn.net/test.jpg`

