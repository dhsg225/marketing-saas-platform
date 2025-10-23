// Vercel API function for Content List
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

    console.log('🔍 DEBUG: Content List API called for project:', project_id);

    // Get content ideas for the project
    const { data: contentIdeas, error: ideasError } = await supabase
      .from('content_ideas')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (ideasError) {
      console.error('❌ Content ideas error:', ideasError);
      return res.status(500).json({ error: 'Failed to load content ideas' });
    }

    // Get posts for the project
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('❌ Posts error:', postsError);
      return res.status(500).json({ error: 'Failed to load posts' });
    }

    // Combine and format the data
    const allContent = [
      ...(contentIdeas || []).map(item => ({
        ...item,
        type: 'content_idea',
        content_type: 'idea'
      })),
      ...(posts || []).map(item => ({
        ...item,
        type: 'post',
        content_type: 'post'
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: allContent,
      count: allContent.length
    });

  } catch (error) {
    console.error('❌ Content list error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
