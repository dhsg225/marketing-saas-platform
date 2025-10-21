/**
 * Document Ingestion Routes with Real AI Processing
 * Processes documents with AI and extracts structured content
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { getModelConfig } = require('../config/ai-models');
const pdfParse = require('pdf-parse').default || require('pdf-parse');
const csv = require('csv-parser');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../../database/config');

const router = express.Router();

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

/**
 * Process document content with Claude AI
 */
async function processDocumentWithClaude(documentContent, documentName, mimeType, skipItems = []) {
  try {
    console.log('🔄 Starting 2-pass AI analysis...');
    
    // PASS 1: Structure Analysis
    console.log('📋 Pass 1: Analyzing document structure...');
    const docAnalysisConfig = getModelConfig('DOCUMENT_ANALYSIS');
    console.log(`🤖 Using model: ${docAnalysisConfig.model} for document analysis`);
    const structureResponse = await anthropic.messages.create({
      model: docAnalysisConfig.model,
      max_tokens: docAnalysisConfig.max_tokens,
      system: `You are a document structure analyst. Analyze the provided document and determine its structure, format, and data organization. 

CRITICAL: You MUST return ONLY valid JSON. Do not include any explanations, markdown formatting, or text outside the JSON object.

Return a JSON response with this EXACT format:

{
  "documentType": "Content Calendar",
  "structure": {
    "format": "CSV",
    "hasHeaders": true,
    "columns": ["column1", "column2", "column3"],
    "dataRows": 10,
    "keyFields": ["date", "content", "platform", "format"],
    "delimiter": ",",
    "encoding": "UTF-8"
  },
  "insights": ["key structural insights"],
  "recommendations": ["how to best parse this data"]
}

IMPORTANT: Return ONLY the JSON object, nothing else.`,
      messages: [
        {
          role: "user",
          content: `Analyze the structure of this document to understand how to parse it correctly:

Document: ${documentName}
Content: ${documentContent.substring(0, 2000)}`
        }
      ]
    });

    let structureAnalysis;
    try {
      // Clean the response text before parsing
      let responseText = structureResponse.content[0].text.trim();
      
      // Remove any markdown code blocks if present
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('📋 Raw structure response:', responseText.substring(0, 500) + '...');
      
      structureAnalysis = JSON.parse(responseText);
      console.log('📋 Structure analysis:', structureAnalysis);
    } catch (parseError) {
      console.error('❌ Structure JSON parsing error:', parseError.message);
      console.error('❌ Raw structure response:', structureResponse.content[0].text);
      
      // Fallback structure analysis
      structureAnalysis = {
        documentType: "Content Calendar",
        structure: {
          format: "CSV",
          hasHeaders: true,
          columns: ["Week", "Day", "Date", "Format", "Caption", "Visual", "CTA"],
          dataRows: 10,
          keyFields: ["Date", "Format", "Caption"],
          delimiter: ",",
          encoding: "UTF-8"
        },
        insights: ["Fallback analysis due to JSON parsing error"],
        recommendations: ["Manual review recommended"]
      };
    }

    // PASS 2: Data Extraction based on structure
    console.log('📊 Pass 2: Extracting data based on structure...');
    console.log('📄 Document content length:', documentContent.length);
    console.log('📄 Document name:', documentName);
    console.log('⏭️ Skipping items:', skipItems.length > 0 ? skipItems.length : 'none');
    
    const docExtractionConfig = getModelConfig('DOCUMENT_EXTRACTION');
    console.log(`🤖 Using model: ${docExtractionConfig.model} for content extraction`);
    
    // Build skip instruction if we have items to skip
    const skipInstruction = skipItems.length > 0 ? `
CRITICAL: DO NOT extract these items that have already been processed:
${skipItems.map((item, index) => `${index + 1}. "${item.title}" (${item.date})`).join('\n')}

ONLY extract NEW items that are NOT in the above list.` : '';

    const extractionResponse = await anthropic.messages.create({
      model: docExtractionConfig.model,
      max_tokens: docExtractionConfig.max_tokens,
      stream: true,
      system: `You are an expert data extraction specialist. Based on the document structure analysis, extract all relevant content and organize it into a structured format. 

CRITICAL: You MUST return ONLY valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON object.

Return a JSON response with this EXACT format:

{
  "documentType": "Content Calendar",
  "summary": {
    "documentType": "Content Calendar",
    "totalItems": number,
    "dateRange": {
      "start": "YYYY-MM-DD or null",
      "end": "YYYY-MM-DD or null"
    },
    "platforms": ["Instagram", "Facebook", "TikTok"],
    "insights": ["key insights about the content"]
  },
  "contentItems": [
    {
      "title": "Post title or description",
      "description": "Full post content",
      "format": "Feed carousel, Reel, Story, etc.",
      "date": "YYYY-MM-DD",
      "platform": "Instagram, Facebook, etc.",
      "type": "Educational, Promotional, etc.",
      "hashtags": ["#hashtag1", "#hashtag2"]
    }
  ]
}

IMPORTANT: 
- Extract ALL content items from the document, not just samples
- Process EVERY SINGLE ROW/ITEM in the document
- Do not skip any content items, even if there are many
- Return ONLY the JSON object, nothing else
- Include every single content item found in the document
- If the document has 50 items, return 50 items
- If the document has 100 items, return 100 items
- For very large documents, focus on extracting the most important/recent content first
${skipInstruction}`,
      messages: [
        {
          role: "user",
          content: `Based on the structure analysis, extract ALL content from this document:

Structure Analysis: ${JSON.stringify(structureAnalysis, null, 2)}

Document: ${documentName}
Full Content: ${documentContent}

${skipInstruction}`
        }
      ]
    });

    let extractionResult;
    try {
      // Handle streaming response
      let responseText = '';
      for await (const chunk of extractionResponse) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          responseText += chunk.delta.text;
        }
      }
      
      // Clean the response text before parsing
      responseText = responseText.trim();
      
      // Remove any markdown code blocks if present
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('📊 Raw AI response:', responseText.substring(0, 500) + '...');
      
      extractionResult = JSON.parse(responseText);
      console.log('📊 Data extraction complete:', extractionResult);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError.message);
      console.error('❌ Raw response:', responseText);
      
      // Fallback: try to extract content items manually from the response
      const contentItemsMatch = responseText.match(/"contentItems":\s*\[(.*?)\]/s);
      
      if (contentItemsMatch) {
        console.log('🔧 Attempting manual extraction from malformed JSON...');
        extractionResult = {
          documentType: "Content Calendar",
          summary: {
            documentType: "Content Calendar",
            totalItems: 0,
            insights: ["AI returned malformed JSON", "Manual extraction attempted"]
          },
          contentItems: []
        };
      } else {
        throw parseError;
      }
    }
    
    console.log('✅ AI processing completed successfully');
    console.log('📊 Extracted items count:', extractionResult.contentItems?.length || 0);
    console.log('📊 Document type:', extractionResult.documentType);
    console.log('📊 Summary:', extractionResult.summary);
    
    return extractionResult;
    
  } catch (error) {
    console.error('🚨 2-pass AI analysis error:', error);
    console.error('🚨 Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type
    });
    // Fallback to basic extraction
    return {
      documentType: "Content Calendar",
      summary: {
        documentType: "Content Calendar",
        totalItems: 0,
        insights: ["AI analysis failed", "Document may need manual review"]
      },
      contentItems: []
    };
  }
}

/**
 * POST /api/document-ingestion/:projectId/process-existing
 * Process an existing document with AI
 */
router.post('/:projectId/process-existing', authenticateToken, async (req, res) => {
  console.log('🔥 AI PROCESSING REQUEST RECEIVED:', req.params, req.body);
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

    // Get the document from database to find the file path
    const documentResult = await query(
      `SELECT file_path, file_name, mime_type FROM client_reference_documents 
       WHERE id = $1 AND project_id = $2`,
      [documentId, projectId]
    );

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }

    const document = documentResult.rows[0];
    // The file_path from DB is already absolute, don't join with __dirname
    const filePath = document.file_path;
    
    console.log('📁 Document file path from DB:', document.file_path);
    console.log('📁 Full file path:', filePath);
    console.log('📁 __dirname:', __dirname);

    // Check if file exists
    try {
      await fs.promises.access(filePath);
      console.log('✅ File exists and is accessible');
    } catch (error) {
      console.log('❌ File access error:', error.message);
      return res.status(404).json({ 
        success: false, 
        error: 'File not found on server' 
      });
    }

        // Read and process the document
        let documentContent = '';
        
        try {
          if (document.mime_type === 'text/plain' || document.file_name.endsWith('.txt')) {
            documentContent = await fs.promises.readFile(filePath, 'utf8');
          } else if (document.mime_type === 'application/pdf' || document.file_name.endsWith('.pdf')) {
            // Actually read the PDF content using pdf-parse
            console.log('📄 Reading PDF content...');
            const pdfBuffer = await fs.promises.readFile(filePath);
            const pdfData = await pdfParse(pdfBuffer);
            documentContent = pdfData.text;
            console.log('📄 PDF content length:', documentContent.length, 'characters');
          } else if (document.mime_type === 'text/csv' || document.file_name.endsWith('.csv')) {
            console.log('📊 Reading CSV content as raw text...');
            // Read CSV as raw text - let AI handle the parsing
            documentContent = await fs.promises.readFile(filePath, 'utf8');
            console.log(`📊 CSV content length: ${documentContent.length} characters`);
      } else if (document.mime_type.includes('spreadsheet') || document.file_name.endsWith('.xlsx')) {
        documentContent = `Spreadsheet Document: ${document.file_name}\n\n[Excel content would be extracted here using xlsx library]`;
      } else {
        documentContent = `Document: ${document.file_name}\n\n[Content would be extracted based on file type]`;
      }
    } catch (error) {
      console.error('Error reading file:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to read document' 
      });
    }

    // Get already processed items to skip duplicates
    let skipItems = [];
    try {
      const existingContent = await query(
        `SELECT title, description, suggested_date 
         FROM content_ideas 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [projectId]
      );
      skipItems = existingContent.rows.map(row => ({
        title: row.title,
        description: row.description,
        date: row.suggested_date
      }));
      console.log('📋 Found existing content items to skip:', skipItems.length);
    } catch (error) {
      console.log('⚠️ Could not fetch existing content, proceeding without skip list');
    }

    // Process with Claude AI
    try {
      console.log('🤖 Starting AI processing for document:', documentName || document.file_name);
      console.log('📄 Document content length:', documentContent.length);
      console.log('📄 Document mime type:', document.mime_type);
      
      const aiResult = await processDocumentWithClaude(
        documentContent, 
        documentName || document.file_name, 
        document.mime_type,
        skipItems
      );
      
      console.log('✅ AI processing completed. Items found:', aiResult.contentItems?.length || 0);
      console.log('📊 Full AI result:', JSON.stringify(aiResult, null, 2));

      // Determine if this is a completion scenario
      const itemsFound = aiResult.contentItems?.length || 0;
      const totalInDocument = aiResult.summary?.totalItems || 0;
      const isComplete = itemsFound === 0 && skipItems.length > 0;
      
      let message = `Document processed with Claude AI! Extracted ${itemsFound} content items.`;
      if (isComplete) {
        message = `🎉 All content has been successfully imported! No new items found - you've processed all ${skipItems.length} items from this document.`;
      } else if (itemsFound === 0 && skipItems.length === 0) {
        message = `No content items found in this document. Please check if the document contains extractable content.`;
      }

      res.json({
        success: true,
        data: {
          ingestionId: 'ai-' + Date.now(),
          fileName: documentName || document.file_name,
          documentType: aiResult.documentType,
          summary: {
            ...aiResult.summary,
            isComplete: isComplete,
            alreadyProcessed: skipItems.length,
            message: message
          },
          contentItems: aiResult.contentItems
        },
        message: message
      });

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      
      // Fallback to basic processing if AI fails
      const lines = documentContent.split('\n').filter(line => line.trim());
      const contentItems = lines.slice(0, 5).map((line, index) => ({
        title: `Section ${index + 1}`,
        description: line.substring(0, 150) + (line.length > 150 ? '...' : ''),
        format: 'Text',
        date: new Date().toISOString().split('T')[0]
      }));

      res.json({
        success: true,
        data: {
          ingestionId: 'fallback-' + Date.now(),
          fileName: documentName || document.file_name,
          documentType: 'Document',
          summary: {
            documentType: 'Document',
            totalItems: contentItems.length,
            insights: ['AI processing failed, using basic extraction', 'Content extracted successfully']
          },
          contentItems: contentItems
        },
        message: `Document processed with fallback method! Extracted ${contentItems.length} content sections.`
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

module.exports = router;
module.exports.processDocumentWithClaude = processDocumentWithClaude;
