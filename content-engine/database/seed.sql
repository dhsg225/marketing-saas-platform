-- Marketing SaaS Platform - Initial Seed Data
-- This file contains initial data for the knowledge base and templates

-- Insert initial knowledge base entries for Restaurant Industry
INSERT INTO knowledge_base (industry, content_type, template_name, template_content, metadata) VALUES
('restaurant', 'blog', 'menu_highlight', 
'Write an engaging blog post about our new [MENU_ITEM]. Highlight the fresh ingredients, preparation method, and what makes it special. Include local sourcing details and chef recommendations. Target 300-500 words with SEO-friendly structure.',
'{"keywords": ["menu", "fresh ingredients", "chef", "local"], "word_count": "300-500", "tone": "warm and welcoming"}'),

('restaurant', 'social', 'daily_special', 
'Create a social media post for today''s special: [SPECIAL_ITEM]. Use engaging emojis, highlight the key ingredients, and include a call-to-action to visit or order. Keep it under 150 characters for optimal engagement.',
'{"platform": "facebook,instagram", "character_limit": 150, "tone": "exciting and enticing"}'),

('restaurant', 'email', 'newsletter_welcome', 
'Write a welcome email for new newsletter subscribers. Introduce the restaurant, mention signature dishes, upcoming events, and special offers. Include a personal touch from the owner/chef. Keep it friendly and informative.',
'{"type": "newsletter", "tone": "personal and welcoming", "include_cta": true}'),

('restaurant', 'ads', 'local_seo_ad', 
'Create a Google Ads headline and description for local SEO targeting [LOCATION] area. Focus on [CUISINE_TYPE] restaurant, highlight unique selling points, and include location-specific keywords. Include a strong call-to-action.',
'{"platform": "google_ads", "targeting": "local", "character_limits": {"headline": 30, "description": 90}}');

-- Insert initial knowledge base entries for Property Industry
INSERT INTO knowledge_base (industry, content_type, template_name, template_content, metadata) VALUES
('property', 'blog', 'market_update', 
'Write a comprehensive market update blog post for [LOCATION]. Include current property prices, market trends, investment opportunities, and expert insights. Target 500-800 words with data-driven content and local market analysis.',
'{"keywords": ["real estate", "market trends", "investment", "property prices"], "word_count": "500-800", "tone": "professional and data-driven"}'),

('property', 'social', 'property_highlight', 
'Create a social media post highlighting a featured property. Include key features, location benefits, and lifestyle appeal. Use high-quality descriptions and include relevant hashtags. Focus on the lifestyle and investment potential.',
'{"platform": "facebook,instagram,linkedin", "focus": "lifestyle and investment", "include_hashtags": true}'),

('property', 'email', 'new_listing_alert', 
'Write an email alert for new property listings. Include property details, key features, pricing, and viewing information. Personalize with recipient preferences and include clear call-to-action for viewing appointments.',
'{"type": "listing_alert", "tone": "professional and informative", "include_viewing_cta": true}'),

('property', 'ads', 'property_listing_ad', 
'Create a Facebook/Google Ads campaign for property listings. Highlight unique selling points, location benefits, and investment potential. Include compelling visuals descriptions and strong call-to-action for inquiries.',
'{"platform": "facebook,google", "targeting": "property_seekers", "focus": "investment and lifestyle"}');

-- Insert initial knowledge base entries for Agency Content
INSERT INTO knowledge_base (industry, content_type, template_name, template_content, metadata) VALUES
('agency', 'blog', 'marketing_tips', 
'Write an informative blog post about [MARKETING_TOPIC]. Include practical tips, industry insights, and actionable advice for small businesses. Use examples and case studies to illustrate points. Target 400-600 words.',
'{"keywords": ["digital marketing", "small business", "tips", "strategy"], "word_count": "400-600", "tone": "educational and helpful"}'),

('agency', 'social', 'agency_update', 
'Create a social media post about agency updates, new services, or client success stories. Maintain professional tone while being engaging. Include relevant hashtags and encourage engagement from followers.',
'{"platform": "linkedin,facebook", "tone": "professional and engaging", "include_client_stories": true}'),

('agency', 'email', 'client_newsletter', 
'Write a client newsletter covering recent marketing trends, case studies, and agency updates. Include valuable insights, tips, and updates on services. Keep it informative and maintain strong client relationships.',
'{"type": "client_newsletter", "tone": "professional and valuable", "include_case_studies": true}'),

('agency', 'ads', 'service_promotion', 
'Create advertising copy for agency services. Highlight expertise, results, and unique value proposition. Target business owners and decision-makers. Include compelling benefits and clear call-to-action for consultations.',
'{"platform": "linkedin,google", "targeting": "business_owners", "focus": "results and expertise"}');

-- Insert initial content templates
INSERT INTO content_templates (name, industry, content_type, template_structure, is_active) VALUES
('Restaurant Blog Template', 'restaurant', 'blog', 
'{"sections": ["introduction", "main_content", "conclusion", "cta"], "word_count": 400, "seo_optimized": true, "include_images": true}', true),

('Property Listing Template', 'property', 'social', 
'{"sections": ["property_highlights", "location_benefits", "investment_potential", "cta"], "character_limit": 200, "include_hashtags": true, "platform_specific": true}', true),

('Agency Newsletter Template', 'agency', 'email', 
'{"sections": ["greeting", "main_content", "case_study", "services_update", "signature"], "tone": "professional", "personalization": true}', true),

('Restaurant Ad Template', 'restaurant', 'ads', 
'{"sections": ["headline", "description", "cta"], "platform": "google_ads", "local_targeting": true, "character_limits": {"headline": 30, "description": 90}}', true);
