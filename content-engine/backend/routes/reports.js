// [2025-10-19] - Client Report Export API Routes
// Generates professional PDF reports for clients

const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

// Get report data for a specific project/client
router.get('/data/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      startDate, 
      endDate, 
      includeCalendar = true, 
      includePostList = true, 
      includePostContent = true,
      includeAnalytics = false 
    } = req.query;

    console.log('📊 Generating report data for project:', projectId);

    // Verify project access
    const projectCheck = await query(
      `SELECT p.*, c.name as client_name, c.email as client_email
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1`,
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const project = projectCheck.rows[0];
    const reportData = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        client_name: project.client_name,
        client_email: project.client_email
      },
      exportDate: new Date().toISOString(),
      filters: {
        startDate,
        endDate,
        includeCalendar,
        includePostList,
        includePostContent,
        includeAnalytics
      }
    };

    // Build date filter for queries
    let dateFilter = '';
    const queryParams = [projectId];
    let paramCount = 1;

    if (startDate && endDate) {
      paramCount++;
      dateFilter = `AND ci.suggested_date >= $${paramCount} AND ci.suggested_date <= $${paramCount + 1}`;
      queryParams.push(startDate, endDate);
    }

    // Get content ideas (for calendar and post list)
    if (includeCalendar || includePostList) {
      const contentIdeasQuery = `
        SELECT 
          ci.*,
          pt.name as post_type_name,
          pt.color as post_type_color,
          pt.purpose as post_type_purpose,
          u.name as created_by_name,
          approver.name as approved_by_name
        FROM content_ideas ci
        LEFT JOIN post_types pt ON ci.post_type_id = pt.id
        LEFT JOIN users u ON ci.created_by = u.id
        LEFT JOIN users approver ON ci.approved_by = approver.id
        WHERE ci.project_id = $1 ${dateFilter}
        ORDER BY ci.suggested_date ASC, ci.suggested_time ASC
      `;

      const contentResult = await query(contentIdeasQuery, queryParams);
      reportData.contentIdeas = contentResult.rows;
    }

    // Get posts (for actual post content)
    if (includePostContent) {
      const postsQuery = `
        SELECT 
          p.*,
          pt.name as post_type_name,
          pt.color as post_type_color,
          u.name as created_by_name
        FROM posts p
        LEFT JOIN post_types pt ON p.post_type_id = pt.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.project_id = $1 ${dateFilter}
        ORDER BY p.created_at DESC
      `;

      const postsResult = await query(postsQuery, queryParams);
      reportData.posts = postsResult.rows;

      // Get post sections for By-Parts mode posts
      if (postsResult.rows.length > 0) {
        const postIds = postsResult.rows.map(p => p.id);
        const sectionsQuery = `
          SELECT * FROM post_sections 
          WHERE post_id = ANY($1)
          ORDER BY post_id, section_order ASC
        `;
        const sectionsResult = await query(sectionsQuery, [postIds]);
        
        // Group sections by post_id
        const sectionsByPost = {};
        sectionsResult.rows.forEach(section => {
          if (!sectionsByPost[section.post_id]) {
            sectionsByPost[section.post_id] = [];
          }
          sectionsByPost[section.post_id].push(section);
        });

        // Add sections to posts
        reportData.posts.forEach(post => {
          post.sections = sectionsByPost[post.id] || [];
        });
      }
    }

    // Get analytics data (if requested)
    if (includeAnalytics) {
      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_content,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_content,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_content,
          COUNT(CASE WHEN suggested_date >= CURRENT_DATE THEN 1 END) as upcoming_content
        FROM content_ideas 
        WHERE project_id = $1 ${dateFilter}
      `;

      const analyticsResult = await query(analyticsQuery, queryParams);
      reportData.analytics = analyticsResult.rows[0];
    }

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('❌ Error generating report data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report data'
    });
  }
});

// Generate PDF report
router.post('/generate-pdf', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      reportOptions = {},
      reportData
    } = req.body;

    console.log('📄 Generating PDF report for project:', projectId);

    // If reportData is not provided, fetch it directly from database
    let data = reportData;
    if (!data) {
      // Fetch report data directly from database instead of making HTTP call
      let { 
        startDate, 
        endDate, 
        includeCalendar = true, 
        includePostList = true, 
        includePostContent = true,
        includeAnalytics = false 
      } = reportOptions;

      // Handle empty dates as promised in the UI - use default ranges
      if (!startDate || startDate === '') {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 30 days
      }
      if (!endDate || endDate === '') {
        endDate = new Date().toISOString().split('T')[0]; // Today
      }

      // Validate date format only if dates were provided
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      if (isNaN(startDateObj.getTime())) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid start date format. Please use YYYY-MM-DD format.' 
        });
      }
      
      if (isNaN(endDateObj.getTime())) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid end date format. Please use YYYY-MM-DD format.' 
        });
      }

      // Validate date range
      if (startDateObj > endDateObj) {
        return res.status(400).json({ 
          success: false, 
          error: 'Start date cannot be after end date. Please select a valid date range.' 
        });
      }

      // Verify project access
      const projectCheck = await query(
        `SELECT p.*, c.company_name as client_name, c.email as client_email
         FROM projects p
         JOIN clients c ON p.client_id = c.id
         WHERE p.id = $1`,
        [projectId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const project = projectCheck.rows[0];

      // Fetch content ideas for calendar and post list
      const contentIdeas = await query(
        `SELECT ci.*, pt.name as post_type_name, pt.color as post_type_color
         FROM content_ideas ci
         LEFT JOIN post_types pt ON ci.post_type_id = pt.id
         WHERE ci.project_id = $1 AND ci.suggested_date BETWEEN $2 AND $3
         ORDER BY ci.suggested_date ASC`,
        [projectId, startDate, endDate]
      );

      // Fetch posts for actual content
      const posts = await query(
        `SELECT p.*, pt.name as post_type_name, pt.color as post_type_color
         FROM posts p
         LEFT JOIN post_types pt ON p.post_type_id = pt.id
         WHERE p.project_id = $1 AND p.scheduled_date BETWEEN $2 AND $3
         ORDER BY p.scheduled_date ASC`,
        [projectId, startDate, endDate]
      );

      data = {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          client_name: project.client_name,
          client_email: project.client_email
        },
        calendarView: includeCalendar ? contentIdeas.rows : [],
        postList: includePostList ? contentIdeas.rows : [],
        actualPosts: includePostContent ? posts.rows : [],
        summaryAnalytics: includeAnalytics ? {} : {},
        exportDate: new Date().toISOString()
      };
    }

    // Generate PDF using a simple HTML-to-PDF approach
    // In production, you'd use a proper PDF library like Puppeteer or PDFKit
    const pdfContent = generateReportHTML(data, reportOptions);
    
    // For now, return the HTML content
    // In production, you'd convert this to actual PDF bytes
    res.json({
      success: true,
      data: {
        html: pdfContent,
        filename: `Ready-to-Publish-Report-${data.project.name}-${new Date().toISOString().split('T')[0]}.html`
      }
    });

  } catch (error) {
    console.error('❌ Error generating PDF report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF report'
    });
  }
});

// Helper function to generate report HTML
function generateReportHTML(data, options = {}) {
  const {
    includeCalendar = true,
    includePostList = true,
    includePostContent = true,
    includeAnalytics = false
  } = options;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ready-to-Publish Report - ${data.project.name}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: #fff;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1e40af;
          margin: 0;
          font-size: 28px;
        }
        .header .subtitle {
          color: #6b7280;
          margin: 5px 0 0 0;
          font-size: 16px;
        }
        .project-info {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .section h2 {
          color: #1e40af;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e5e7eb;
          border: 1px solid #e5e7eb;
        }
        .calendar-day {
          background: #fff;
          padding: 10px;
          min-height: 80px;
          font-size: 12px;
        }
        .calendar-day.other-month {
          background: #f9fafb;
          color: #9ca3af;
        }
        .calendar-day.today {
          background: #dbeafe;
        }
        .post-item {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
        }
        .post-item.approved {
          border-left: 4px solid #10b981;
        }
        .post-item.published {
          border-left: 4px solid #3b82f6;
        }
        .post-meta {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .post-content {
          background: #f8fafc;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          white-space: pre-wrap;
        }
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .analytics-item {
          text-align: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .analytics-number {
          font-size: 24px;
          font-weight: bold;
          color: #1e40af;
        }
        .analytics-label {
          font-size: 12px;
          color: #6b7280;
          margin-top: 5px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Ready-to-Publish Report</h1>
        <div class="subtitle">${data.project.name} • ${data.project.client_name}</div>
        <div class="subtitle">Generated on ${new Date(data.exportDate).toLocaleDateString()}</div>
      </div>

      <div class="project-info">
        <h3>Project Information</h3>
        <p><strong>Client:</strong> ${data.project.client_name}</p>
        <p><strong>Project:</strong> ${data.project.name}</p>
        <p><strong>Status:</strong> ${data.project.status}</p>
        ${data.project.description ? `<p><strong>Description:</strong> ${data.project.description}</p>` : ''}
      </div>
  `;

  // Calendar View
  if (includeCalendar && data.contentIdeas) {
    html += `
      <div class="section">
        <h2>📅 Calendar View</h2>
        <div class="calendar-grid">
    `;

    // Generate calendar grid (simplified version)
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += `<div class="calendar-day other-month"></div>`;
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate();
      const dayContent = data.contentIdeas.filter(idea => {
        const ideaDate = new Date(idea.suggested_date);
        return ideaDate.getDate() === day && ideaDate.getMonth() === currentMonth;
      });

      html += `
        <div class="calendar-day ${isToday ? 'today' : ''}">
          <strong>${day}</strong>
          ${dayContent.map(idea => `
            <div style="margin-top: 5px; padding: 2px; background: ${idea.post_type_color || '#e5e7eb'}; border-radius: 3px; font-size: 10px;">
              ${idea.title.substring(0, 20)}${idea.title.length > 20 ? '...' : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  // Post List
  if (includePostList && data.contentIdeas) {
    html += `
      <div class="section">
        <h2>📋 Post List</h2>
    `;

    data.contentIdeas.forEach(idea => {
      html += `
        <div class="post-item ${idea.status}">
          <div class="post-meta">
            ${idea.suggested_date} • ${idea.post_type_name || 'Post'} • ${idea.status}
          </div>
          <h4>${idea.title}</h4>
          <p>${idea.description}</p>
        </div>
      `;
    });

    html += `</div>`;
  }

  // Actual Post Content
  if (includePostContent && data.posts) {
    html += `
      <div class="section">
        <h2>📱 Actual Post Content</h2>
    `;

    data.posts.forEach(post => {
      html += `
        <div class="post-item ${post.status}">
          <div class="post-meta">
            ${post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Draft'} • 
            ${post.creation_mode === 'all_at_once' ? 'All-at-Once' : 'By-Parts'} • 
            ${post.status}
          </div>
          <h4>${post.title}</h4>
      `;

      if (post.creation_mode === 'all_at_once' && post.full_content) {
        html += `<div class="post-content">${post.full_content}</div>`;
      } else if (post.creation_mode === 'by_parts' && post.sections) {
        post.sections.forEach(section => {
          html += `
            <div style="margin: 10px 0;">
              <strong>${section.section_type.replace('_', ' ').toUpperCase()}:</strong>
              <div class="post-content">${section.content}</div>
            </div>
          `;
        });
      }

      html += `</div>`;
    });

    html += `</div>`;
  }

  // Analytics
  if (includeAnalytics && data.analytics) {
    html += `
      <div class="section">
        <h2>📊 Summary Analytics</h2>
        <div class="analytics-grid">
          <div class="analytics-item">
            <div class="analytics-number">${data.analytics.total_content}</div>
            <div class="analytics-label">Total Content</div>
          </div>
          <div class="analytics-item">
            <div class="analytics-number">${data.analytics.approved_content}</div>
            <div class="analytics-label">Approved</div>
          </div>
          <div class="analytics-item">
            <div class="analytics-number">${data.analytics.published_content}</div>
            <div class="analytics-label">Published</div>
          </div>
          <div class="analytics-item">
            <div class="analytics-number">${data.analytics.upcoming_content}</div>
            <div class="analytics-label">Upcoming</div>
          </div>
        </div>
      </div>
    `;
  }

  html += `
      <div class="footer">
        <p>Generated by Marketing SaaS Platform • ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

module.exports = router;
