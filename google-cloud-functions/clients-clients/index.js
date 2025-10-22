// Google Cloud Function for Clients
exports.clientsClients = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extract organization ID from URL path
    const pathSegments = req.url?.split('/').filter(Boolean) || [];
    const orgId = pathSegments[pathSegments.length - 1]; // Last segment should be org ID

    // Mock clients data
    const clients = [
      {
        id: 'client-1',
        organization_id: orgId || 'org-1',
        company_name: 'Demo Company',
        industry: 'Technology',
        account_status: 'active',
        subscription_tier: 'premium',
        project_count: 3,
        active_projects: 2,
        total_revenue: 50000
      },
      {
        id: 'client-2',
        organization_id: orgId || 'org-1',
        company_name: 'Another Company',
        industry: 'Marketing',
        account_status: 'active',
        subscription_tier: 'basic',
        project_count: 1,
        active_projects: 1,
        total_revenue: 25000
      }
    ];

    res.json({
      success: true,
      data: clients
    });

  } catch (error) {
    console.error('❌ Clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
