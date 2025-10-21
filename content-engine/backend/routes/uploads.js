const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const imageProcessingService = require('../services/imageProcessingService');

// [2025-10-08] - Added multer for handling multipart file uploads with image processing
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// [2024-10-08] - Added Bunny.net storage integration for cost-effective asset hosting
// GET /api/uploads/signed-url?fileName=&contentType=&scope=&organization_id=&project_id=&owner_user_id=
router.get('/signed-url', async (req, res) => {
  const { fileName, contentType, scope = 'project', organization_id, project_id, owner_user_id } = req.query;
  try {
    // Check for Bunny.net configuration first (preferred)
    const bunnyApiKey = process.env.BUNNY_API_KEY;
    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE;
    const bunnyCdnHostname = process.env.BUNNY_CDN_HOSTNAME;

    if (bunnyApiKey && bunnyStorageZone && bunnyCdnHostname) {
      // Build scoped path for Bunny.net storage
      const parts = [scope];
      if (scope === 'organization' && organization_id) parts.push(organization_id);
      if (scope === 'project' && project_id) parts.push(project_id);
      if (scope === 'user' && owner_user_id) parts.push(owner_user_id);
      const safeName = (fileName || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filePath = parts.join('/') + '/' + Date.now() + '_' + crypto.randomBytes(4).toString('hex') + '_' + safeName;

      // Bunny.net uses direct PUT uploads (no pre-signed URLs needed)
      // Return the storage endpoint and metadata for client-side upload
      const uploadUrl = `https://sg.storage.bunnycdn.com/${bunnyStorageZone}/${filePath}`;
      const publicUrl = `https://${bunnyCdnHostname}/${filePath}`;

      return res.json({ 
        success: true, 
        data: { 
          uploadUrl, 
          publicUrl, 
          key: filePath,
          headers: {
            'AccessKey': bunnyApiKey, // This should be the Storage API Key (storage zone password)
            'Content-Type': contentType || 'application/octet-stream'
          }
        } 
      });
    }

    // Fallback to AWS S3 if configured
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return res.status(501).json({ 
        success: false, 
        error: 'No storage configured on server.', 
        hint: 'Set BUNNY_API_KEY + BUNNY_STORAGE_ZONE + BUNNY_CDN_HOSTNAME or AWS S3 credentials' 
      });
    }

    // Lazy import AWS SDK v3 modules so server can run without them until configured
    let S3Client, PutObjectCommand, getSignedUrl;
    try {
      ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
      ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
    } catch (e) {
      return res.status(501).json({ success: false, error: 'AWS SDK not installed on server.', hint: 'npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner' });
    }

    const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });

    // Build key with scope folders
    const parts = [scope];
    if (scope === 'organization' && organization_id) parts.push(organization_id);
    if (scope === 'project' && project_id) parts.push(project_id);
    if (scope === 'user' && owner_user_id) parts.push(owner_user_id);
    const safeName = (fileName || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = parts.join('/') + '/' + Date.now() + '_' + crypto.randomBytes(4).toString('hex') + '_' + safeName;

    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType || 'application/octet-stream' });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return res.json({ success: true, data: { uploadUrl: url, key, publicUrl } });
  } catch (err) {
    console.error('Signed URL error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [2025-10-08] - New endpoint for processed image uploads with Sharp
// POST /api/uploads/process-image
router.post('/process-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const { 
      scope = 'project', 
      organization_id, 
      project_id, 
      owner_user_id,
      generateVariants = 'true',
      addWatermark = 'false',
      brandFilter = 'neutral',
      cropConfig
    } = req.body;

    // Check for Bunny.net configuration
    const bunnyApiKey = process.env.BUNNY_API_KEY;
    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE;
    const bunnyCdnHostname = process.env.BUNNY_CDN_HOSTNAME;

    if (!bunnyApiKey || !bunnyStorageZone || !bunnyCdnHostname) {
      return res.status(501).json({ 
        success: false, 
        error: 'Bunny.net storage not configured',
        hint: 'Set BUNNY_API_KEY, BUNNY_STORAGE_ZONE, and BUNNY_CDN_HOSTNAME'
      });
    }

    // Process image with Sharp
    console.log('🖼️  Processing image:', req.file.originalname);
    const processingOptions = {
      generateVariants: generateVariants === 'true',
      addWatermark: addWatermark === 'true',
      brandFilter: brandFilter || 'neutral',
      cropConfig: cropConfig ? JSON.parse(cropConfig) : null
    };

    const processResult = await imageProcessingService.processImage(
      req.file.buffer, 
      processingOptions
    );

    if (!processResult.success) {
      return res.status(500).json({ success: false, error: 'Image processing failed' });
    }

    // Build scoped path for Bunny.net storage
    const parts = [scope];
    if (scope === 'organization' && organization_id) parts.push(organization_id);
    if (scope === 'project' && project_id) parts.push(project_id);
    if (scope === 'user' && owner_user_id) parts.push(owner_user_id);
    const basePath = parts.join('/');

    // Upload all variants to Bunny.net
    const uploadedVariants = {};
    const uploadPromises = [];

    for (const [variantName, variantData] of Object.entries(processResult.variants)) {
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const timestamp = Date.now();
      const hash = crypto.randomBytes(4).toString('hex');
      const ext = variantData.metadata.format === 'png' ? '.png' : '.jpg';
      const fileName = `${variantName}_${timestamp}_${hash}_${safeName.replace(/\.[^.]+$/, '')}${ext}`;
      const filePath = `${basePath}/${fileName}`;
      const uploadUrl = `https://sg.storage.bunnycdn.com/${bunnyStorageZone}/${filePath}`;
      const publicUrl = `https://${bunnyCdnHostname}/${filePath}`;

      const uploadPromise = fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': bunnyApiKey,
          'Content-Type': variantData.metadata.format === 'png' ? 'image/png' : 'image/jpeg'
        },
        body: variantData.buffer
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed for ${variantName}: ${response.status} ${errorText}`);
        }
        
        uploadedVariants[variantName] = {
          url: publicUrl,
          path: filePath,
          width: variantData.metadata.width,
          height: variantData.metadata.height,
          size: variantData.metadata.size,
          format: variantData.metadata.format
        };
        
        console.log(`✅ Uploaded ${variantName}: ${publicUrl}`);
      });

      uploadPromises.push(uploadPromise);
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Return response with all uploaded variants
    res.json({
      success: true,
      data: {
        variants: uploadedVariants,
        originalMetadata: processResult.originalMetadata,
        fileName: req.file.originalname,
        scope,
        basePath
      }
    });

  } catch (error) {
    console.error('❌ Process-image error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;


