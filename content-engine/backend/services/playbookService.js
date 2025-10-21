const { query } = require('../../database/config');

class PlaybookService {
  constructor() {
    console.log('📋 PlaybookService initialized');
  }

  // Project Management
  async createProject(projectData) {
    const { organization_id, name, description, industry } = projectData;
    
    try {
      const result = await query(
        `INSERT INTO projects (organization_id, name, description, industry)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [organization_id, name, description, industry]
      );
      
      console.log('✅ Project created:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to create project:', error.message);
      throw error;
    }
  }

  async getProjectsByOrganization(organization_id) {
    try {
      const result = await query(
        `SELECT * FROM projects WHERE organization_id = $1 ORDER BY created_at DESC`,
        [organization_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch projects:', error.message);
      throw error;
    }
  }

  // Hashtag Management
  async addProjectHashtag(project_id, hashtag, is_favorite = false) {
    try {
      const result = await query(
        `INSERT INTO project_hashtags (project_id, hashtag, is_favorite)
         VALUES ($1, $2, $3) RETURNING *`,
        [project_id, hashtag, is_favorite]
      );
      
      console.log('✅ Hashtag added:', result.rows[0].hashtag);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to add hashtag:', error.message);
      throw error;
    }
  }

  async getProjectHashtags(project_id) {
    try {
      const result = await query(
        `SELECT * FROM project_hashtags WHERE project_id = $1 ORDER BY is_favorite DESC, usage_count DESC`,
        [project_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch hashtags:', error.message);
      throw error;
    }
  }

  async updateHashtagUsage(hashtag_id) {
    try {
      const result = await query(
        `UPDATE project_hashtags SET usage_count = usage_count + 1 WHERE id = $1 RETURNING *`,
        [hashtag_id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to update hashtag usage:', error.message);
      throw error;
    }
  }

  // Post Types Management (formerly Content Recipes)
  async createContentRecipe(recipeData) {
    const { 
      project_id, 
      name, 
      description, 
      purpose, 
      target_audience, 
      required_asset_type, 
      tone, 
      suggested_frequency, 
      ai_instructions,
      color = '#6366f1'
    } = recipeData;
    
    try {
      const result = await query(
        `INSERT INTO post_types (project_id, name, description, purpose, target_audience, required_asset_type, tone, suggested_frequency, ai_instructions, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [project_id, name, description, purpose, target_audience, required_asset_type, tone, suggested_frequency, ai_instructions, color]
      );
      
      console.log('✅ Post type created:', result.rows[0].name);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to create post type:', error.message);
      throw error;
    }
  }

  async getContentRecipes(project_id) {
    try {
      const result = await query(
        `SELECT * FROM post_types WHERE project_id = $1 AND is_active = true ORDER BY name`,
        [project_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch post types:', error.message);
      throw error;
    }
  }

  async updateContentRecipe(recipeId, recipeData) {
    const { 
      name, 
      description, 
      purpose, 
      target_audience, 
      required_asset_type, 
      tone, 
      suggested_frequency, 
      ai_instructions,
      color
    } = recipeData;
    
    try {
      const result = await query(
        `UPDATE post_types 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             purpose = COALESCE($3, purpose),
             target_audience = COALESCE($4, target_audience),
             required_asset_type = COALESCE($5, required_asset_type),
             tone = COALESCE($6, tone),
             suggested_frequency = COALESCE($7, suggested_frequency),
             ai_instructions = COALESCE($8, ai_instructions),
             color = COALESCE($9, color),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10 AND is_active = true
         RETURNING *`,
        [name, description, purpose, target_audience, required_asset_type, tone, suggested_frequency, ai_instructions, color, recipeId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Post type not found or inactive');
      }
      
      console.log('✅ Post type updated:', result.rows[0].name);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to update post type:', error.message);
      throw error;
    }
  }

  async deleteContentRecipe(recipeId) {
    try {
      const result = await query(
        `UPDATE post_types 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_active = true
         RETURNING *`,
        [recipeId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Post type not found or already inactive');
      }
      
      console.log('✅ Post type deleted:', result.rows[0].name);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to delete post type:', error.message);
      throw error;
    }
  }

  // Channel Templates Management
  async createChannelTemplate(templateData) {
    const { 
      project_id, 
      channel, 
      template_name, 
      formatting_rules, 
      example_output, 
      is_default = false 
    } = templateData;
    
    try {
      const result = await query(
        `INSERT INTO channel_templates (project_id, channel, template_name, formatting_rules, example_output, is_default)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [project_id, channel, template_name, JSON.stringify(formatting_rules), example_output, is_default]
      );
      
      console.log('✅ Channel template created:', result.rows[0].template_name);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to create channel template:', error.message);
      throw error;
    }
  }

  async getChannelTemplates(project_id, channel = null) {
    try {
      let queryText = `SELECT * FROM channel_templates WHERE project_id = $1`;
      let params = [project_id];
      
      if (channel) {
        queryText += ` AND channel = $2`;
        params.push(channel);
      }
      
      queryText += ` ORDER BY is_default DESC, template_name`;
      
      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch channel templates:', error.message);
      throw error;
    }
  }

  // Content Generation with Playbook Adherence
  async saveContentGeneration(generationData) {
    const { 
      project_id, 
      content_recipe_id, 
      channel_template_id, 
      generated_content, 
      applied_hashtags, 
      formatting_applied, 
      ai_metadata 
    } = generationData;
    
    try {
      const result = await query(
        `INSERT INTO content_generations (project_id, content_recipe_id, channel_template_id, generated_content, applied_hashtags, formatting_applied, ai_metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [project_id, content_recipe_id, channel_template_id, generated_content, applied_hashtags, JSON.stringify(formatting_applied), JSON.stringify(ai_metadata)]
      );
      
      console.log('✅ Content generation saved:', result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to save content generation:', error.message);
      throw error;
    }
  }

  async getContentGenerations(project_id, limit = 50) {
    try {
      const result = await query(
        `SELECT cg.*, pt.name as recipe_name, ct.template_name, ct.channel
         FROM content_generations cg
         LEFT JOIN post_types pt ON cg.content_recipe_id = pt.id
         LEFT JOIN channel_templates ct ON cg.channel_template_id = ct.id
         WHERE cg.project_id = $1
         ORDER BY cg.created_at DESC
         LIMIT $2`,
        [project_id, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch content generations:', error.message);
      throw error;
    }
  }

  // AI-Driven Hashtag Discovery
  async generateDynamicHashtags(content, industry, topic) {
    // This would integrate with Claude API to suggest trending hashtags
    // For now, return some example hashtags based on industry
    const industryHashtags = {
      restaurant: ['#Foodie', '#RestaurantLife', '#Culinary', '#DiningOut', '#ChefLife'],
      property: ['#RealEstate', '#PropertyInvestment', '#HomeBuying', '#LuxuryHomes', '#PropertyMarket'],
      agency: ['#Marketing', '#DigitalMarketing', '#BusinessGrowth', '#BrandStrategy', '#MarketingAgency']
    };

    const baseHashtags = industryHashtags[industry] || ['#Business', '#Growth', '#Success'];
    
    // In a real implementation, this would call Claude API to analyze content and suggest hashtags
    return baseHashtags.slice(0, 5);
  }

  // Get Playbook Summary for a Project
  async getPlaybookSummary(project_id) {
    try {
      const [project, hashtags, recipes, templates, generations] = await Promise.all([
        query('SELECT * FROM projects WHERE id = $1', [project_id]),
        this.getProjectHashtags(project_id),
        this.getContentRecipes(project_id),
        this.getChannelTemplates(project_id),
        this.getContentGenerations(project_id, 10)
      ]);

      return {
        project: project.rows[0],
        hashtags: {
          total: hashtags.length,
          favorites: hashtags.filter(h => h.is_favorite).length,
          dynamic: hashtags.filter(h => !h.is_favorite).length
        },
        recipes: {
          total: recipes.length,
          active: recipes.filter(r => r.is_active).length
        },
        templates: {
          total: templates.length,
          channels: [...new Set(templates.map(t => t.channel))]
        },
        recent_generations: generations.length
      };
    } catch (error) {
      console.error('❌ Failed to get playbook summary:', error.message);
      throw error;
    }
  }
}

module.exports = new PlaybookService();
