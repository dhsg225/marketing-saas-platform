const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

// Helper function to generate AI description for documents
const generateDocumentDescription = (document, extractedText) => {
  // This is a simulated AI description generator
  // In a real implementation, this would call an AI service like OpenAI
  
  const category = document.document_category;
  const name = document.name;
  const fileType = document.mime_type;
  
  // Generate context-aware descriptions based on document category and content
  let description = '';
  
  if (category === 'menu') {
    description = `Menu document for ${name}. Contains food and beverage offerings with pricing and descriptions.`;
  } else if (category === 'brand_guidelines') {
    description = `Brand guidelines document for ${name}. Includes logo usage, color palettes, typography, and brand voice guidelines.`;
  } else if (category === 'marketing_materials') {
    description = `Marketing materials for ${name}. Contains promotional content, campaigns, and marketing assets.`;
  } else if (category === 'operational_guidelines') {
    description = `Operational guidelines for ${name}. Includes procedures, policies, and operational standards.`;
  } else if (category === 'legal_documents') {
    description = `Legal document for ${name}. Contains legal terms, contracts, or compliance information.`;
  } else if (category === 'price_list') {
    description = `Price list for ${name}. Contains product pricing, packages, and service costs.`;
  } else if (category === 'reference_images') {
    description = `Reference images for ${name}. Visual assets and imagery for brand or marketing use.`;
  } else {
    description = `Document for ${name}. Contains relevant information and content for the project.`;
  }
  
  // Add content-based insights if text was extracted
  if (extractedText && !extractedText.includes('Content extraction not')) {
    const wordCount = extractedText.split(' ').length;
    const hasNumbers = /\d/.test(extractedText);
    const hasEmail = /@/.test(extractedText);
    const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(extractedText);
    
    description += ` Document contains approximately ${wordCount} words`;
    
    if (hasNumbers) description += ', includes numerical data';
    if (hasEmail) description += ', contains contact information';
    if (hasPhone) description += ', includes phone numbers';
    
    description += '.';
  }
  
  // Add file type context
  if (fileType === 'application/pdf') {
    description += ' This is a PDF document with formatted content.';
  } else if (fileType.startsWith('image/')) {
    description += ' This is an image file for visual reference.';
  } else if (fileType.includes('word') || fileType.includes('document')) {
    description += ' This is a Microsoft Word document.';
  } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
    description += ' This is a spreadsheet with data and calculations.';
  }
  
  return description;
};

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const projectId = req.params.projectId;
    const uploadDir = path.join(__dirname, '../../uploads/reference-documents', projectId);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'), false);
    }
  }
});

// GET /api/reference-documents/:projectId - Get all documents for a project
router.get('/:projectId', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Get all documents for the project
    const result = await query(
      `SELECT 
         crd.*,
         u.name as uploaded_by_name
       FROM client_reference_documents crd
       LEFT JOIN users u ON crd.uploaded_by = u.id
       WHERE crd.project_id = $1
       ORDER BY crd.created_at DESC`,
      [projectId]
    );

    res.json({
      success: true,
      documents: result.rows
    });

  } catch (error) {
    console.error('Error fetching reference documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/reference-documents/:projectId - Upload a new document
router.post('/:projectId', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { name, description, document_category, is_ai_accessible } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
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
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Insert document record into database
    const result = await query(
      `INSERT INTO client_reference_documents 
       (project_id, name, description, file_name, file_path, file_size, file_type, mime_type, document_category, is_ai_accessible, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        projectId,
        name || req.file.originalname,
        description || null,
        req.file.originalname,
        req.file.path,
        req.file.size,
        path.extname(req.file.originalname).toLowerCase(),
        req.file.mimetype,
        document_category || 'general',
        is_ai_accessible !== 'false', // Default to true unless explicitly false
        userId
      ]
    );

    res.status(201).json({
      success: true,
      document: result.rows[0],
      message: 'Document uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Clean up uploaded file if database insert failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/reference-documents/:projectId/:documentId/download - Download a document
router.get('/:projectId/:documentId/download', authenticateToken, async (req, res) => {
  try {
    const { projectId, documentId } = req.params;
    const userId = req.user.userId;

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
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    const document = documentCheck.rows[0];
    const filePath = path.join(__dirname, '../../', document.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Length', document.file_size);

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// PUT /api/reference-documents/:projectId/:documentId - Update document metadata
router.put('/:projectId/:documentId', authenticateToken, async (req, res) => {
  try {
    const { projectId, documentId } = req.params;
    const userId = req.user.userId;
    const { name, description, document_category, is_ai_accessible } = req.body;

    // Verify user has access to this project and document
    const documentCheck = await query(
      `SELECT crd.* FROM client_reference_documents crd
       JOIN projects p ON crd.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE crd.id = $1 AND crd.project_id = $2 AND uo.user_id = $3 AND crd.uploaded_by = $4`,
      [documentId, projectId, userId, userId]
    );

    if (documentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    // Update document metadata
    const result = await query(
      `UPDATE client_reference_documents 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           document_category = COALESCE($3, document_category),
           is_ai_accessible = COALESCE($4, is_ai_accessible),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, description, document_category, is_ai_accessible, documentId]
    );

    res.json({
      success: true,
      document: result.rows[0],
      message: 'Document updated successfully'
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/reference-documents/:projectId/:documentId - Delete a document
router.delete('/:projectId/:documentId', authenticateToken, async (req, res) => {
  try {
    const { projectId, documentId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this project and document
    const documentCheck = await query(
      `SELECT crd.* FROM client_reference_documents crd
       JOIN projects p ON crd.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE crd.id = $1 AND crd.project_id = $2 AND uo.user_id = $3 AND crd.uploaded_by = $4`,
      [documentId, projectId, userId, userId]
    );

    if (documentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    const document = documentCheck.rows[0];
    const filePath = path.join(__dirname, '../../', document.file_path);

    // Delete from database first
    await query('DELETE FROM client_reference_documents WHERE id = $1', [documentId]);

    // Delete file from filesystem
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file from filesystem:', error);
      // Don't fail the request if file deletion fails
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Generate AI description for a document
router.post('/:projectId/:documentId/generate-description', authenticateToken, async (req, res) => {
  try {
    const { projectId, documentId } = req.params;
    const userId = req.user.userId;

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
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    const document = documentCheck.rows[0];

    // Check if document is AI accessible
    if (!document.is_ai_accessible) {
      return res.status(403).json({ error: 'Document is not marked as AI accessible' });
    }

    // Extract text from document based on file type
    let extractedText = '';
    
    try {
      if (document.mime_type === 'application/pdf') {
        // For PDF files, we would need a PDF parser like pdf-parse
        // For now, return a placeholder
        extractedText = `[PDF Document: ${document.name}] - Content extraction not yet implemented for PDF files. Please add a manual description.`;
      } else if (document.mime_type.startsWith('text/')) {
        // For text files, read the content directly
        const fileContent = await fs.readFile(document.file_path, 'utf8');
        extractedText = fileContent.substring(0, 2000); // Limit to first 2000 characters
      } else if (document.mime_type.includes('word') || document.mime_type.includes('document')) {
        // For Word documents, we would need a library like mammoth
        extractedText = `[Word Document: ${document.name}] - Content extraction not yet implemented for Word documents. Please add a manual description.`;
      } else {
        extractedText = `[${document.document_category}: ${document.name}] - Content extraction not available for this file type (${document.mime_type}). Please add a manual description.`;
      }
    } catch (fileError) {
      console.error('Error reading document file:', fileError);
      return res.status(500).json({ error: 'Could not read document content' });
    }

    // Generate description using AI (simulated for now)
    // In a real implementation, this would call an AI service like OpenAI
    const aiDescription = generateDocumentDescription(document, extractedText);

    res.json({ 
      success: true, 
      description: aiDescription,
      extracted_text_length: extractedText.length
    });

  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reference-documents/:projectId/categories - Get available document categories
router.get('/:projectId/categories', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const categories = [
      { value: 'general', label: 'General Documents' },
      { value: 'menu', label: 'Menu / Product List' },
      { value: 'brand_guidelines', label: 'Brand Guidelines' },
      { value: 'price_list', label: 'Price List' },
      { value: 'operational_guidelines', label: 'Operational Guidelines' },
      { value: 'legal_documents', label: 'Legal Documents' },
      { value: 'marketing_materials', label: 'Marketing Materials' },
      { value: 'reference_images', label: 'Reference Images' },
      { value: 'content_calendar', label: 'Content Calendar' }
    ];

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
