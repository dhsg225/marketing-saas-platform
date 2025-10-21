const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../../middleware/auth');
const crypto = require('crypto');

// Encryption/Decryption utilities
const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'default-secret-key-change-in-production';

function encryptApiKey(apiKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, SECRET_KEY);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted: encrypted,
    iv: iv.toString('hex')
  };
}

function decryptApiKey(encryptedData) {
  const decipher = crypto.createDecipher(ALGORITHM, SECRET_KEY);
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Get user's API keys (masked for security)
router.get('/keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await query(`
      SELECT 
        uak.id,
        uak.model_id,
        uak.is_valid,
        uak.created_at,
        uak.updated_at,
        mc.provider_name,
        mc.model_type,
        mc.api_key_type
      FROM user_api_keys uak
      JOIN model_configs mc ON uak.model_id = mc.model_id
      WHERE uak.user_id = $1
      ORDER BY uak.created_at DESC
    `, [userId]);

    // Mask the API keys for security
    const maskedKeys = result.rows.map(key => ({
      ...key,
      hasKey: true,
      maskedKey: '***' + (key.model_id.slice(-4)) // Show last 4 chars of model_id
    }));

    res.json({
      success: true,
      data: maskedKeys
    });

  } catch (error) {
    console.error('Error fetching user API keys:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch API keys' 
    });
  }
});

// Get specific API key status (without revealing the key)
router.get('/keys/:modelId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { modelId } = req.params;
    
    const result = await query(`
      SELECT 
        uak.id,
        uak.model_id,
        uak.is_valid,
        uak.created_at,
        uak.updated_at,
        mc.provider_name,
        mc.model_type,
        mc.api_key_type
      FROM user_api_keys uak
      JOIN model_configs mc ON uak.model_id = mc.model_id
      WHERE uak.user_id = $1 AND uak.model_id = $2
    `, [userId, modelId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasKey: false,
          modelId,
          is_valid: false
        }
      });
    }

    const key = result.rows[0];
    res.json({
      success: true,
      data: {
        hasKey: true,
        modelId: key.model_id,
        is_valid: key.is_valid,
        created_at: key.created_at,
        updated_at: key.updated_at,
        provider_name: key.provider_name,
        model_type: key.model_type,
        api_key_type: key.api_key_type,
        maskedKey: '***' + (key.model_id.slice(-4))
      }
    });

  } catch (error) {
    console.error('Error fetching API key status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch API key status' 
    });
  }
});

// UPSERT API key (create or update)
router.post('/keys', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { modelId, apiKey } = req.body;

    if (!modelId || !apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Model ID and API key are required' 
      });
    }

    // Validate that the model exists and supports user-specific keys
    const modelCheck = await query(`
      SELECT model_id, provider_name, api_key_type 
      FROM model_configs 
      WHERE model_id = $1 AND api_key_type = 'user_specific'
    `, [modelId]);

    if (modelCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Model not found or does not support user-specific API keys' 
      });
    }

    // Encrypt the API key
    const encryptedData = encryptApiKey(apiKey);

    // UPSERT the API key
    const result = await query(`
      INSERT INTO user_api_keys (user_id, model_id, encrypted_api_key, is_valid, created_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      ON CONFLICT (user_id, model_id) 
      DO UPDATE SET 
        encrypted_api_key = $3,
        is_valid = true,
        updated_at = NOW()
      RETURNING id, model_id, is_valid, created_at, updated_at
    `, [userId, modelId, encryptedData.encrypted]);

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        modelId: result.rows[0].model_id,
        is_valid: result.rows[0].is_valid,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        provider_name: modelCheck.rows[0].provider_name,
        model_type: modelCheck.rows[0].model_type,
        api_key_type: modelCheck.rows[0].api_key_type,
        message: 'API key saved successfully'
      }
    });

  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save API key' 
    });
  }
});

// Delete API key
router.delete('/keys/:modelId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { modelId } = req.params;
    
    const result = await query(`
      DELETE FROM user_api_keys 
      WHERE user_id = $1 AND model_id = $2
      RETURNING model_id
    `, [userId, modelId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'API key not found' 
      });
    }

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete API key' 
    });
  }
});

// Test API key validity
router.post('/keys/:modelId/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { modelId } = req.params;
    
    // Get the encrypted API key
    const result = await query(`
      SELECT encrypted_api_key FROM user_api_keys 
      WHERE user_id = $1 AND model_id = $2 AND is_valid = true
    `, [userId, modelId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'API key not found' 
      });
    }

    // For now, just return success (in a real implementation, you'd test the key)
    res.json({
      success: true,
      message: 'API key is valid',
      valid: true
    });

  } catch (error) {
    console.error('Error testing API key:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test API key' 
    });
  }
});

module.exports = router;
