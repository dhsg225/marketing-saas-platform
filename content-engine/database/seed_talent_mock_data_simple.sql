-- Mock Data for Talent Marketplace - Simplified Version
-- This script adds realistic sample data to demonstrate the platform

-- Insert mock talent profiles
INSERT INTO talent_profiles (
    id, user_id, business_name, display_name, email, talent_type, bio, 
    city, state, country, service_radius_miles, hourly_rate, minimum_booking_hours, 
    years_experience, availability_status, is_approved, approval_notes, created_at, updated_at
) VALUES 
-- Professional Photographer
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'Sarah Chen Photography',
    'Sarah Chen Photography',
    'sarah.chen@photography.com',
    'photographer',
    'Professional photographer specializing in corporate events, product photography, and lifestyle shoots. 8+ years experience with top brands.',
    'Singapore',
    'Singapore',
    'Singapore',
    50,
    120.00,
    2,
    8,
    'available',
    true,
    'Approved - Excellent portfolio and professional experience',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '5 days'
),

-- Videographer
(
    'b2c3d4e5-f6g7-8901-bcde-f23456789012',
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'Mike Rodriguez Films',
    'Mike Rodriguez Films',
    'mike.rodriguez@films.com',
    'videographer',
    'Award-winning videographer and filmmaker. Specializes in corporate videos, event coverage, and promotional content. Drone certified.',
    'Kuala Lumpur',
    'Selangor',
    'Malaysia',
    75,
    150.00,
    3,
    6,
    'available',
    true,
    'Approved - High-quality work and professional equipment',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '3 days'
),

-- Content Creator
(
    'c3d4e5f6-g7h8-9012-cdef-345678901234',
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'Emma Thompson Creative',
    'Emma Thompson Creative',
    'emma.thompson@creative.com',
    'social_media_manager',
    'Social media content creator and influencer photographer. Expert in Instagram, TikTok, and YouTube content creation.',
    'Bangkok',
    'Bangkok',
    'Thailand',
    30,
    80.00,
    1,
    4,
    'available',
    true,
    'Approved - Strong social media presence and creative portfolio',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '2 days'
),

-- Event Photographer
(
    'd4e5f6g7-h8i9-0123-defg-456789012345',
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'David Kim Events',
    'David Kim Events',
    'david.kim@events.com',
    'photographer',
    'Specialized event photographer with 10+ years covering weddings, corporate events, and conferences across Asia.',
    'Manila',
    'Metro Manila',
    'Philippines',
    100,
    100.00,
    4,
    10,
    'available',
    true,
    'Approved - Extensive event experience and professional reputation',
    NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '1 day'
),

-- Drone Specialist
(
    'e5f6g7h8-i9j0-1234-efgh-567890123456',
    (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'),
    'Alex Chen Aerial',
    'Alex Chen Aerial',
    'alex.chen@aerial.com',
    'videographer',
    'Licensed drone pilot specializing in aerial photography and videography. Real estate, construction, and event coverage.',
    'Jakarta',
    'Jakarta',
    'Indonesia',
    200,
    200.00,
    2,
    5,
    'available',
    true,
    'Approved - Licensed pilot with commercial drone experience',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '4 days'
);

-- Insert mock portfolio items
INSERT INTO talent_portfolio_items (
    id, talent_profile_id, title, description, media_type, media_url, 
    thumbnail_url, display_order, is_featured, created_at
) VALUES 
-- Sarah Chen Portfolio
('p1a2b3c4-d5e6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Corporate Event Coverage', 'Professional coverage of tech conference with 500+ attendees', 'image', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300', 1, true, NOW() - INTERVAL '20 days'),
('p2b3c4d5-e6f7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Product Photography', 'High-end product shots for luxury brand campaign', 'image', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300', 2, true, NOW() - INTERVAL '15 days'),
('p3c4d5e6-f7g8-9012-cdef-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lifestyle Portrait', 'Executive portrait session for LinkedIn profiles', 'image', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', 3, false, NOW() - INTERVAL '10 days'),

-- Mike Rodriguez Portfolio
('p4d5e6f7-g8h9-0123-defg-456789012345', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Corporate Video', 'Brand promotional video for tech startup', 'video', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300', 1, true, NOW() - INTERVAL '18 days'),
('p5e6f7g8-h9i0-1234-efgh-567890123456', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Event Coverage', 'Wedding highlight reel with cinematic quality', 'video', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300', 2, true, NOW() - INTERVAL '12 days'),
('p6f7g8h9-i0j1-2345-fghi-678901234567', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Drone Footage', 'Aerial shots of city skyline for real estate', 'video', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300', 3, false, NOW() - INTERVAL '8 days'),

-- Emma Thompson Portfolio
('p7g8h9i0-j1k2-3456-ghij-789012345678', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'Instagram Content', 'Lifestyle brand photoshoot for fashion brand', 'image', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300', 1, true, NOW() - INTERVAL '14 days'),
('p8h9i0j1-k2l3-4567-hijk-890123456789', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'TikTok Video', 'Behind-the-scenes content creation process', 'video', 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4', 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=300', 2, true, NOW() - INTERVAL '9 days'),
('p9i0j1k2-l3m4-5678-ijkl-901234567890', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'Influencer Shoot', 'Beauty brand collaboration content', 'image', 'https://images.unsplash.com/photo-1596462502278-4bf4cb77b6c9', 'https://images.unsplash.com/photo-1596462502278-4bf4cb77b6c9?w=300', 3, false, NOW() - INTERVAL '6 days');

-- Insert mock services
INSERT INTO talent_services (
    id, talent_profile_id, service_name, description, service_type, 
    base_price, pricing_model, delivery_time_days, is_active, created_at
) VALUES 
-- Sarah Chen Services
('s1a2b3c4-d5e6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Corporate Event Photography', 'Professional event coverage with edited photos delivered within 48 hours', 'event', 800.00, 'fixed', 2, true, NOW() - INTERVAL '25 days'),
('s2b3c4d5-e6f7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Product Photography Session', 'Studio product photography with professional lighting and editing', 'session', 400.00, 'fixed', 3, true, NOW() - INTERVAL '20 days'),
('s3c4d5e6-f7g8-9012-cdef-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Executive Portrait Session', 'Professional headshots for LinkedIn and corporate use', 'session', 300.00, 'fixed', 1, true, NOW() - INTERVAL '15 days'),

-- Mike Rodriguez Services
('s4d5e6f7-g8h9-0123-defg-456789012345', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Corporate Video Production', 'Full video production from concept to final delivery', 'project', 2500.00, 'fixed', 14, true, NOW() - INTERVAL '22 days'),
('s5e6f7g8-h9i0-1234-efgh-567890123456', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Event Videography', 'Event coverage with highlight reel', 'event', 1200.00, 'fixed', 5, true, NOW() - INTERVAL '18 days'),
('s6f7g8h9-i0j1-2345-fghi-678901234567', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'Drone Aerial Shots', 'Aerial photography and videography services', 'session', 500.00, 'fixed', 2, true, NOW() - INTERVAL '12 days'),

-- Emma Thompson Services
('s7g8h9i0-j1k2-3456-ghij-789012345678', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'Social Media Content Package', 'Complete social media content creation for Instagram/TikTok', 'package', 600.00, 'fixed', 7, true, NOW() - INTERVAL '16 days'),
('s8h9i0j1-k2l3-4567-hijk-890123456789', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'Influencer Photoshoot', 'Professional photoshoot for social media influencers', 'session', 350.00, 'fixed', 3, true, NOW() - INTERVAL '11 days'),
('s9i0j1k2-l3m4-5678-ijkl-901234567890', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'Content Strategy Consultation', 'Social media strategy and content planning session', 'consultation', 150.00, 'hourly', 1, true, NOW() - INTERVAL '8 days');

-- Insert mock reviews
INSERT INTO talent_reviews (
    id, talent_profile_id, client_user_id, booking_id, rating, review_text, 
    is_public, created_at
) VALUES 
-- Reviews for Sarah Chen
('r1a2b3c4-d5e6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'b1a2b3c4-d5e6-7890-abcd-ef1234567890', 5, 'Sarah was absolutely professional and delivered amazing photos for our corporate event. Highly recommended!', true, NOW() - INTERVAL '20 days'),
('r2b3c4d5-e6f7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 5, 'Excellent product photography. Sarah understood our brand perfectly and delivered beyond expectations.', true, NOW() - INTERVAL '15 days'),
('r3c4d5e6-f7g8-9012-cdef-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'b3c4d5e6-f7g8-9012-cdef-345678901234', 4, 'Great photographer, very professional. Would book again for future events.', true, NOW() - INTERVAL '10 days'),

-- Reviews for Mike Rodriguez
('r4d5e6f7-g8h9-0123-defg-456789012345', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'b4d5e6f7-g8h9-0123-defg-456789012345', 5, 'Mike created an incredible promotional video for our startup. His drone work is outstanding!', true, NOW() - INTERVAL '18 days'),
('r5e6f7g8-h9i0-1234-efgh-567890123456', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'b5e6f7g8-h9i0-1234-efgh-567890123456', 5, 'Professional videographer with great attention to detail. The wedding video was perfect!', true, NOW() - INTERVAL '12 days'),

-- Reviews for Emma Thompson
('r6f7g8h9-i0j1-2345-fghi-678901234567', 'c3d4e5f6-g7h8-9012-cdef-345678901234', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'b6f7g8h9-i0j1-2345-fghi-678901234567', 5, 'Emma created amazing content for our social media. Our engagement increased by 300%!', true, NOW() - INTERVAL '14 days'),
('r7g8h9i0-j1k2-3456-ghij-789012345678', 'c3d4e5f6-g7h8-9012-cdef-345678901234', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'b7g8h9i0-j1k2-3456-ghij-789012345678', 4, 'Great influencer photographer. Emma really understands social media trends.', true, NOW() - INTERVAL '9 days');

-- Insert mock bookings
INSERT INTO talent_bookings (
    id, talent_profile_id, client_user_id, service_id, booking_date, 
    duration_hours, special_requirements, status, total_price, 
    platform_fee_percentage, platform_fee_amount, stripe_fee_amount, 
    talent_payout_amount, created_at, updated_at
) VALUES 
-- Active bookings
('b1a2b3c4-d5e6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 's1a2b3c4-d5e6-7890-abcd-ef1234567890', NOW() + INTERVAL '7 days', 8, 'Corporate conference with 200+ attendees. Need high-resolution photos for marketing materials.', 'confirmed', 800.00, 0.15, 120.00, 23.20, 656.80, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 's4d5e6f7-g8h9-0123-defg-456789012345', NOW() + INTERVAL '14 days', 16, 'Product launch video for new tech startup. Need cinematic quality with drone shots.', 'pending', 2500.00, 0.12, 300.00, 72.50, 2127.50, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
('b3d4e5f6-g7h8-9012-cdef-345678901234', 'c3d4e5f6-g7h8-9012-cdef-345678901234', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 's7g8h9i0-j1k2-3456-ghij-789012345678', NOW() + INTERVAL '10 days', 4, 'Social media content for fashion brand. Need Instagram and TikTok content.', 'confirmed', 600.00, 0.15, 90.00, 17.40, 492.60, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),

-- Completed bookings
('b4e5f6g7-h8i9-0123-defg-456789012345', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 's2b3c4d5-e6f7-8901-bcde-f23456789012', NOW() - INTERVAL '20 days', 4, 'Product photography for e-commerce website', 'completed', 400.00, 0.15, 60.00, 11.60, 328.40, NOW() - INTERVAL '25 days', NOW() - INTERVAL '18 days'),
('b5f6g7h8-i9j0-1234-efgh-567890123456', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 's5e6f7g8-h9i0-1234-efgh-567890123456', NOW() - INTERVAL '15 days', 8, 'Wedding videography with highlight reel', 'completed', 1200.00, 0.12, 144.00, 34.80, 1021.20, NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days');

-- Insert mock messages
INSERT INTO talent_messages (
    id, booking_id, sender_user_id, message_text, is_read, created_at
) VALUES 
('m1a2b3c4-d5e6-7890-abcd-ef1234567890', 'b1a2b3c4-d5e6-7890-abcd-ef1234567890', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'Hi Sarah! Looking forward to the corporate event next week. Do you have any specific requirements for the venue?', true, NOW() - INTERVAL '3 days'),
('m2b3c4d5-e6f7-8901-bcde-f23456789012', 'b1a2b3c4-d5e6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Hi! Thanks for booking. I will need access to power outlets and a staging area for equipment. I will arrive 1 hour early to set up.', true, NOW() - INTERVAL '2 days'),
('m3c4d5e6-f7g8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'Mike, I am excited about the product launch video. Can we discuss the creative direction and timeline?', false, NOW() - INTERVAL '1 day'),
('m4d5e6f7-g8h9-0123-defg-456789012345', 'b3d4e5f6-g7h8-9012-cdef-345678901234', (SELECT id FROM users WHERE email = 'shannon.green.asia@gmail.com'), 'Emma, I love your portfolio! Can you create content that matches our brand aesthetic?', true, NOW() - INTERVAL '2 days');

-- Update talent profiles with calculated stats
UPDATE talent_profiles SET 
    total_bookings = (
        SELECT COUNT(*) FROM talent_bookings 
        WHERE talent_profile_id = talent_profiles.id AND status = 'completed'
    ),
    average_rating = (
        SELECT COALESCE(AVG(rating), 0) FROM talent_reviews 
        WHERE talent_profile_id = talent_profiles.id
    ),
    total_reviews = (
        SELECT COUNT(*) FROM talent_reviews 
        WHERE talent_profile_id = talent_profiles.id
    )
WHERE id IN (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'b2c3d4e5-f6g7-8901-bcde-f23456789012',
    'c3d4e5f6-g7h8-9012-cdef-345678901234',
    'd4e5f6g7-h8i9-0123-defg-456789012345',
    'e5f6g7h8-i9j0-1234-efgh-567890123456'
);

-- Insert availability slots
INSERT INTO talent_availability (
    id, talent_profile_id, available_date, start_time, end_time, 
    is_available, booking_id, created_at
) VALUES 
-- Sarah Chen availability
('av1a2b3c4-d5e6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', CURRENT_DATE + INTERVAL '7 days', '09:00:00', '17:00:00', false, 'b1a2b3c4-d5e6-7890-abcd-ef1234567890', NOW() - INTERVAL '5 days'),
('av2b3c4d5-e6f7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', CURRENT_DATE + INTERVAL '14 days', '09:00:00', '17:00:00', true, NULL, NOW() - INTERVAL '4 days'),
('av3c4d5e6-f7g8-9012-cdef-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', CURRENT_DATE + INTERVAL '21 days', '09:00:00', '17:00:00', true, NULL, NOW() - INTERVAL '3 days'),

-- Mike Rodriguez availability
('av4d5e6f7-g8h9-0123-defg-456789012345', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', CURRENT_DATE + INTERVAL '14 days', '08:00:00', '18:00:00', false, 'b2c3d4e5-f6g7-8901-bcde-f23456789012', NOW() - INTERVAL '3 days'),
('av5e6f7g8-h9i0-1234-efgh-567890123456', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', CURRENT_DATE + INTERVAL '28 days', '08:00:00', '18:00:00', true, NULL, NOW() - INTERVAL '2 days'),

-- Emma Thompson availability
('av6f7g8h9-i0j1-2345-fghi-678901234567', 'c3d4e5f6-g7h8-9012-cdef-345678901234', CURRENT_DATE + INTERVAL '10 days', '10:00:00', '16:00:00', false, 'b3d4e5f6-g7h8-9012-cdef-345678901234', NOW() - INTERVAL '4 days'),
('av7g8h9i0-j1k2-3456-ghij-789012345678', 'c3d4e5f6-g7h8-9012-cdef-345678901234', CURRENT_DATE + INTERVAL '17 days', '10:00:00', '16:00:00', true, NULL, NOW() - INTERVAL '2 days');

COMMIT;
