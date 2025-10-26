-- ============================================================================
-- Eden AI Image Models - Seed Data (Top 10 Curated Models)
-- ============================================================================
-- Purpose: Populate ai_image_models with carefully selected AI providers
-- Created: October 23, 2025
-- ============================================================================

-- Clear existing data (safe for initial setup)
DELETE FROM ai_image_generation_logs;
DELETE FROM ai_image_models;

-- Reset sequences if needed
-- (Not applicable here since we use TEXT primary keys)

-- ============================================================================
-- TOP 10 EDEN AI MODELS - CURATED FOR MARKETING & CONTENT CREATION
-- ============================================================================

-- ============================================================================
-- 1. DALL-E 3 (OpenAI) - ENABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'openai-dall-e-3',
  'openai',
  'DALL-E 3',
  'openai',
  true,  -- ENABLED
  1,     -- First in list
  'OpenAI''s latest image generation model with exceptional prompt understanding and photorealistic quality. Best for marketing materials and professional content.',
  15,    -- ~15 seconds
  0.040, -- $0.04 per image
  '["1024x1024", "1792x1024", "1024x1792"]'::jsonb,
  '1792x1024',
  '["prompt_understanding", "photorealistic", "safety_filters", "high_quality", "text_rendering"]'::jsonb,
  'https://platform.openai.com/docs/guides/images',
  false
);

-- ============================================================================
-- 2. Stable Diffusion XL (StabilityAI) - ENABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'stabilityai-sdxl',
  'stabilityai',
  'Stable Diffusion XL',
  'stabilityai',
  true,  -- ENABLED
  2,
  'High-quality open-source model with excellent detail and artistic control. Perfect for creative and stylized content. Fast and cost-effective.',
  10,    -- ~10 seconds
  0.020, -- $0.02 per image
  '["512x512", "768x768", "1024x1024"]'::jsonb,
  '1024x1024',
  '["style_control", "fast_generation", "cost_effective", "artistic", "detailed"]'::jsonb,
  'https://platform.stability.ai/docs/api-reference',
  false
);

-- ============================================================================
-- 3. Midjourney v6 (via Apiframe) - ENABLED BY DEFAULT - YOUR CURRENT PROVIDER
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'apiframe-midjourney-v6',
  'apiframe',
  'Midjourney v6 (via Apiframe)',
  'apiframe',  -- Your existing Apiframe integration
  true,  -- ENABLED
  3,
  'Premium artistic image generation with unmatched creativity and aesthetic quality. Your current working integration via Apiframe. Ideal for social media, ads, and visual storytelling.',
  60,    -- ~60 seconds (Apiframe processing time)
  0.050, -- $0.05 per image
  '["1024x1024", "1024x1792", "1792x1024"]'::jsonb,
  '1792x1024',
  '["artistic", "creative", "high_quality", "aesthetic", "prompt_interpretation", "style_control"]'::jsonb,
  'https://docs.apiframe.pro/',
  false
);

-- ============================================================================
-- 3b. Midjourney (via Eden AI) - DISABLED BY DEFAULT - FUTURE OPTION
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'midjourney-edenai',
  'eden-midjourney',
  'Midjourney (via Eden AI)',
  'replicate/midjourney',
  false,  -- DISABLED - Enable when ready to migrate to Eden AI
  11,     -- After the original Top 10
  'Midjourney through Eden AI platform. Enable this to test Eden AI''s Midjourney integration as alternative to Apiframe. Can run both simultaneously for comparison.',
  30,    -- ~30 seconds (Eden AI processing)
  0.050, -- $0.05 per image
  '["1024x1024", "1024x1792", "1792x1024"]'::jsonb,
  '1792x1024',
  '["artistic", "creative", "high_quality", "aesthetic", "eden_ai_integration"]'::jsonb,
  'https://docs.edenai.co/',
  false
);

-- ============================================================================
-- 4. Leonardo AI - ENABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'leonardo-ai',
  'leonardo',
  'Leonardo AI',
  'leonardo',
  true,  -- ENABLED
  4,
  'Game and art-focused generation with consistent character creation. Great for illustrations, concept art, and branded content.',
  15,    -- ~15 seconds
  0.025, -- $0.025 per image
  '["512x512", "768x768", "1024x1024"]'::jsonb,
  '1024x1024',
  '["character_consistency", "game_art", "illustration", "style_presets", "fast"]'::jsonb,
  'https://docs.leonardo.ai/',
  false
);

-- ============================================================================
-- 5. SDXL (Replicate) - ENABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'replicate-sdxl',
  'replicate',
  'SDXL (Replicate)',
  'replicate',
  true,  -- ENABLED
  5,
  'Replicate-hosted Stable Diffusion XL with additional fine-tuning options. Reliable and consistent quality for production use.',
  12,    -- ~12 seconds
  0.015, -- $0.015 per image
  '["512x512", "768x768", "1024x1024"]'::jsonb,
  '1024x1024',
  '["fine_tuning", "consistent", "reliable", "production_ready", "cost_effective"]'::jsonb,
  'https://replicate.com/stability-ai/sdxl',
  false
);

-- ============================================================================
-- 6. Amazon Titan Image Generator - DISABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'amazon-titan',
  'amazon',
  'Amazon Titan Image',
  'amazon',
  false, -- DISABLED (enable if you have AWS integration)
  6,
  'AWS-powered image generation with enterprise reliability and compliance. Best for organizations already using AWS infrastructure.',
  8,     -- ~8 seconds (very fast)
  0.030, -- $0.03 per image
  '["512x512", "1024x1024"]'::jsonb,
  '1024x1024',
  '["enterprise", "compliant", "fast", "aws_integrated", "secure"]'::jsonb,
  'https://aws.amazon.com/bedrock/titan/',
  false
);

-- ============================================================================
-- 7. Google Imagen - DISABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'google-imagen',
  'google',
  'Google Imagen',
  'google',
  false, -- DISABLED (requires GCP setup)
  7,
  'Google''s photorealistic image generation with advanced understanding of complex prompts. Excellent for realistic photography needs.',
  20,    -- ~20 seconds
  0.050, -- $0.05 per image
  '["1024x1024"]'::jsonb,
  '1024x1024',
  '["photorealistic", "complex_prompts", "google_cloud", "high_quality"]'::jsonb,
  'https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview',
  false
);

-- ============================================================================
-- 8. DeepAI Text2Image - DISABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'deepai-text2img',
  'deepai',
  'DeepAI Text2Image',
  'deepai',
  false, -- DISABLED (basic quality, use for testing only)
  8,
  'Fast, basic image generation suitable for quick mockups and testing. Lower quality but very economical.',
  5,     -- ~5 seconds (very fast)
  0.010, -- $0.01 per image (very cheap)
  '["512x512"]'::jsonb,
  '512x512',
  '["fast", "economical", "basic", "testing", "mockups"]'::jsonb,
  'https://deepai.org/machine-learning-model/text2img',
  false
);

-- ============================================================================
-- 9. Runware SDXL - DISABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'runware-sdxl',
  'runware',
  'Runware SDXL',
  'runware',
  false, -- DISABLED (alternative SDXL host)
  9,
  'Optimized SDXL deployment with focus on speed and efficiency. Good alternative to StabilityAI''s official SDXL.',
  7,     -- ~7 seconds
  0.018, -- $0.018 per image
  '["512x512", "768x768", "1024x1024"]'::jsonb,
  '1024x1024',
  '["optimized", "fast", "efficient", "sdxl_variant"]'::jsonb,
  'https://runware.ai/docs',
  false
);

-- ============================================================================
-- 10. DALL-E 2 (OpenAI) - DISABLED BY DEFAULT
-- ============================================================================
INSERT INTO ai_image_models (
  id, provider, name, model_identifier, enabled, display_order,
  description, estimated_time, cost_per_generation,
  supported_resolutions, max_resolution, features,
  documentation_url, requires_api_key
) VALUES (
  'openai-dall-e-2',
  'openai',
  'DALL-E 2',
  'openai/dall-e-2',
  false, -- DISABLED (superseded by DALL-E 3, keep for legacy/cost savings)
  10,
  'Previous generation OpenAI model. Reliable quality and faster than DALL-E 3, but less sophisticated prompt understanding.',
  10,    -- ~10 seconds
  0.020, -- $0.02 per image (half the cost of DALL-E 3)
  '["256x256", "512x512", "1024x1024"]'::jsonb,
  '1024x1024',
  '["reliable", "fast", "cost_effective", "legacy"]'::jsonb,
  'https://platform.openai.com/docs/guides/images',
  false
);

-- ============================================================================
-- Summary Statistics
-- ============================================================================

DO $$
DECLARE
  total_models INTEGER;
  enabled_models INTEGER;
  disabled_models INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_models FROM ai_image_models;
  SELECT COUNT(*) INTO enabled_models FROM ai_image_models WHERE enabled = true;
  SELECT COUNT(*) INTO disabled_models FROM ai_image_models WHERE enabled = false;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ AI Models Seeded Successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 Total Models: %', total_models;
  RAISE NOTICE '✅ Enabled Models: %', enabled_models;
  RAISE NOTICE '❌ Disabled Models: %', disabled_models;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Enabled Models (ready for users):';
  RAISE NOTICE '  1. DALL-E 3 (OpenAI) - Premium quality';
  RAISE NOTICE '  2. Stable Diffusion XL - Cost-effective';
  RAISE NOTICE '  3. Midjourney v6 (Apiframe) - YOUR CURRENT PROVIDER';
  RAISE NOTICE '  4. Leonardo AI - Character/game art';
  RAISE NOTICE '  5. SDXL (Replicate) - Reliable production';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'HYBRID INTEGRATION:';
  RAISE NOTICE '  ✅ Apiframe: Midjourney v6 (current)';
  RAISE NOTICE '  ✅ Eden AI: DALL-E, SDXL, Leonardo AI (new)';
  RAISE NOTICE '  🔄 Future: Midjourney via Eden AI (disabled, available for testing)';
  RAISE NOTICE '============================================';
  RAISE NOTICE '💰 Estimated cost range: $0.015 - $0.05 per image';
  RAISE NOTICE '⏱️  Generation time range: 10-60 seconds';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  1. Update ai-generate-edenai to support Apiframe';
  RAISE NOTICE '  2. Test hybrid integration';
  RAISE NOTICE '  3. Optional: Enable Eden AI Midjourney to compare';
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- Quick Reference Queries (Comment these out after verification)
-- ============================================================================

-- View all enabled models
-- SELECT id, name, provider, cost_per_generation, estimated_time 
-- FROM ai_image_models 
-- WHERE enabled = true 
-- ORDER BY display_order;

-- View all models with their status
-- SELECT 
--   display_order,
--   name,
--   provider,
--   CASE WHEN enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status,
--   cost_per_generation as cost_usd,
--   estimated_time as seconds
-- FROM ai_image_models 
-- ORDER BY display_order;

