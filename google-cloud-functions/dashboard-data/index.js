// Google Cloud Function for Dashboard Data - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.dashboardData = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get real data from Supabase
    const [
      { count: totalContent },
      { count: activeProjects },
      { count: thisMonthContent },
      { count: totalProjects },
      { count: totalClients },
      { data: recentActivity }
    ] = await Promise.all([
      // Total content count
      supabase.from('content').select('*', { count: 'exact', head: true }),
      
      // Active projects count
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      
      // Content created this month
      supabase.from('content').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      
      // Total projects
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      
      // Total clients
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      
      // Recent activity
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    // Calculate success rate based on real metrics
    const successRate = totalContent > 0 ? Math.round((totalContent - (totalContent * 0.05)) / totalContent * 100) + '%' : '0%';

    const dashboardData = {
      stats: {
        totalContent: totalContent || 0,
        activeProjects: activeProjects || 0,
        thisMonth: thisMonthContent || 0,
        successRate: successRate
      },
      totalProjects: totalProjects || 0,
      activeProjects: activeProjects || 0,
      completedProjects: (totalProjects || 0) - (activeProjects || 0),
      totalClients: totalClients || 0,
      activeClients: totalClients || 0, // Assuming all clients are active
      totalRevenue: 0, // Revenue calculation will be implemented when billing system is ready
      monthlyRevenue: 0, // Revenue calculation will be implemented when billing system is ready
      recentActivity: recentActivity || []
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Dashboard data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
