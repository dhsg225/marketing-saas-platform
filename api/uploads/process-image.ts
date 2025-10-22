import { NextApiRequest, NextApiResponse } from 'next';
import { bunnyStorage } from '../../src/services/bunnyStorage';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Only allow image files
        return Boolean(mimetype && mimetype.startsWith('image/'));
      },
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.originalFilename?.split('.').pop() || 'jpg';
    const filename = `uploads/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to Bunny.net
    const uploadResult = await bunnyStorage.uploadFile(
      fileBuffer,
      filename,
      {
        contentType: file.mimetype || 'image/jpeg',
        makePublic: true,
      }
    );

    if (!uploadResult.success) {
      return res.status(500).json({ 
        error: 'Upload failed', 
        details: uploadResult.error 
      });
    }

    // Generate optimized URLs
    const originalUrl = uploadResult.url!;
    const thumbnailUrl = bunnyStorage.getThumbnailUrl(filename, 300);
    const mediumUrl = bunnyStorage.getOptimizedImageUrl(filename, {
      width: 800,
      height: 600,
      quality: 85,
      format: 'webp',
    });

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    res.json({
      success: true,
      asset: {
        id: `asset-${timestamp}`,
        name: file.originalFilename,
        url: originalUrl,
        thumbnailUrl,
        mediumUrl,
        size: file.size,
        type: file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ Image processing error:', error);
    res.status(500).json({
      error: 'Image processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
