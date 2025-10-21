-- Add scheduling fields to the posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time TIME,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'instagram',
ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Add comments for the new columns
COMMENT ON COLUMN posts.scheduled_date IS 'Date when the post should be published';
COMMENT ON COLUMN posts.scheduled_time IS 'Time when the post should be published';
COMMENT ON COLUMN posts.timezone IS 'Timezone for the scheduled publication';
COMMENT ON COLUMN posts.platform IS 'Target platform (instagram, facebook, linkedin, etc.)';
COMMENT ON COLUMN posts.auto_publish IS 'Whether to automatically publish at scheduled time';
COMMENT ON COLUMN posts.published_at IS 'Actual timestamp when the post was published';

-- Create indexes for scheduling queries
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_date ON posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_posts_auto_publish ON posts(auto_publish);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);

