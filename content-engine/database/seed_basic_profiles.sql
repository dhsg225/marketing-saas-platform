-- Basic Mock Data - Just Talent Profiles
-- Simple version to get started

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

COMMIT;
