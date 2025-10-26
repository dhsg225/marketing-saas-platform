-- [Oct 25, 2025 15:30] Remove Apiframe URLs from variants field
-- The variants.original.url field still points to Apiframe, but url/cdn_url point to BunnyCDN
-- This clears the variants field so frontend uses the correct BunnyCDN URLs

UPDATE assets
SET variants = '{}'::jsonb
WHERE url LIKE '%b-cdn.net%'
  AND variants::text LIKE '%apiframe%';

-- Verify the cleanup
SELECT 
  id,
  file_name,
  url,
  variants
FROM assets
WHERE url LIKE '%b-cdn.net%'
LIMIT 5;

