-- Working Mock Data for Talent Marketplace
-- Using database-generated UUIDs

-- Insert 3 basic talent profiles
INSERT INTO talent_profiles (
    user_id, business_name, display_name, email, talent_type, bio, 
    city, state, country, service_radius_miles, hourly_rate, minimum_booking_hours, 
    years_experience, created_at, updated_at
) VALUES 
-- Professional Photographer
(
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'Sarah Chen Photography',
    'Sarah Chen Photography',
    'sarah.chen@photography.com',
    'photographer',
    'Professional photographer specializing in corporate events and product photography. 8+ years experience.',
    'Singapore',
    'Singapore',
    'Singapore',
    50,
    120.00,
    2,
    8,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '5 days'
),

-- Videographer
(
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'Mike Rodriguez Films',
    'Mike Rodriguez Films',
    'mike.rodriguez@films.com',
    'videographer',
    'Award-winning videographer specializing in corporate videos and event coverage. Drone certified.',
    'Kuala Lumpur',
    'Selangor',
    'Malaysia',
    75,
    150.00,
    3,
    6,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '3 days'
),

-- Content Creator
(
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'Emma Thompson Creative',
    'Emma Thompson Creative',
    'emma.thompson@creative.com',
    'social_media_manager',
    'Social media content creator and influencer photographer. Expert in Instagram and TikTok content.',
    'Bangkok',
    'Bangkok',
    'Thailand',
    30,
    80.00,
    1,
    4,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '2 days'
);

-- Get the IDs of the profiles we just created
WITH profile_ids AS (
    SELECT id, display_name FROM talent_profiles 
    WHERE email IN ('sarah.chen@photography.com', 'mike.rodriguez@films.com', 'emma.thompson@creative.com')
    ORDER BY created_at DESC
    LIMIT 3
),
sarah_id AS (SELECT id FROM profile_ids WHERE display_name = 'Sarah Chen Photography'),
mike_id AS (SELECT id FROM profile_ids WHERE display_name = 'Mike Rodriguez Films'),
emma_id AS (SELECT id FROM profile_ids WHERE display_name = 'Emma Thompson Creative')

-- Insert portfolio items
INSERT INTO talent_portfolio_items (
    talent_profile_id, title, description, media_type, media_url, 
    thumbnail_url, display_order, is_featured, created_at
) 
SELECT sarah_id.id, 'Corporate Event', 'Professional coverage of tech conference', 'image', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300', 1, true, NOW() - INTERVAL '20 days'
FROM sarah_id
UNION ALL
SELECT sarah_id.id, 'Product Photography', 'High-end product shots for luxury brand', 'image', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300', 2, true, NOW() - INTERVAL '15 days'
FROM sarah_id
UNION ALL
SELECT mike_id.id, 'Corporate Video', 'Brand promotional video for tech startup', 'video', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300', 1, true, NOW() - INTERVAL '18 days'
FROM mike_id
UNION ALL
SELECT mike_id.id, 'Event Coverage', 'Wedding highlight reel', 'video', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300', 2, true, NOW() - INTERVAL '12 days'
FROM mike_id
UNION ALL
SELECT emma_id.id, 'Instagram Content', 'Lifestyle brand photoshoot', 'image', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300', 1, true, NOW() - INTERVAL '14 days'
FROM emma_id
UNION ALL
SELECT emma_id.id, 'TikTok Video', 'Behind-the-scenes content creation', 'video', 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4', 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=300', 2, true, NOW() - INTERVAL '9 days'
FROM emma_id;

-- Insert services
INSERT INTO talent_services (
    talent_profile_id, service_name, description, service_type, 
    base_price, pricing_model, delivery_time_days, is_active, created_at
)
WITH profile_ids AS (
    SELECT id, display_name FROM talent_profiles 
    WHERE email IN ('sarah.chen@photography.com', 'mike.rodriguez@films.com', 'emma.thompson@creative.com')
    ORDER BY created_at DESC
    LIMIT 3
),
sarah_id AS (SELECT id FROM profile_ids WHERE display_name = 'Sarah Chen Photography'),
mike_id AS (SELECT id FROM profile_ids WHERE display_name = 'Mike Rodriguez Films'),
emma_id AS (SELECT id FROM profile_ids WHERE display_name = 'Emma Thompson Creative')

SELECT sarah_id.id, 'Corporate Event Photography', 'Professional event coverage with edited photos', 'event', 800.00, 'fixed', 2, true, NOW() - INTERVAL '25 days'
FROM sarah_id
UNION ALL
SELECT sarah_id.id, 'Product Photography', 'Studio product photography with professional lighting', 'session', 400.00, 'fixed', 3, true, NOW() - INTERVAL '20 days'
FROM sarah_id
UNION ALL
SELECT mike_id.id, 'Corporate Video Production', 'Full video production from concept to delivery', 'project', 2500.00, 'fixed', 14, true, NOW() - INTERVAL '22 days'
FROM mike_id
UNION ALL
SELECT mike_id.id, 'Event Videography', 'Event coverage with highlight reel', 'event', 1200.00, 'fixed', 5, true, NOW() - INTERVAL '18 days'
FROM mike_id
UNION ALL
SELECT emma_id.id, 'Social Media Content Package', 'Complete social media content creation', 'package', 600.00, 'fixed', 7, true, NOW() - INTERVAL '16 days'
FROM emma_id
UNION ALL
SELECT emma_id.id, 'Influencer Photoshoot', 'Professional photoshoot for social media', 'session', 350.00, 'fixed', 3, true, NOW() - INTERVAL '11 days'
FROM emma_id;

COMMIT;
