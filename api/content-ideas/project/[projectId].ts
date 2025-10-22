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

    // Get content ideas for the project
    const { data: contentIdeas, error } = await supabase
      .from('content_ideas')
      .select(`
        *,
        post_types (
          name,
          color
        )
      `)
      .eq('project_id', projectId)
      .order('suggested_date', { ascending: true });

    if (error) {
      console.error('❌ Content ideas fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch content ideas' });
    }

    res.json({
      success: true,
      contentIdeas: contentIdeas || []
    });

  } catch (error) {
    console.error('❌ Content ideas API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
