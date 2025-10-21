const express = require('express');
const router = express.Router();
const playbookService = require('../services/playbookService');
const contentService = require('../services/contentService');

// Project Management Routes
router.post('/projects', async (req, res) => {
  try {
    const project = await playbookService.createProject(req.body);
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:organization_id', async (req, res) => {
  try {
    const { organization_id } = req.params;
    
    // Query real projects from database
    const { query } = require('../../database/config');
    
    const projects = await query(`
      SELECT p.id, p.name, p.description, p.industry, p.status, p.created_at, p.updated_at,
             c.name as client_name, c.organization_id
      FROM projects p 
      JOIN clients c ON p.client_id = c.id 
      WHERE c.organization_id = $1 AND p.status = 'active'
      ORDER BY p.name
    `, [organization_id]);
    
    console.log(`✅ Found ${projects.rows.length} projects for organization ${organization_id}`);
    
    res.json({ success: true, data: projects.rows });
  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hashtag Management Routes
router.post('/hashtags', async (req, res) => {
  try {
    const { project_id, hashtag, is_favorite } = req.body;
    const hashtagData = await playbookService.addProjectHashtag(project_id, hashtag, is_favorite);
    res.json({ success: true, data: hashtagData });
  } catch (error) {
    console.error('Hashtag creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/hashtags/:project_id', async (req, res) => {
  try {
    const hashtags = await playbookService.getProjectHashtags(req.params.project_id);
    res.json({ success: true, data: hashtags });
  } catch (error) {
    console.error('Hashtags fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/hashtags/:hashtag_id/usage', async (req, res) => {
  try {
    const hashtag = await playbookService.updateHashtagUsage(req.params.hashtag_id);
    res.json({ success: true, data: hashtag });
  } catch (error) {
    console.error('Hashtag usage update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Content Recipes Routes
router.post('/recipes', async (req, res) => {
  try {
    const recipe = await playbookService.createContentRecipe(req.body);
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Recipe creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recipes/:project_id', async (req, res) => {
  try {
    const recipes = await playbookService.getContentRecipes(req.params.project_id);
    res.json({ success: true, data: recipes });
  } catch (error) {
    console.error('Recipes fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE a content recipe
router.put('/recipes/:id', async (req, res) => {
  try {
    const recipe = await playbookService.updateContentRecipe(req.params.id, req.body);
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Recipe update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE a content recipe
router.delete('/recipes/:id', async (req, res) => {
  try {
    await playbookService.deleteContentRecipe(req.params.id);
    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Recipe delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Channel Templates Routes
router.post('/templates', async (req, res) => {
  try {
    const template = await playbookService.createChannelTemplate(req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Template creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/templates/:project_id', async (req, res) => {
  try {
    const { channel } = req.query;
    const templates = await playbookService.getChannelTemplates(req.params.project_id, channel);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Templates fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Content Generation Routes
router.post('/generations', async (req, res) => {
  try {
    const generation = await playbookService.saveContentGeneration(req.body);
    res.json({ success: true, data: generation });
  } catch (error) {
    console.error('Generation save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/generations/:project_id', async (req, res) => {
  try {
    const { limit } = req.query;
    const generations = await playbookService.getContentGenerations(req.params.project_id, limit);
    res.json({ success: true, data: generations });
  } catch (error) {
    console.error('Generations fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI-Driven Hashtag Discovery
router.post('/hashtags/discover', async (req, res) => {
  try {
    const { content, industry, topic } = req.body;
    const hashtags = await playbookService.generateDynamicHashtags(content, industry, topic);
    res.json({ success: true, data: hashtags });
  } catch (error) {
    console.error('Hashtag discovery error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Playbook Summary
router.get('/summary/:project_id', async (req, res) => {
  try {
    const summary = await playbookService.getPlaybookSummary(req.params.project_id);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Playbook summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// [2025-10-07 19:25 UTC] - Add AI suggestion route for Post Types (uses Claude)
router.post('/post-types/suggest', async (req, res) => {
  try {
    const { industry = 'restaurant', goals = '', audience = '', current_mix = '' } = req.body || {};
    const prompt = `You are a marketing strategist. Suggest a concise list of 6-10 "Post Types" (each with name, purpose, asset_type=text|image|video, tone, suggested_frequency) for a ${industry} brand.
Context:
Business goals: ${goals}
Target audience: ${audience}
Current mix: ${current_mix}
Return JSON array with keys: name, purpose, required_asset_type, tone, suggested_frequency.`;
    const resp = await contentService.callClaudeAPI(prompt, 600);
    const raw = resp.content?.[0]?.text || '[]';
    let suggestions = [];
    try { suggestions = JSON.parse(raw); } catch { suggestions = []; }
    return res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Post type suggestion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// [2025-10-07 19:28 UTC] - Purpose helper: generate a concise purpose text for a Post Type
router.post('/post-types/purpose', async (req, res) => {
  try {
    const { industry = 'restaurant', name = '', context = '', purpose = '', action = 'generate' } = req.body || {};
    
    if (action === 'clean_and_improve' && purpose) {
      // AI-powered text cleaning and improvement
      const prompt = `You are a professional editor. Clean and improve this marketing purpose text. Fix grammar, spelling, clarity, and flow while keeping the original meaning. Make it professional and concise (under 30 words). Return only the cleaned text, no explanations.

Original text: "${purpose}"`;
      
      const resp = await contentService.callClaudeAPI(prompt, 120);
      const cleaned = resp.content?.[0]?.text?.trim() || purpose;
      return res.json({ success: true, data: cleaned });
    } else {
      // Original purpose generation
      const prompt = `You are a marketing strategist. Write a single concise sentence "Purpose" for a Post Type called "${name}" for the ${industry} industry. Keep it under 25 words. Context: ${context}`;
      const resp = await contentService.callClaudeAPI(prompt, 120);
      const suggestion = resp.content?.[0]?.text?.trim() || '';
      return res.json({ success: true, data: { purpose: suggestion } });
    }
  } catch (error) {
    console.error('Post type purpose error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
