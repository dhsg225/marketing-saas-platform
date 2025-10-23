// Vercel API function for Playbook Recipes
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Parse project ID from query parameters
    const { project_id } = req.query;
    
    if (!project_id) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    console.log('🔍 DEBUG: Playbook Recipes API called for project:', project_id);

    // Get post types/recipes from database (if table exists) or return default types
    const { data: postTypes, error } = await supabase
      .from('post_types')
      .select('*')
      .eq('project_id', project_id)
      .order('name', { ascending: true });

    if (error) {
      console.log('⚠️ Post types table not found, returning default types');
      
      // Return default post types
      const defaultTypes = [
        {
          id: 'social_post',
          name: 'Social Media Post',
          description: 'Short-form social media content',
          platform: 'social',
          format: 'post'
        },
        {
          id: 'blog_post',
          name: 'Blog Post',
          description: 'Long-form blog content',
          platform: 'blog',
          format: 'article'
        },
        {
          id: 'email_newsletter',
          name: 'Email Newsletter',
          description: 'Email marketing content',
          platform: 'email',
          format: 'newsletter'
        },
        {
          id: 'video_script',
          name: 'Video Script',
          description: 'Video content script',
          platform: 'video',
          format: 'script'
        }
      ];

      return res.json({
        success: true,
        data: defaultTypes
      });
    }

    res.json({
      success: true,
      data: postTypes || []
    });

  } catch (error) {
    console.error('❌ Playbook recipes error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
