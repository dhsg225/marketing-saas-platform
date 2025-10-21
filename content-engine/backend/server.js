const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const contentRoutes = require('./routes/content');
const playbookRoutes = require('./routes/playbook');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients'); // NEW
const assetRoutes = require('./routes/assets'); // NEW
const uploadRoutes = require('./routes/uploads'); // NEW
const contentIdeasRoutes = require('./routes/content-ideas'); // NEW
const socialPostingRoutes = require('./routes/social-posting'); // NEW - Late API integration
const aiRoutes = require('./routes/ai'); // NEW - AI Abstraction Layer
const toneProfilesRoutes = require('./routes/tone-profiles'); // NEW - Feature 9: Tone Profiler
const contentStrategyVizRoutes = require('./routes/content-strategy-viz'); // NEW - Feature 10: Content Strategy Visualization
const contentStrategiesRoutes = require('./routes/content-strategies'); // NEW - Content Strategies Management
const referenceDocumentsRoutes = require('./routes/reference-documents'); // NEW - Feature 6: Client Reference Document Repository
const manualDistributionRoutes = require('./routes/manual-distribution'); // NEW - Feature 4: Manual Distribution Management
const clientCollaborationRoutes = require('./routes/client-collaboration'); // NEW - Feature 8: Client Collaboration Portal
const managementRoutes = require('./routes/management'); // NEW - Management interface
const talentProfilesRoutes = require('./routes/talent-profiles'); // NEW - Feature 5: Talent Marketplace
const talentPortfolioRoutes = require('./routes/talent-portfolio'); // NEW - Feature 5: Talent Marketplace
const talentServicesRoutes = require('./routes/talent-services'); // NEW - Feature 5: Talent Marketplace
const talentBookingsRoutes = require('./routes/talent-bookings'); // NEW - Feature 5: Talent Marketplace
const talentMessagesRoutes = require('./routes/talent-messages'); // NEW - Feature 5: Talent Marketplace
const talentAvailabilityRoutes = require('./routes/talent-availability'); // NEW - Feature 5: Talent Marketplace
const dashboardRoutes = require('./routes/dashboard'); // NEW - Dashboard API
const projectsRoutes = require('./routes/projects'); // NEW - Projects API
const aiConfigRoutes = require('./routes/ai-config'); // NEW - AI Model Configuration
const contentListRoutes = require('./routes/content-list'); // NEW - Content List Management
const setupRoutes = require('./routes/setup'); // NEW - Setup utilities
const postsRoutes = require('./routes/posts'); // NEW - Post Creation System
const reportsRoutes = require('./routes/reports'); // NEW - Client Report Export

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Content Engine API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/playbook', playbookRoutes);
app.use('/api/clients', clientRoutes); // NEW
app.use('/api/assets', assetRoutes); // NEW
app.use('/api/uploads', uploadRoutes); // NEW
app.use('/api/content-ideas', contentIdeasRoutes); // NEW
app.use('/api/social', socialPostingRoutes); // NEW - Late API integration
app.use('/api/ai', aiRoutes); // NEW - AI Abstraction Layer
app.use('/api/tone-profiles', toneProfilesRoutes); // NEW - Feature 9: Tone Profiler
app.use('/api/content-strategy-viz', contentStrategyVizRoutes); // NEW - Feature 10: Content Strategy Visualization
app.use('/api/content-strategies', contentStrategiesRoutes); // NEW - Content Strategies Management
app.use('/api/reference-documents', referenceDocumentsRoutes); // NEW - Feature 6: Client Reference Document Repository
app.use('/api/manual-distribution', manualDistributionRoutes); // NEW - Feature 4: Manual Distribution Management
app.use('/api/client-collaboration', clientCollaborationRoutes); // NEW - Feature 8: Client Collaboration Portal
app.use('/api/playbook/signature-blocks', require('./routes/signature-blocks')); // NEW - Signature Blocks
app.use('/api/talent', talentProfilesRoutes); // NEW - Feature 5: Talent Marketplace Profiles
app.use('/api/talent', talentPortfolioRoutes); // NEW - Feature 5: Talent Marketplace Portfolio
app.use('/api/talent', talentServicesRoutes); // NEW - Feature 5: Talent Marketplace Services
app.use('/api/talent', talentBookingsRoutes); // NEW - Feature 5: Talent Marketplace Bookings
app.use('/api/talent', talentMessagesRoutes); // NEW - Feature 5: Talent Marketplace Messages
app.use('/api/talent', talentAvailabilityRoutes); // NEW - Feature 5: Talent Marketplace Availability
app.use('/api/payments', require('./routes/payments')); // NEW - Payment System
app.use('/api/deliverables', require('./routes/deliverables')); // NEW - Deliverables System
app.use('/api/reviews', require('./routes/reviews')); // NEW - Reviews System
app.use('/api/management', managementRoutes); // NEW - Management interface
app.use('/api/user-api-keys', require('./routes/user-api-keys')); // NEW - User API Keys Management
app.use('/api/document-ingestion', require('./routes/document-ingestion-simple')); // NEW - Document Ingestion with AI (Simple)
app.use('/api/content-mapping', require('./routes/content-mapping')); // NEW - Content Mapping & Import
app.use('/api/dashboard', dashboardRoutes); // NEW - Dashboard API
app.use('/api/projects', projectsRoutes); // NEW - Projects API
app.use('/api/ai-config', aiConfigRoutes); // NEW - AI Model Configuration
app.use('/api/content-list', contentListRoutes); // NEW - Content List Management
app.use('/api/setup', setupRoutes); // NEW - Setup utilities
app.use('/api/posts', postsRoutes); // NEW - Post Creation System
app.use('/api/reports', reportsRoutes); // NEW - Client Report Export

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Content Engine API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
