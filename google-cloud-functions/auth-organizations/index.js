// Google Cloud Function for Auth Organizations
exports.authOrganizations = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Mock organizations data
    const organizations = [
      {
        organization_id: 'org-1',
        role: 'admin',
        created_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: organizations
    });

  } catch (error) {
    console.error('❌ Organizations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
