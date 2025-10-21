// [2025-10-08] - Created Sharp-based image processing service for resize, crop, watermark, and brand filters
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');

class ImageProcessingService {
  constructor() {
    // Image variant configurations
    this.variants = {
      thumbnail: { width: 400, height: 300, fit: 'cover', quality: 80 },
      medium: { width: 1280, height: 720, fit: 'inside', quality: 85 },
      large: { width: 1920, height: 1080, fit: 'inside', quality: 90 },
      original: { quality: 95 } // Keep original size, optimize only
    };

    // Brand filter presets
    this.brandFilters = {
      vibrant: { saturation: 1.3, brightness: 1.05 },
      muted: { saturation: 0.7, brightness: 0.95 },
      warm: { saturation: 1.1, brightness: 1.02 },
      cool: { saturation: 0.9, brightness: 0.98 },
      neutral: { saturation: 1.0, brightness: 1.0 }
    };
  }

  /**
   * Process image and generate all variants
   * @param {Buffer} inputBuffer - Input image buffer
   * @param {Object} options - Processing options
   * @returns {Object} - Processed variants with metadata
   */
  async processImage(inputBuffer, options = {}) {
    try {
      const {
        generateVariants = true,
        addWatermark = false,
        watermarkPath = null,
        brandFilter = 'neutral',
        cropConfig = null
      } = options;

      // Get image metadata
      const metadata = await sharp(inputBuffer).metadata();
      
      const results = {};

      // Generate each variant
      for (const [variantName, config] of Object.entries(this.variants)) {
        if (!generateVariants && variantName !== 'original') continue;

        let image = sharp(inputBuffer);

        // Apply crop if specified
        if (cropConfig && cropConfig.width && cropConfig.height) {
          image = image.extract({
            left: cropConfig.x || 0,
            top: cropConfig.y || 0,
            width: cropConfig.width,
            height: cropConfig.height
          });
        }

        // Resize for non-original variants
        if (variantName !== 'original' && config.width) {
          image = image.resize(config.width, config.height, { 
            fit: config.fit || 'inside',
            withoutEnlargement: true 
          });
        }

        // Apply brand filters
        if (brandFilter && this.brandFilters[brandFilter]) {
          const filter = this.brandFilters[brandFilter];
          image = image.modulate({
            brightness: filter.brightness,
            saturation: filter.saturation
          });
        }

        // Add watermark if requested
        if (addWatermark && watermarkPath) {
          try {
            const watermark = await sharp(watermarkPath)
              .resize({ width: Math.floor((config.width || metadata.width) * 0.2) })
              .toBuffer();

            image = image.composite([{
              input: watermark,
              gravity: 'southeast',
              blend: 'over'
            }]);
          } catch (watermarkError) {
            console.warn(`⚠️ Watermark failed for ${variantName}:`, watermarkError.message);
          }
        }

        // Convert to appropriate format and compress
        const format = metadata.format === 'png' ? 'png' : 'jpeg';
        if (format === 'jpeg') {
          image = image.jpeg({ quality: config.quality, progressive: true });
        } else {
          image = image.png({ quality: config.quality, progressive: true });
        }

        // Generate buffer
        const processedBuffer = await image.toBuffer();
        const processedMetadata = await sharp(processedBuffer).metadata();

        results[variantName] = {
          buffer: processedBuffer,
          metadata: {
            width: processedMetadata.width,
            height: processedMetadata.height,
            format: processedMetadata.format,
            size: processedBuffer.length
          }
        };
      }

      return {
        success: true,
        variants: results,
        originalMetadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: inputBuffer.length
        }
      };
    } catch (error) {
      console.error('❌ Image processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Resize image to specific dimensions
   * @param {Buffer} inputBuffer - Input image buffer
   * @param {Number} width - Target width
   * @param {Number} height - Target height
   * @param {String} fit - Resize fit mode (cover, contain, inside, outside, fill)
   */
  async resize(inputBuffer, width, height, fit = 'inside') {
    try {
      const buffer = await sharp(inputBuffer)
        .resize(width, height, { fit, withoutEnlargement: true })
        .toBuffer();

      const metadata = await sharp(buffer).metadata();
      
      return {
        buffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        }
      };
    } catch (error) {
      throw new Error(`Resize failed: ${error.message}`);
    }
  }

  /**
   * Crop image to specific area
   * @param {Buffer} inputBuffer - Input image buffer
   * @param {Object} cropArea - {x, y, width, height}
   */
  async crop(inputBuffer, cropArea) {
    try {
      const { x, y, width, height } = cropArea;
      
      const buffer = await sharp(inputBuffer)
        .extract({ left: x, top: y, width, height })
        .toBuffer();

      const metadata = await sharp(buffer).metadata();
      
      return {
        buffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        }
      };
    } catch (error) {
      throw new Error(`Crop failed: ${error.message}`);
    }
  }

  /**
   * Add watermark to image
   * @param {Buffer} inputBuffer - Input image buffer
   * @param {String|Buffer} watermark - Path to watermark or watermark buffer
   * @param {String} position - Position (center, north, south, east, west, northeast, northwest, southeast, southwest)
   * @param {Number} opacity - Watermark opacity (0-1)
   */
  async addWatermark(inputBuffer, watermark, position = 'southeast', opacity = 0.8) {
    try {
      let watermarkBuffer;
      
      if (typeof watermark === 'string') {
        watermarkBuffer = await sharp(watermark).toBuffer();
      } else {
        watermarkBuffer = watermark;
      }

      // Resize watermark to 20% of image width
      const imageMetadata = await sharp(inputBuffer).metadata();
      const resizedWatermark = await sharp(watermarkBuffer)
        .resize({ width: Math.floor(imageMetadata.width * 0.2) })
        .toBuffer();

      const buffer = await sharp(inputBuffer)
        .composite([{
          input: resizedWatermark,
          gravity: position,
          blend: 'over'
        }])
        .toBuffer();

      const metadata = await sharp(buffer).metadata();
      
      return {
        buffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        }
      };
    } catch (error) {
      throw new Error(`Watermark failed: ${error.message}`);
    }
  }

  /**
   * Apply brand filter to image
   * @param {Buffer} inputBuffer - Input image buffer
   * @param {String} filterName - Filter name (vibrant, muted, warm, cool, neutral)
   */
  async applyBrandFilter(inputBuffer, filterName = 'neutral') {
    try {
      const filter = this.brandFilters[filterName];
      if (!filter) {
        throw new Error(`Unknown brand filter: ${filterName}`);
      }

      const buffer = await sharp(inputBuffer)
        .modulate({
          brightness: filter.brightness,
          saturation: filter.saturation
        })
        .toBuffer();

      const metadata = await sharp(buffer).metadata();
      
      return {
        buffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length
        }
      };
    } catch (error) {
      throw new Error(`Brand filter failed: ${error.message}`);
    }
  }

  /**
   * Get image metadata without processing
   * @param {Buffer} inputBuffer - Input image buffer
   */
  async getMetadata(inputBuffer) {
    try {
      const metadata = await sharp(inputBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: inputBuffer.length,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha
      };
    } catch (error) {
      throw new Error(`Failed to read metadata: ${error.message}`);
    }
  }

  /**
   * Generate unique filename for variant
   * @param {String} originalName - Original filename
   * @param {String} variantName - Variant type (thumbnail, medium, large, original)
   */
  generateVariantFilename(originalName, variantName) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const hash = crypto.randomBytes(4).toString('hex');
    
    return `${variantName}/${baseName}_${timestamp}_${hash}${ext}`;
  }
}

module.exports = new ImageProcessingService();

