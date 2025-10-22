// Google Cloud Function for Dashboard Data
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
    // Mock dashboard data
    const dashboardData = {
      totalProjects: 5,
      activeProjects: 3,
      completedProjects: 2,
      totalClients: 8,
      activeClients: 6,
      totalRevenue: 125000,
      monthlyRevenue: 15000,
      recentActivity: [
        {
          id: '1',
          type: 'project_created',
          message: 'New project "Website Redesign" created',
          timestamp: new Date().toISOString()
        }
      ]
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
