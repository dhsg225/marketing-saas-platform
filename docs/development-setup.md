# Development Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (v14 or higher)
- Git
- OpenAI API key

## Initial Setup

### 1. Clone and Navigate to Project

```bash
cd "/Users/admin/Dropbox/Development/Marketing SaaS Platform"
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd content-engine/backend
npm init -y
npm install express cors helmet morgan dotenv
npm install jsonwebtoken bcryptjs
npm install openai
npm install pg
npm install --save-dev nodemon jest supertest
```

#### Frontend Dependencies
```bash
cd content-engine/frontend
npx create-react-app . --template typescript
npm install axios react-router-dom
npm install @tailwindcss/forms
npm install --save-dev @types/node
```

### 3. Environment Configuration

Create `.env` file in the backend directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marketing_saas_content
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# File Storage
STORAGE_PATH=./client-content
```

### 4. Database Setup

#### Create Database
```sql
CREATE DATABASE marketing_saas_content;
```

#### Initial Schema (to be created in database/schema.sql)

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    industry_preference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content pieces table
CREATE TABLE content_pieces (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(500),
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    industry VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base table
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    industry VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    template_content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content templates table
CREATE TABLE content_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    template_structure JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Project Scripts

#### Backend package.json scripts:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

#### Frontend package.json scripts:
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

## Development Workflow

### 1. Start Backend Server
```bash
cd content-engine/backend
npm run dev
```
Backend will run on: http://localhost:5001

### 2. Start Frontend Development Server
```bash
cd content-engine/frontend
npm start
```
Frontend will run on: http://localhost:3000

### 3. Database Migrations
```bash
cd content-engine/database
psql -U your_db_user -d marketing_saas_content -f schema.sql
```

## Project Structure

```
content-engine/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   └── package.json
└── database/
    ├── schema.sql
    ├── migrations/
    └── seeds/
```

## Testing

### Backend Testing
```bash
cd content-engine/backend
npm test
```

### Frontend Testing
```bash
cd content-engine/frontend
npm test
```

## API Endpoints (Initial)

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Content Generation
- `POST /api/content/generate` - Generate new content
- `GET /api/content` - List user's content
- `GET /api/content/:id` - Get specific content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Knowledge Base
- `GET /api/knowledge-base/:industry/:contentType` - Get templates
- `POST /api/knowledge-base` - Add new template (admin)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure database exists

2. **OpenAI API Error**
   - Verify API key is correct
   - Check API key permissions
   - Monitor rate limits

3. **Port Conflicts**
   - Backend runs on port 3001
   - Frontend runs on port 3000
   - Adjust ports in .env if needed

## Next Steps

1. Set up the development environment
2. Initialize the database
3. Create basic API endpoints
4. Build the frontend dashboard
5. Implement content generation workflows
