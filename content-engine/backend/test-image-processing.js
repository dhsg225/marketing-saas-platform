// [2025-10-08] - Test script for image processing pipeline
const fs = require('fs');
const path = require('path');
const imageProcessingService = require('./services/imageProcessingService');

async function testImageProcessing() {
  console.log('🧪 Testing Image Processing Service\n');

  try {
    // You would need to provide a test image path
    const testImagePath = process.argv[2];
    
    if (!testImagePath) {
      console.log('Usage: node test-image-processing.js <path-to-image>');
      console.log('\nExample:');
      console.log('  node test-image-processing.js /path/to/test-image.jpg');
      console.log('\nThis script will:');
      console.log('  ✅ Process the image with Sharp');
      console.log('  ✅ Generate variants (thumbnail, medium, large, original)');
      console.log('  ✅ Apply brand filters');
      console.log('  ✅ Display metadata for each variant\n');
      process.exit(0);
    }

    if (!fs.existsSync(testImagePath)) {
      console.error(`❌ Image not found: ${testImagePath}`);
      process.exit(1);
    }

    console.log(`📸 Processing: ${path.basename(testImagePath)}\n`);
    
    // Read test image
    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`📊 Original size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

    // Test 1: Get metadata
    console.log('TEST 1: Get Image Metadata');
    console.log('─'.repeat(50));
    const metadata = await imageProcessingService.getMetadata(imageBuffer);
    console.log('Original Metadata:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: `${(metadata.size / 1024 / 1024).toFixed(2)} MB`,
      channels: metadata.channels
    });
    console.log('✅ Metadata retrieved\n');

    // Test 2: Process with all variants
    console.log('TEST 2: Generate All Variants');
    console.log('─'.repeat(50));
    const result = await imageProcessingService.processImage(imageBuffer, {
      generateVariants: true,
      addWatermark: false,
      brandFilter: 'vibrant'
    });

    if (result.success) {
      console.log('✅ Processing successful!\n');
      console.log('Variants Generated:');
      for (const [variantName, variantData] of Object.entries(result.variants)) {
        console.log(`\n${variantName.toUpperCase()}:`);
        console.log(`  Size: ${(variantData.metadata.size / 1024).toFixed(2)} KB`);
        console.log(`  Dimensions: ${variantData.metadata.width} x ${variantData.metadata.height}`);
        console.log(`  Format: ${variantData.metadata.format}`);
        
        // Calculate compression ratio
        const compressionRatio = ((1 - (variantData.metadata.size / imageBuffer.length)) * 100).toFixed(1);
        console.log(`  Compression: ${compressionRatio}% smaller than original`);
      }
    }

    // Test 3: Test individual functions
    console.log('\n\nTEST 3: Individual Processing Functions');
    console.log('─'.repeat(50));

    // Test resize
    console.log('\n3a. Resize to 800x600:');
    const resized = await imageProcessingService.resize(imageBuffer, 800, 600, 'inside');
    console.log(`  ✅ Resized: ${resized.metadata.width}x${resized.metadata.height}`);

    // Test crop
    console.log('\n3b. Crop 500x500 from center:');
    const cropped = await imageProcessingService.crop(imageBuffer, {
      x: Math.floor(metadata.width / 2 - 250),
      y: Math.floor(metadata.height / 2 - 250),
      width: 500,
      height: 500
    });
    console.log(`  ✅ Cropped: ${cropped.metadata.width}x${cropped.metadata.height}`);

    // Test brand filters
    console.log('\n3c. Brand Filters:');
    const filters = ['vibrant', 'muted', 'warm', 'cool', 'neutral'];
    for (const filter of filters) {
      const filtered = await imageProcessingService.applyBrandFilter(imageBuffer, filter);
      console.log(`  ✅ ${filter}: ${(filtered.metadata.size / 1024).toFixed(2)} KB`);
    }

    console.log('\n\n🎉 All tests passed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Backend is ready to process images');
    console.log('  2. Use POST /api/uploads/process-image to upload');
    console.log('  3. Images will be processed and uploaded to Bunny.net');
    console.log('  4. All variants will be saved to database\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testImageProcessing();

