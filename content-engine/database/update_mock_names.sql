-- Update Mock Data Names with "Mock" Suffix
-- This makes it clear these are sample profiles for demonstration

-- Update talent profile names to include "Mock" suffix
UPDATE talent_profiles SET 
    business_name = 'Sarah Chen Mock Photography',
    display_name = 'Sarah Chen Mock Photography',
    email = 'sarah.chen.mock@photography.com'
WHERE email = 'sarah.chen@photography.com';

UPDATE talent_profiles SET 
    business_name = 'Mike Rodriguez Mock Films',
    display_name = 'Mike Rodriguez Mock Films',
    email = 'mike.rodriguez.mock@films.com'
WHERE email = 'mike.rodriguez@films.com';

UPDATE talent_profiles SET 
    business_name = 'Emma Thompson Mock Creative',
    display_name = 'Emma Thompson Mock Creative',
    email = 'emma.thompson.mock@creative.com'
WHERE email = 'emma.thompson@creative.com';

COMMIT;
