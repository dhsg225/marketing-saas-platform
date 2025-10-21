const express = require('express');
const { pool } = require('../../database/config');
const { authenticateToken } = require('../../middleware/auth');
const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/content-strategy-viz/:projectId
 * Get content strategy visualization data for a specific project
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Get the active content strategy for this project
    const strategyResult = await pool.query(
      `SELECT 
        strategy_id,
        strategy_name,
        strategy_description,
        post_type_mix_targets,
        status
      FROM content_strategies 
      WHERE project_id = $1 AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT 1`,
      [projectId]
    );

    if (strategyResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasStrategy: false,
          message: 'No active content strategy found for this project'
        }
      });
    }

    const strategy = strategyResult.rows[0];
    const postTypeMixTargets = strategy.post_type_mix_targets || {};

    // Get actual content created for this project (from content_ideas table)
    const contentResult = await pool.query(
      `SELECT 
        pt.name as post_type_name,
        pt.color,
        COUNT(ci.id) as actual_count,
        COUNT(ci.id) FILTER (WHERE ci.status = 'approved') as approved_count,
        COUNT(ci.id) FILTER (WHERE ci.status = 'draft') as draft_count
      FROM post_types pt
      LEFT JOIN content_ideas ci ON pt.id = ci.post_type_id AND ci.project_id = $1
      WHERE pt.project_id = $1 AND pt.is_active = true
      GROUP BY pt.id, pt.name, pt.color
      ORDER BY pt.name`,
      [projectId]
    );

    // Calculate actual percentages
    const totalContent = contentResult.rows.reduce((sum, row) => sum + parseInt(row.actual_count), 0);
    const actualMix = {};
    const contentBreakdown = [];

    contentResult.rows.forEach(row => {
      const percentage = totalContent > 0 ? (row.actual_count / totalContent) * 100 : 0;
      actualMix[row.post_type_name.toLowerCase().replace(/\s+/g, '_')] = Math.round(percentage * 100) / 100;
      
      contentBreakdown.push({
        postTypeName: row.post_type_name,
        color: row.color || '#6366f1',
        targetPercentage: postTypeMixTargets[row.post_type_name.toLowerCase().replace(/\s+/g, '_')] || 0,
        actualPercentage: Math.round(percentage * 100) / 100,
        actualCount: parseInt(row.actual_count),
        approvedCount: parseInt(row.approved_count),
        draftCount: parseInt(row.draft_count)
      });
    });

    // Calculate gap analysis
    const gapAnalysis = contentBreakdown.map(item => ({
      ...item,
      gap: Math.round((item.actualPercentage - item.targetPercentage) * 100) / 100,
      status: item.actualPercentage >= item.targetPercentage ? 'over' : 'under'
    }));

    // Calculate overall strategy adherence score
    const adherenceScore = calculateAdherenceScore(postTypeMixTargets, actualMix);

    // Generate recommendations
    const recommendations = generateRecommendations(gapAnalysis);

    res.json({
      success: true,
      data: {
        hasStrategy: true,
        strategy: {
          id: strategy.strategy_id,
          name: strategy.strategy_name,
          description: strategy.strategy_description,
          status: strategy.status
        },
        targets: postTypeMixTargets,
        actuals: actualMix,
        contentBreakdown,
        gapAnalysis,
        adherenceScore,
        recommendations,
        summary: {
          totalTargetPercentage: Object.values(postTypeMixTargets).reduce((sum, val) => sum + val, 0),
          totalActualPercentage: Object.values(actualMix).reduce((sum, val) => sum + val, 0),
          totalContentCount: totalContent
        }
      }
    });

  } catch (error) {
    console.error('Error fetching content strategy visualization:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper function to calculate adherence score
 */
function calculateAdherenceScore(targets, actuals) {
  const targetKeys = Object.keys(targets);
  if (targetKeys.length === 0) return 0;

  let totalDeviation = 0;
  let validTargets = 0;

  targetKeys.forEach(key => {
    const target = targets[key] || 0;
    const actual = actuals[key] || 0;
    
    if (target > 0) {
      const deviation = Math.abs(actual - target);
      totalDeviation += deviation;
      validTargets++;
    }
  });

  if (validTargets === 0) return 0;

  const averageDeviation = totalDeviation / validTargets;
  const adherenceScore = Math.max(0, 100 - averageDeviation);
  
  return Math.round(adherenceScore * 100) / 100;
}

/**
 * Helper function to generate recommendations
 */
function generateRecommendations(gapAnalysis) {
  const recommendations = [];
  
  gapAnalysis.forEach(item => {
    if (item.gap > 10) {
      recommendations.push({
        type: 'over',
        postType: item.postTypeName,
        message: `${item.postTypeName} content is ${Math.abs(item.gap)}% over target. Consider reducing production or reallocating to underperforming types.`,
        priority: 'medium'
      });
    } else if (item.gap < -10) {
      recommendations.push({
        type: 'under',
        postType: item.postTypeName,
        message: `${item.postTypeName} content is ${Math.abs(item.gap)}% under target. Increase production to meet strategic goals.`,
        priority: 'high'
      });
    }
  });

  // Add general recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Your content mix is well-aligned with strategic targets!',
      priority: 'low'
    });
  }

  return recommendations;
}

/**
 * GET /api/content-strategy-viz/:projectId/summary
 * Get a quick summary of strategy adherence
 */
router.get('/:projectId/summary', async (req, res) => {
  try {
    const { projectId } = req.params;

    const strategyResult = await pool.query(
      `SELECT post_type_mix_targets FROM content_strategies 
       WHERE project_id = $1 AND status = 'active' 
       ORDER BY created_at DESC LIMIT 1`,
      [projectId]
    );

    if (strategyResult.rows.length === 0) {
      return res.json({
        success: true,
        data: { hasStrategy: false, adherenceScore: 0 }
      });
    }

    const targets = strategyResult.rows[0].post_type_mix_targets || {};

    const contentResult = await pool.query(
      `SELECT 
        COUNT(ci.id) as total_count,
        pt.name as post_type_name
      FROM post_types pt
      LEFT JOIN content_ideas ci ON pt.id = ci.post_type_id AND ci.project_id = $1
      WHERE pt.project_id = $1 AND pt.is_active = true
      GROUP BY pt.id, pt.name`,
      [projectId]
    );

    const totalContent = contentResult.rows.reduce((sum, row) => sum + parseInt(row.total_count), 0);
    const actualMix = {};

    contentResult.rows.forEach(row => {
      const percentage = totalContent > 0 ? (row.total_count / totalContent) * 100 : 0;
      actualMix[row.post_type_name.toLowerCase().replace(/\s+/g, '_')] = Math.round(percentage * 100) / 100;
    });

    const adherenceScore = calculateAdherenceScore(targets, actualMix);

    res.json({
      success: true,
      data: {
        hasStrategy: true,
        adherenceScore,
        totalContentCount: totalContent
      }
    });

  } catch (error) {
    console.error('Error fetching strategy summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
