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
    const { id } = req.query;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        clients (
          company_name,
          industry
        )
      `)
      .eq('id', id)
      .single();

    if (projectError) {
      console.error('❌ Project fetch error:', projectError);
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      success: true,
      project
    });

  } catch (error) {
    console.error('❌ Project API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
