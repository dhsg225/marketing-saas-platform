import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get assets
    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Assets fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch assets' });
      }

      res.json({
        success: true,
        data: assets || []
      });

    } catch (error) {
      console.error('❌ Assets API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }

  } else if (req.method === 'POST') {
    // Create new asset
    try {
      const { name, url, type, size } = req.body;

      const { data, error } = await supabase
        .from('assets')
        .insert({
          name,
          url,
          type,
          size,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Asset creation error:', error);
        return res.status(500).json({ error: 'Failed to create asset' });
      }

      res.json({
        success: true,
        asset: data
      });

    } catch (error) {
      console.error('❌ Asset creation API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
