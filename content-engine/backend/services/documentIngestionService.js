/**
 * Document Ingestion Service
 * 
 * AI-powered service to parse client documents and extract structured content
 * for integration with the marketing SaaS platform.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const pdf = require('pdf-parse');
const { query } = require('../../database/config');

class DocumentIngestionService {
  constructor() {
    this.supportedFormats = ['.csv', '.xlsx', '.xls', '.pdf', '.txt'];
    this.contentTypes = {
      'content_calendar': 'Content Calendar',
      'campaign_brief': 'Campaign Brief', 
      'brand_guidelines': 'Brand Guidelines',
      'content_ideas': 'Content Ideas',
      'social_media_plan': 'Social Media Plan',
      'marketing_strategy': 'Marketing Strategy'
    };
  }

  /**
   * Main ingestion method - determines document type and processes accordingly
   */
  async ingestDocument(filePath, fileName, projectId, userId) {
    try {
      const fileExtension = path.extname(fileName).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      let extractedData;
      
      switch (fileExtension) {
        case '.csv':
          extractedData = await this.parseCSV(filePath);
          break;
        case '.xlsx':
        case '.xls':
          extractedData = await this.parseExcel(filePath);
          break;
        case '.pdf':
          extractedData = await this.parsePDF(filePath);
          break;
        case '.txt':
          extractedData = await this.parseText(filePath);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      // Analyze and structure the data
      const structuredData = await this.analyzeAndStructure(extractedData, fileName);
      
      // Save to database
      const ingestionId = await this.saveIngestionResult(projectId, userId, fileName, structuredData);
      
      return {
        success: true,
        ingestionId,
        data: structuredData,
        summary: this.generateSummary(structuredData)
      };

    } catch (error) {
      console.error('Document ingestion error:', error);
      throw error;
    }
  }

  /**
   * Parse CSV files (like content calendars)
   */
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Parse Excel files
   */
  async parseExcel(filePath) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return xlsx.utils.sheet_to_json(worksheet);
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Parse PDF files
   */
  async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return this.parseTextContent(data.text);
    } catch (error) {
      throw new Error(`Failed to parse PDF file: ${error.message}`);
    }
  }

  /**
   * Parse text files
   */
  async parseText(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return this.parseTextContent(content);
    } catch (error) {
      throw new Error(`Failed to parse text file: ${error.message}`);
    }
  }

  /**
   * Parse text content into structured data
   */
  parseTextContent(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const structured = {
      sections: [],
      content: []
    };

    let currentSection = null;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Detect section headers (lines that are all caps or have specific patterns)
      if (trimmedLine.length > 0 && (
        trimmedLine === trimmedLine.toUpperCase() ||
        trimmedLine.match(/^[A-Z\s]+$/) ||
        trimmedLine.includes(':')
      )) {
        currentSection = {
          title: trimmedLine,
          content: [],
          lineNumber: index + 1
        };
        structured.sections.push(currentSection);
      } else if (currentSection) {
        currentSection.content.push(trimmedLine);
      } else {
        structured.content.push(trimmedLine);
      }
    });

    return structured;
  }

  /**
   * Analyze and structure the extracted data
   */
  async analyzeAndStructure(data, fileName) {
    const analysis = {
      documentType: this.detectDocumentType(data, fileName),
      contentItems: [],
      metadata: {
        totalItems: 0,
        dateRange: null,
        platforms: [],
        contentTypes: []
      }
    };

    // Detect content calendar structure
    if (this.isContentCalendar(data)) {
      analysis.contentItems = this.extractContentCalendarItems(data);
      analysis.metadata.totalItems = analysis.contentItems.length;
      analysis.metadata.dateRange = this.extractDateRange(analysis.contentItems);
      analysis.metadata.platforms = this.extractPlatforms(analysis.contentItems);
    }
    // Detect campaign brief structure
    else if (this.isCampaignBrief(data)) {
      analysis.contentItems = this.extractCampaignBriefItems(data);
    }
    // Detect content ideas structure
    else if (this.isContentIdeas(data)) {
      analysis.contentItems = this.extractContentIdeas(data);
    }
    // Generic text analysis
    else {
      analysis.contentItems = this.extractGenericContent(data);
    }

    return analysis;
  }

  /**
   * Detect document type based on content structure
   */
  detectDocumentType(data, fileName) {
    const fileNameLower = fileName.toLowerCase();
    
    if (fileNameLower.includes('calendar') || fileNameLower.includes('schedule')) {
      return 'content_calendar';
    }
    if (fileNameLower.includes('brief') || fileNameLower.includes('campaign')) {
      return 'campaign_brief';
    }
    if (fileNameLower.includes('guidelines') || fileNameLower.includes('brand')) {
      return 'brand_guidelines';
    }
    if (fileNameLower.includes('ideas') || fileNameLower.includes('concepts')) {
      return 'content_ideas';
    }

    // Analyze content structure
    if (this.isContentCalendar(data)) return 'content_calendar';
    if (this.isCampaignBrief(data)) return 'campaign_brief';
    if (this.isContentIdeas(data)) return 'content_ideas';
    
    return 'general';
  }

  /**
   * Check if data represents a content calendar
   */
  isContentCalendar(data) {
    if (!Array.isArray(data) || data.length === 0) return false;
    
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    
    // Look for content calendar indicators
    const calendarIndicators = ['date', 'day', 'week', 'format', 'caption', 'copy', 'visual', 'image', 'cta', 'event'];
    const matches = columns.filter(col => 
      calendarIndicators.some(indicator => 
        col.toLowerCase().includes(indicator)
      )
    );
    
    return matches.length >= 3; // At least 3 matching columns
  }

  /**
   * Check if data represents a campaign brief
   */
  isCampaignBrief(data) {
    if (Array.isArray(data)) {
      const text = data.map(row => Object.values(row).join(' ')).join(' ').toLowerCase();
      return text.includes('campaign') || text.includes('brief') || text.includes('objective');
    }
    return false;
  }

  /**
   * Check if data represents content ideas
   */
  isContentIdeas(data) {
    if (Array.isArray(data)) {
      const text = data.map(row => Object.values(row).join(' ')).join(' ').toLowerCase();
      return text.includes('idea') || text.includes('concept') || text.includes('theme');
    }
    return false;
  }

  /**
   * Extract content calendar items
   */
  extractContentCalendarItems(data) {
    return data.map((row, index) => ({
      id: `item_${index + 1}`,
      type: 'content_calendar_item',
      week: row.Week || row.week,
      day: row.Day || row.day,
      date: row.Date || row.date,
      format: row.Format || row.format,
      caption: row['Caption (copy)'] || row.caption || row.copy,
      visual: row['Visual / Image prompt'] || row.visual || row.image_prompt,
      cta: row.CTA || row.cta,
      event: row.EVENT || row.event,
      comments: row['Anna comment'] || row.comments || row.notes,
      metadata: {
        rowNumber: index + 1,
        hasVisual: !!(row['Visual / Image prompt'] || row.visual),
        hasCTA: !!(row.CTA || row.cta),
        hasEvent: !!(row.EVENT || row.event)
      }
    }));
  }

  /**
   * Extract campaign brief items
   */
  extractCampaignBriefItems(data) {
    // Implementation for campaign brief parsing
    return data.map((row, index) => ({
      id: `brief_${index + 1}`,
      type: 'campaign_brief_item',
      title: row.title || row.Title,
      description: row.description || row.Description,
      objective: row.objective || row.Objective,
      targetAudience: row.target_audience || row['Target Audience'],
      keyMessages: row.key_messages || row['Key Messages'],
      deliverables: row.deliverables || row.Deliverables,
      timeline: row.timeline || row.Timeline,
      budget: row.budget || row.Budget
    }));
  }

  /**
   * Extract content ideas
   */
  extractContentIdeas(data) {
    return data.map((row, index) => ({
      id: `idea_${index + 1}`,
      type: 'content_idea',
      title: row.title || row.Title || row.idea,
      description: row.description || row.Description,
      category: row.category || row.Category,
      platform: row.platform || row.Platform,
      format: row.format || row.Format,
      priority: row.priority || row.Priority,
      status: row.status || row.Status || 'draft'
    }));
  }

  /**
   * Extract generic content
   */
  extractGenericContent(data) {
    if (Array.isArray(data)) {
      return data.map((row, index) => ({
        id: `content_${index + 1}`,
        type: 'generic_content',
        content: Object.values(row).join(' '),
        metadata: row
      }));
    }
    
    return [{
      id: 'content_1',
      type: 'generic_content',
      content: data,
      metadata: {}
    }];
  }

  /**
   * Extract date range from content items
   */
  extractDateRange(items) {
    const dates = items
      .map(item => item.date)
      .filter(date => date)
      .sort();
    
    if (dates.length === 0) return null;
    
    return {
      start: dates[0],
      end: dates[dates.length - 1],
      totalDays: dates.length
    };
  }

  /**
   * Extract platforms from content items
   */
  extractPlatforms(items) {
    const platforms = new Set();
    
    items.forEach(item => {
      if (item.format) {
        const format = item.format.toLowerCase();
        if (format.includes('instagram') || format.includes('ig')) platforms.add('Instagram');
        if (format.includes('facebook') || format.includes('fb')) platforms.add('Facebook');
        if (format.includes('twitter') || format.includes('x')) platforms.add('Twitter');
        if (format.includes('linkedin')) platforms.add('LinkedIn');
        if (format.includes('tiktok')) platforms.add('TikTok');
        if (format.includes('youtube')) platforms.add('YouTube');
      }
    });
    
    return Array.from(platforms);
  }

  /**
   * Save ingestion result to database
   */
  async saveIngestionResult(projectId, userId, fileName, structuredData) {
    try {
      const result = await query(`
        INSERT INTO document_ingestions 
        (project_id, user_id, file_name, document_type, extracted_data, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'completed', NOW())
        RETURNING id
      `, [
        projectId,
        userId,
        fileName,
        structuredData.documentType,
        JSON.stringify(structuredData)
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving ingestion result:', error);
      throw error;
    }
  }

  /**
   * Generate summary of extracted data
   */
  generateSummary(structuredData) {
    const { documentType, contentItems, metadata } = structuredData;
    
    return {
      documentType: this.contentTypes[documentType] || 'General Document',
      totalItems: metadata.totalItems,
      dateRange: metadata.dateRange,
      platforms: metadata.platforms,
      contentTypes: metadata.contentTypes,
      insights: this.generateInsights(structuredData)
    };
  }

  /**
   * Generate insights from the data
   */
  generateInsights(structuredData) {
    const insights = [];
    const { contentItems, metadata } = structuredData;
    
    if (metadata.totalItems > 0) {
      insights.push(`Found ${metadata.totalItems} content items`);
    }
    
    if (metadata.platforms.length > 0) {
      insights.push(`Targeting ${metadata.platforms.join(', ')} platforms`);
    }
    
    if (metadata.dateRange) {
      insights.push(`Content spans ${metadata.dateRange.totalDays} days`);
    }
    
    // Content format analysis
    const formats = contentItems.map(item => item.format).filter(f => f);
    if (formats.length > 0) {
      const formatCounts = formats.reduce((acc, format) => {
        acc[format] = (acc[format] || 0) + 1;
        return acc;
      }, {});
      
      const topFormat = Object.entries(formatCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (topFormat) {
        insights.push(`Most common format: ${topFormat[0]} (${topFormat[1]} items)`);
      }
    }
    
    return insights;
  }

  /**
   * Get ingestion history for a project
   */
  async getIngestionHistory(projectId, userId) {
    try {
      const result = await query(`
        SELECT id, file_name, document_type, status, created_at, extracted_data
        FROM document_ingestions 
        WHERE project_id = $1 AND user_id = $2
        ORDER BY created_at DESC
      `, [projectId, userId]);

      return result.rows.map(row => ({
        ...row,
        extracted_data: JSON.parse(row.extracted_data)
      }));
    } catch (error) {
      console.error('Error fetching ingestion history:', error);
      throw error;
    }
  }

  /**
   * Get specific ingestion result
   */
  async getIngestionResult(ingestionId, userId) {
    try {
      const result = await query(`
        SELECT di.*, p.name as project_name
        FROM document_ingestions di
        JOIN projects p ON di.project_id = p.id
        WHERE di.id = $1 AND di.user_id = $2
      `, [ingestionId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Ingestion result not found');
      }

      const row = result.rows[0];
      return {
        ...row,
        extracted_data: JSON.parse(row.extracted_data)
      };
    } catch (error) {
      console.error('Error fetching ingestion result:', error);
      throw error;
    }
  }
}

module.exports = new DocumentIngestionService();
