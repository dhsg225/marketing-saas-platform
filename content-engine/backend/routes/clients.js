const express = require('express');
const router = express.Router();
const clientService = require('../services/clientService');

// Client Management Routes
router.post('/clients', async (req, res) => {
  try {
    const client = await clientService.createClient(req.body);
    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Client creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/clients/:organization_id', async (req, res) => {
  try {
    const clients = await clientService.getClientsByOrganization(req.params.organization_id);
    res.json({ success: true, data: clients });
  } catch (error) {
    console.error('Clients fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/client/:client_id', async (req, res) => {
  try {
    const client = await clientService.getClientById(req.params.client_id);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Client fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/client/:client_id', async (req, res) => {
  try {
    const client = await clientService.updateClient(req.params.client_id, req.body);
    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Client update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/client/:client_id', async (req, res) => {
  try {
    const client = await clientService.deleteClient(req.params.client_id);
    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Client deletion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Project Management Routes (Updated for new hierarchy)
router.get('/projects/client/:client_id', async (req, res) => {
  try {
    const projects = await clientService.getProjectsByClient(req.params.client_id);
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Client projects fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/organization/:organization_id', async (req, res) => {
  try {
    const projects = await clientService.getProjectsByOrganization(req.params.organization_id);
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Organization projects fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const project = await clientService.createProject(req.body);
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics Routes
router.get('/analytics/:organization_id', async (req, res) => {
  try {
    const analytics = await clientService.getClientAnalytics(req.params.organization_id);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Client analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/client/:client_id/performance', async (req, res) => {
  try {
    const performance = await clientService.getClientPerformanceMetrics(req.params.client_id);
    res.json({ success: true, data: performance });
  } catch (error) {
    console.error('Client performance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
