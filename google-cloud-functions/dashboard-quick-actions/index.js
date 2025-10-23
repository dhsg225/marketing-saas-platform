// Google Cloud Function for Dashboard Quick Actions
exports.dashboardQuickActions = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Real quick actions data - these are static UI actions, not database data
    const quickActions = [
      {
        id: '1',
        title: 'Create New Project',
        description: 'Start a new marketing project',
        icon: 'plus',
        action: 'create_project'
      },
      {
        id: '2',
        title: 'Generate Content',
        description: 'Create AI-generated content',
        icon: 'sparkles',
        action: 'generate_content'
      },
      {
        id: '3',
        title: 'Schedule Posts',
        description: 'Plan your social media posts',
        icon: 'calendar',
        action: 'schedule_posts'
      }
    ];

    res.json({
      success: true,
      data: quickActions
    });

  } catch (error) {
    console.error('❌ Quick actions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
