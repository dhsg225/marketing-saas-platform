import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get scheduled posts for the project
    const { data: scheduledPosts, error } = await supabase
      .from('posts')
      .select(`
        *,
        content_ideas (
          title,
          description
        )
      `)
      .eq('project_id', projectId)
      .not('scheduled_date', 'is', null)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('❌ Scheduled posts fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch scheduled posts' });
    }

    res.json({
      success: true,
      scheduledPosts: scheduledPosts || []
    });

  } catch (error) {
    console.error('❌ Scheduled posts API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
