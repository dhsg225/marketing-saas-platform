-- [Oct 24, 2025 - 09:10] Add Apiframe-Midjourney (your working integration)
-- This replaces the non-working Eden AI Midjourney with your actual Apiframe integration

-- First, disable Eden AI Midjourney (doesn't work)
UPDATE ai_image_models 
SET enabled = false 
WHERE id = 'midjourney-edenai';

-- Insert Apiframe-Midjourney (your actual working integration)
INSERT INTO ai_image_models (
  id,
  name,
  provider,
  model_identifier,
  description,
  cost_per_generation,
  estimated_time,
  enabled,
  display_order,
  requires_api_key,
  max_resolution,
  supported_resolutions,
  features
) VALUES (
  'apiframe-midjourney-v6',
  'Midjourney v6',
  'apiframe',
  'apiframe/midjourney-v6',
  'Industry-leading AI image generation via Apiframe. Exceptional quality, artistic control, and photorealistic output. Best for premium marketing materials and creative content.',
  0.05,
  30,
  true,
  3, -- Same display order as the Eden AI one
  false, -- Uses service-provided Apiframe API key
  '2048x2048',
  ARRAY['1024x1024', '1792x1024', '1024x1792', '2048x2048'],
  ARRAY['High Quality', 'Artistic Style', 'Photorealistic', 'Creative Control', 'Premium Output']
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  provider = EXCLUDED.provider,
  model_identifier = EXCLUDED.model_identifier,
  description = EXCLUDED.description,
  cost_per_generation = EXCLUDED.cost_per_generation,
  estimated_time = EXCLUDED.estimated_time,
  enabled = EXCLUDED.enabled,
  display_order = EXCLUDED.display_order,
  requires_api_key = EXCLUDED.requires_api_key,
  max_resolution = EXCLUDED.max_resolution,
  supported_resolutions = EXCLUDED.supported_resolutions,
  features = EXCLUDED.features;

-- Verify the change
SELECT 
  name, 
  provider, 
  model_identifier, 
  enabled, 
  display_order 
FROM ai_image_models 
WHERE name LIKE '%Midjourney%' OR provider = 'apiframe'
ORDER BY display_order;

