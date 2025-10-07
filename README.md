# Marketing SaaS Platform - Content Engine

A multi-industry marketing SaaS platform with AI-powered content generation, designed for digital marketing agencies and individual entrepreneurs.

## Project Overview

This platform consolidates essential marketing functionalities into a scalable, multi-tenant environment:

- **WordPress Multisite**: Robust backbone for hosting individual client/business websites
- **Fluent Suite**: Powerful marketing automation tools (CRM, forms, affiliate management, email delivery)
- **AI-Powered Content Engine**: Centralized dashboard for AI-driven content generation, asset management, and analytics

## Current Phase: Content Creation Engine

Building for our own agency needs first, serving:
- Restaurant customers (eatsthailand.com focus)
- Property customers
- Our own agency marketing needs

## Technology Stack

- **Frontend**: React.js
- **Backend**: Node.js/Express
- **Database**: PostgreSQL
- **AI**: OpenAI API (GPT-4)
- **Authentication**: JWT + bcrypt
- **File Storage**: AWS S3 (or local filesystem)
- **Environment**: Docker

## Project Structure

```
marketing-saas-platform/
├── docs/                           # System architecture & planning
├── content-engine/                 # Main application
│   ├── frontend/                   # React dashboard
│   ├── backend/                    # API server
│   ├── database/                   # Database schemas & migrations
│   └── ai-services/               # OpenAI integration
├── client-content/                 # Generated content storage
├── knowledge-base/                 # Industry-specific content
│   ├── restaurant-industry/        # Restaurant content templates
│   ├── property-industry/          # Property content templates
│   └── agency-content/             # Agency marketing content
└── Planning Documents/             # Original project documentation
```

## Development Phases

### Phase 1: Content Creation Engine (Current)
- AI-powered content generation
- Multi-industry knowledge base
- Content management dashboard
- Export functionality

### Phase 2: Publishing & Distribution (Future)
- WordPress Multisite integration
- Social media automation
- Email marketing integration
- Multi-channel content distribution

## Getting Started

1. Clone the repository
2. Set up development environment (see docs/setup.md)
3. Configure environment variables
4. Run the development server

## Documentation

- [System Architecture](docs/system-architecture.md)
- [Development Setup](docs/development-setup.md)
- [API Documentation](docs/api-documentation.md)

## Contributing

This project follows the AI-Assisted Development principles outlined in the Planning Documents.

## License

Private project - All rights reserved.
