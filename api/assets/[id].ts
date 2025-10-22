import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Asset deletion error:', error);
        return res.status(500).json({ error: 'Failed to delete asset' });
      }

      res.json({
        success: true,
        message: 'Asset deleted successfully'
      });

    } catch (error) {
      console.error('❌ Asset deletion API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
