/**
 * Bunny.net Storage Service
 * Handles file uploads, CDN delivery, and image processing
 */

export interface BunnyStorageConfig {
  storageZone: string;
  storagePassword: string;
  cdnUrl: string;
  region: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  error?: string;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'gif';
  crop?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west';
}

export class BunnyStorageService {
  private config: BunnyStorageConfig;

  constructor(config: BunnyStorageConfig) {
    this.config = config;
  }

  /**
   * Upload file to Bunny.net storage
   */
  async uploadFile(
    file: File | Buffer,
    path: string,
    options: { 
      contentType?: string;
      makePublic?: boolean;
    } = {}
  ): Promise<UploadResult> {
    try {
      const { contentType = 'application/octet-stream', makePublic = true } = options;
      
      // Prepare the upload URL
      const uploadUrl = `https://storage.bunnycdn.com/${this.config.storageZone}/${path}`;
      
      // Create headers
      const headers: Record<string, string> = {
        'AccessKey': this.config.storagePassword,
        'Content-Type': contentType,
      };

      if (makePublic) {
        headers['X-Override-Content-Type'] = contentType;
      }

      // Upload the file
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      // Return the CDN URL
      const cdnUrl = `${this.config.cdnUrl}/${path}`;
      
      return {
        success: true,
        url: cdnUrl,
        filename: path.split('/').pop(),
        size: file instanceof File ? file.size : file.length,
      };

    } catch (error) {
      console.error('❌ Bunny.net upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete file from Bunny.net storage
   */
  async deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteUrl = `https://storage.bunnycdn.com/${this.config.storageZone}/${path}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.config.storagePassword,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Bunny.net delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Get optimized image URL with processing parameters
   */
  getOptimizedImageUrl(
    path: string,
    options: ImageProcessingOptions = {}
  ): string {
    const { width, height, quality, format, crop, gravity } = options;
    
    let url = `${this.config.cdnUrl}/${path}`;
    const params: string[] = [];

    if (width) params.push(`w=${width}`);
    if (height) params.push(`h=${height}`);
    if (quality) params.push(`q=${quality}`);
    if (format) params.push(`f=${format}`);
    if (crop) params.push(`c=${crop}`);
    if (gravity) params.push(`g=${gravity}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return url;
  }

  /**
   * Generate thumbnail URL
   */
  getThumbnailUrl(path: string, size: number = 300): string {
    return this.getOptimizedImageUrl(path, {
      width: size,
      height: size,
      quality: 80,
      format: 'webp',
      crop: 'center',
    });
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string = ''): Promise<{
    success: boolean;
    files?: Array<{
      name: string;
      size: number;
      lastModified: string;
      isDirectory: boolean;
    }>;
    error?: string;
  }> {
    try {
      const listUrl = `https://storage.bunnycdn.com/${this.config.storageZone}/${path}`;
      
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'AccessKey': this.config.storagePassword,
        },
      });

      if (!response.ok) {
        throw new Error(`List failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        files: data.map((item: any) => ({
          name: item.ObjectName,
          size: item.Length,
          lastModified: item.LastChanged,
          isDirectory: item.IsDirectory,
        })),
      };

    } catch (error) {
      console.error('❌ Bunny.net list error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'List failed',
      };
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(path: string): Promise<{
    success: boolean;
    info?: {
      size: number;
      lastModified: string;
      contentType: string;
    };
    error?: string;
  }> {
    try {
      const infoUrl = `https://storage.bunnycdn.com/${this.config.storageZone}/${path}`;
      
      const response = await fetch(infoUrl, {
        method: 'HEAD',
        headers: {
          'AccessKey': this.config.storagePassword,
        },
      });

      if (!response.ok) {
        throw new Error(`Info failed: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        info: {
          size: parseInt(response.headers.get('content-length') || '0'),
          lastModified: response.headers.get('last-modified') || '',
          contentType: response.headers.get('content-type') || '',
        },
      };

    } catch (error) {
      console.error('❌ Bunny.net info error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Info failed',
      };
    }
  }
}

// Export singleton instance
export const bunnyStorage = new BunnyStorageService({
  storageZone: process.env.BUNNY_STORAGE_ZONE || '',
  storagePassword: process.env.BUNNY_STORAGE_PASSWORD || '',
  cdnUrl: process.env.BUNNY_CDN_URL || '',
  region: process.env.BUNNY_REGION || 'ny',
});
