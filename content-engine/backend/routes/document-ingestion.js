/**
 * Document Ingestion API Routes
 * 
 * Handles AI-powered document parsing and content extraction
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');
const documentIngestionService = require('../services/documentIngestionService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, PDF, and TXT files are allowed.'));
    }
  }
});

/**
 * POST /api/document-ingestion/:projectId/ingest
 * Upload and process a document with AI
 */
router.post('/:projectId/ingest', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { processImmediately = 'true' } = req.body;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to this project' 
      });
    }

    const startTime = Date.now();
    
    try {
      // Process the document with AI
      const result = await documentIngestionService.ingestDocument(
        req.file.path,
        req.file.originalname,
        projectId,
        userId
      );

      const processingTime = Date.now() - startTime;

      // Update processing time in database
      await query(
        'UPDATE document_ingestions SET processing_time_ms = $1 WHERE id = $2',
        [processingTime, result.ingestionId]
      );

      res.json({
        success: true,
        data: {
          ingestionId: result.ingestionId,
          fileName: req.file.originalname,
          documentType: result.data.documentType,
          summary: result.summary,
          contentItems: result.data.contentItems,
          metadata: result.data.metadata
        },
        message: 'Document processed successfully'
      });

    } catch (processingError) {
      console.error('Document processing error:', processingError);
      
      // Save failed ingestion record
      await query(`
        INSERT INTO document_ingestions 
        (project_id, user_id, file_name, file_path, document_type, status, error_message, processing_time_ms)
        VALUES ($1, $2, $3, $4, 'general', 'failed', $5, $6)
      `, [
        projectId,
        userId,
        req.file.originalname,
        req.file.path,
        processingError.message,
        Date.now() - startTime
      ]);

      res.status(500).json({
        success: false,
        error: 'Failed to process document',
        details: processingError.message
      });
    }

  } catch (error) {
    console.error('Document ingestion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * POST /api/document-ingestion/:projectId/process-existing
 * Process an existing document from the reference documents system
 */
router.post('/:projectId/process-existing', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { documentId, documentName, mimeType } = req.body;

    if (!documentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Document ID is required' 
      });
    }

    // Verify user has access to this project and document
    const documentCheck = await query(
      `SELECT crd.* FROM client_reference_documents crd
       JOIN projects p ON crd.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE crd.id = $1 AND crd.project_id = $2 AND uo.user_id = $3`,
      [documentId, projectId, userId]
    );

    if (documentCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found or access denied' 
      });
    }

    const document = documentCheck.rows[0];
    const filePath = path.join(__dirname, '../../', document.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found on server' 
      });
    }

    const startTime = Date.now();
    
    try {
      // Process the document with AI using the existing file
      const result = await documentIngestionService.ingestDocument(
        filePath,
        document.file_name,
        projectId,
        userId
      );

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          ingestionId: result.ingestionId,
          fileName: document.file_name,
          documentType: result.data.documentType,
          summary: result.summary,
          contentItems: result.data.contentItems,
          metadata: result.data.metadata
        },
        message: 'Document processed successfully'
      });

    } catch (processingError) {
      console.error('Document processing error:', processingError);
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process document',
        details: processingError.message
      });
    }

  } catch (error) {
    console.error('Document ingestion error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /api/document-ingestion/:projectId/history
 * Get ingestion history for a project
 */
router.get('/:projectId/history', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to this project' 
      });
    }

    const history = await documentIngestionService.getIngestionHistory(projectId, userId);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching ingestion history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch ingestion history' 
    });
  }
});

/**
 * GET /api/document-ingestion/:ingestionId/result
 * Get specific ingestion result
 */
router.get('/:ingestionId/result', authenticateToken, async (req, res) => {
  try {
    const { ingestionId } = req.params;
    const userId = req.user.userId;

    const result = await documentIngestionService.getIngestionResult(ingestionId, userId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching ingestion result:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch ingestion result' 
    });
  }
});

/**
 * GET /api/document-ingestion/:ingestionId/content-items
 * Get content items from a specific ingestion
 */
router.get('/:ingestionId/content-items', authenticateToken, async (req, res) => {
  try {
    const { ingestionId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    // Verify user has access to this ingestion
    const accessCheck = await query(`
      SELECT di.id FROM document_ingestions di
      JOIN projects p ON di.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE di.id = $1 AND uo.user_id = $2
    `, [ingestionId, userId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to this ingestion' 
      });
    }

    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT 
        eci.id,
        eci.item_id,
        eci.item_type,
        eci.title,
        eci.description,
        eci.content_data,
        eci.metadata,
        eci.created_at,
        COUNT(*) OVER() as total_count
      FROM extracted_content_items eci
      WHERE eci.ingestion_id = $1
      ORDER BY eci.created_at ASC
      LIMIT $2 OFFSET $3
    `, [ingestionId, limit, offset]);

    const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;

    res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount),
          pages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching content items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch content items' 
    });
  }
});

/**
 * POST /api/document-ingestion/:contentItemId/map
 * Map a content item to a system entity
 */
router.post('/:contentItemId/map', authenticateToken, async (req, res) => {
  try {
    const { contentItemId } = req.params;
    const userId = req.user.userId;
    const { mappedType, mappedId, mappingNotes, mappingConfidence = 0.8 } = req.body;

    if (!mappedType) {
      return res.status(400).json({ 
        success: false, 
        error: 'mappedType is required' 
      });
    }

    // Verify user has access to this content item
    const accessCheck = await query(`
      SELECT eci.id, di.project_id FROM extracted_content_items eci
      JOIN document_ingestions di ON eci.ingestion_id = di.id
      JOIN projects p ON di.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE eci.id = $1 AND uo.user_id = $2
    `, [contentItemId, userId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to this content item' 
      });
    }

    // Create mapping
    const result = await query(`
      INSERT INTO content_mappings 
      (content_item_id, mapped_type, mapped_id, mapping_confidence, mapping_notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [contentItemId, mappedType, mappedId, mappingConfidence, mappingNotes, userId]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Content item mapped successfully'
    });

  } catch (error) {
    console.error('Error mapping content item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to map content item' 
    });
  }
});

/**
 * GET /api/document-ingestion/:projectId/analytics
 * Get analytics for document ingestion in a project
 */
router.get('/:projectId/analytics', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to this project' 
      });
    }

    // Get analytics data
    const analytics = await query(`
      SELECT 
        COUNT(*) as total_ingestions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_ingestions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_ingestions,
        AVG(processing_time_ms) as avg_processing_time,
        COUNT(DISTINCT document_type) as document_types_count
      FROM document_ingestions 
      WHERE project_id = $1
    `, [projectId]);

    const contentStats = await query(`
      SELECT 
        COUNT(eci.id) as total_content_items,
        COUNT(DISTINCT eci.item_type) as content_types_count,
        COUNT(cm.id) as mapped_items,
        COUNT(CASE WHEN cm.mapping_status = 'mapped' THEN 1 END) as successfully_mapped
      FROM document_ingestions di
      LEFT JOIN extracted_content_items eci ON di.id = eci.ingestion_id
      LEFT JOIN content_mappings cm ON eci.id = cm.content_item_id
      WHERE di.project_id = $1
    `, [projectId]);

    const documentTypeBreakdown = await query(`
      SELECT 
        document_type,
        COUNT(*) as count,
        AVG(processing_time_ms) as avg_processing_time
      FROM document_ingestions 
      WHERE project_id = $1
      GROUP BY document_type
      ORDER BY count DESC
    `, [projectId]);

    res.json({
      success: true,
      data: {
        overview: analytics.rows[0],
        content: contentStats.rows[0],
        documentTypes: documentTypeBreakdown.rows
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    });
  }
});

module.exports = router;
