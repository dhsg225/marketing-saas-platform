const { query } = require('../../database/config');
const { getModelConfig } = require('../config/ai-models');

// Claude API configuration
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

class ContentService {
  constructor() {
    this.knowledgeBase = new Map();
    this.loadKnowledgeBase();
  }

  async loadKnowledgeBase() {
    try {
      const result = await query('SELECT * FROM knowledge_base');
      result.rows.forEach(row => {
        const key = `${row.industry}_${row.category}`;
        this.knowledgeBase.set(key, row.content);
      });
      console.log('✅ Knowledge base loaded:', result.rows.length, 'entries');
    } catch (error) {
      console.error('❌ Failed to load knowledge base:', error.message);
    }
  }

  async generateContent(request) {
    const { type, industry, topic, tone = 'professional', length = 'medium', systemInstruction = null } = request;

    try {
      // Get industry-specific knowledge
      const knowledge = this.getIndustryKnowledge(industry);
      
      // Build prompt based on content type and industry
      const prompt = this.buildPrompt(type, industry, topic, tone, length, knowledge);
      
      // [Oct 12, 2025 11:15 AM] - Pass systemInstruction from tone profile to Claude API
      // Generate content using Claude API
      const response = await this.callClaudeAPI(prompt, this.getMaxTokens(length), systemInstruction);
      const generatedContent = response.content[0].text;

      // Save to database
      await this.saveContent({
        type,
        industry,
        topic,
        content: generatedContent,
        tone,
        length
      });

      return generatedContent;
    } catch (error) {
      console.error('Content generation error:', error);
      throw new Error('Failed to generate content');
    }
  }

  getIndustryKnowledge(industry) {
    const categories = ['marketing_tips', 'best_practices', 'industry_insights'];
    const knowledge = {};
    
    categories.forEach(category => {
      const key = `${industry}_${category}`;
      knowledge[category] = this.knowledgeBase.get(key) || '';
    });

    return knowledge;
  }

  buildPrompt(type, industry, topic, tone, length, knowledge) {
    const templates = {
      social_media_post: this.buildSocialMediaPrompt(industry, topic, tone, length, knowledge),
      email_campaign: this.buildEmailPrompt(industry, topic, tone, length, knowledge),
      blog_post: this.buildBlogPrompt(industry, topic, tone, length, knowledge),
      ad_copy: this.buildAdPrompt(industry, topic, tone, length, knowledge),
      product_description: this.buildProductPrompt(industry, topic, tone, length, knowledge)
    };

    return templates[type] || templates.social_media_post;
  }

  buildSocialMediaPrompt(industry, topic, tone, length, knowledge) {
    return `Create a ${tone} social media post for the ${industry} industry about "${topic}".

Industry Context:
${knowledge.marketing_tips}
${knowledge.best_practices}

Requirements:
- Length: ${length}
- Tone: ${tone}
- Include relevant hashtags
- Make it engaging and shareable
- Include a call-to-action

Topic: ${topic}

Generate the social media post:`;
  }

  buildEmailPrompt(industry, topic, tone, length, knowledge) {
    return `Create a ${tone} email campaign for the ${industry} industry about "${topic}".

Industry Context:
${knowledge.marketing_tips}
${knowledge.best_practices}

Requirements:
- Length: ${length}
- Tone: ${tone}
- Include subject line
- Professional email structure
- Clear call-to-action

Topic: ${topic}

Generate the email campaign:`;
  }

  buildBlogPrompt(industry, topic, tone, length, knowledge) {
    return `Create a ${tone} blog post for the ${industry} industry about "${topic}".

Industry Context:
${knowledge.marketing_tips}
${knowledge.best_practices}
${knowledge.industry_insights}

Requirements:
- Length: ${length}
- Tone: ${tone}
- SEO-friendly structure
- Engaging introduction
- Clear sections and conclusion
- Include relevant keywords

Topic: ${topic}

Generate the blog post:`;
  }

  buildAdPrompt(industry, topic, tone, length, knowledge) {
    return `Create a ${tone} advertisement copy for the ${industry} industry about "${topic}".

Industry Context:
${knowledge.marketing_tips}
${knowledge.best_practices}

Requirements:
- Length: ${length}
- Tone: ${tone}
- Attention-grabbing headline
- Clear value proposition
- Strong call-to-action
- Persuasive language

Topic: ${topic}

Generate the advertisement copy:`;
  }

  buildProductPrompt(industry, topic, tone, length, knowledge) {
    return `Create a ${tone} product description for the ${industry} industry about "${topic}".

Industry Context:
${knowledge.marketing_tips}
${knowledge.best_practices}

Requirements:
- Length: ${length}
- Tone: ${tone}
- Highlight key features and benefits
- Use persuasive language
- Include relevant details
- Clear and concise

Topic: ${topic}

Generate the product description:`;
  }

  async callClaudeAPI(prompt, maxTokens, systemInstruction = null) {
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    // [Oct 12, 2025 11:15 AM] - Use custom system instruction from tone profile if provided, otherwise use default
    const defaultSystemInstruction = 'You are an expert marketing copywriter specializing in creating compelling content for restaurants and property businesses. Always create original, engaging content that drives action.';
    const finalSystemInstruction = systemInstruction || defaultSystemInstruction;

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: getModelConfig('CONTENT_GENERATION').model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: `${finalSystemInstruction}\n\n${prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  getMaxTokens(length) {
    const tokenMap = {
      short: 150,
      medium: 300,
      long: 500
    };
    return tokenMap[length] || 300;
  }

  async saveContent(contentData) {
    const { type, industry, topic, content, tone, length } = contentData;
    
    // Map content types to database schema
    const typeMapping = {
      'social_media_post': 'social',
      'email_campaign': 'email',
      'blog_post': 'blog',
      'product_description': 'ads'
    };
    
    const contentType = typeMapping[type] || 'social';
    
    try {
      const result = await query(
        `INSERT INTO content_pieces (type, industry, topic, content, tone, length, content_type, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
        [type, industry, topic, content, tone, length, contentType]
      );
      
      console.log('✅ Content saved to database:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to save content:', error.message);
      throw error;
    }
  }

  async getContentHistory(limit = 50) {
    try {
      const result = await query(
        'SELECT * FROM content_pieces ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch content history:', error.message);
      throw error;
    }
  }

  async getAnalytics() {
    try {
      const stats = await query(`
        SELECT 
          COUNT(*) as total_content,
          COUNT(DISTINCT industry) as industries_served,
          AVG(LENGTH(content)) as avg_content_length
        FROM content_pieces
      `);

      const industryBreakdown = await query(`
        SELECT industry, COUNT(*) as count
        FROM content_pieces
        GROUP BY industry
        ORDER BY count DESC
      `);

      const typeBreakdown = await query(`
        SELECT type, COUNT(*) as count
        FROM content_pieces
        GROUP BY type
        ORDER BY count DESC
      `);

      return {
        stats: stats.rows[0],
        industryBreakdown: industryBreakdown.rows,
        typeBreakdown: typeBreakdown.rows
      };
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error.message);
      throw error;
    }
  }

  // Enhance image prompt for Midjourney-style generation
  async enhanceImagePrompt(originalPrompt) {
    try {
      const systemPrompt = `You are an expert at creating detailed, professional prompts for AI image generation, specifically optimized for Midjourney. 

Your task is to take a basic idea and transform it into a comprehensive, detailed prompt that will generate high-quality images.

Guidelines:
1. Add professional photography terms (e.g., "professional photography", "studio lighting", "high resolution")
2. Include artistic style descriptors (e.g., "cinematic", "dramatic lighting", "depth of field")
3. Add quality keywords (e.g., "4k", "ultra-detailed", "sharp focus")
4. Include composition terms (e.g., "rule of thirds", "leading lines", "symmetrical")
5. Add mood and atmosphere descriptors
6. Include technical camera settings when appropriate
7. Keep the enhanced prompt under 200 words
8. Make it specific and actionable for AI image generation

Transform this basic idea into a professional Midjourney prompt:`;

      const userPrompt = `Basic idea: "${originalPrompt}"

Please enhance this into a detailed, professional prompt for AI image generation.`;

      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const enhancedPrompt = data.content[0].text.trim();
      
      console.log('✅ Enhanced prompt generated:', enhancedPrompt);
      return enhancedPrompt;

    } catch (error) {
      console.error('❌ Failed to enhance prompt:', error.message);
      
      // Fallback: Basic enhancement without AI
      const fallbackEnhancement = this.basicPromptEnhancement(originalPrompt);
      return fallbackEnhancement;
    }
  }

  // Fallback basic prompt enhancement
  basicPromptEnhancement(originalPrompt) {
    const enhancements = [
      'professional photography',
      'high resolution',
      'detailed',
      'cinematic lighting',
      'sharp focus',
      '4k quality'
    ];
    
    return `${originalPrompt}, ${enhancements.join(', ')}`;
  }
}

module.exports = new ContentService();
