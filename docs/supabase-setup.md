# Supabase Database Setup Guide

## Overview

This guide will help you set up Supabase as the database for the Marketing SaaS Platform Content Engine.

## Step 1: Create Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Create New Project**
   - Click "New project"
   - Choose your organization
   - Enter project details:
     - **Name**: `marketing-saas-content-engine`
     - **Database Password**: Generate a strong password (save this!)
     - **Region**: Choose closest to your location
     - **Pricing Plan**: Free tier is sufficient for development

3. **Wait for Project Creation**
   - Project creation takes 1-2 minutes
   - You'll see a success message when ready

## Step 2: Get Database Connection Details

1. **Go to Project Settings**
   - In your Supabase dashboard, click the gear icon (Settings)
   - Select "Database" from the left sidebar

2. **Find Connection String**
   - Scroll down to "Connection string"
   - Copy the "URI" connection string
   - Note down the following details:
     - **Host**: `db.your-project-ref.supabase.co`
     - **Database**: `postgres`
     - **User**: `postgres`
     - **Password**: (the one you created)

3. **Get API Keys**
   - Go to Settings > API
   - Copy the following:
     - **Project URL**: `https://your-project-ref.supabase.co`
     - **Anon/Public Key**: (starts with `eyJ...`)

## Step 3: Set Up Environment Variables

1. **Copy Environment Template**
   ```bash
   cd content-engine/backend
   cp env.example .env
   ```

2. **Update .env File**
   Replace the placeholder values with your Supabase details:
   ```env
   # Server Configuration
   PORT=5001
   NODE_ENV=development

   # Database Configuration (Supabase)
   SUPABASE_DB_HOST=db.your-project-ref.supabase.co
   SUPABASE_DB_PORT=5432
   SUPABASE_DB_NAME=postgres
   SUPABASE_DB_USER=postgres
   SUPABASE_DB_PASSWORD=your_actual_password_here
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # File Storage
   STORAGE_PATH=./client-content
   ```

## Step 4: Run Database Schema

1. **Access Supabase SQL Editor**
   - In your Supabase dashboard, click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Run Schema Creation**
   - Copy the contents of `content-engine/database/schema.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute the schema

3. **Run Seed Data**
   - Create another new query
   - Copy the contents of `content-engine/database/seed.sql`
   - Paste into the SQL Editor
   - Click "Run" to insert initial data

## Step 5: Verify Setup

1. **Check Tables**
   - In Supabase dashboard, go to "Table Editor"
   - You should see the following tables:
     - `users`
     - `content_pieces`
     - `knowledge_base`
     - `content_templates`
     - `api_usage`

2. **Check Sample Data**
   - Click on `knowledge_base` table
   - You should see initial templates for restaurant, property, and agency content

## Step 6: Test Database Connection

1. **Start Backend Server**
   ```bash
   cd content-engine/backend
   npm run dev
   ```

2. **Check Connection**
   - Look for database connection success message
   - Test the health endpoint: `curl http://localhost:5001/api/health`

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify your database password is correct
   - Check that the host URL is properly formatted
   - Ensure your IP is allowed (Supabase allows all IPs by default)

2. **SSL Certificate Error**
   - Make sure `ssl: { rejectUnauthorized: false }` is set in database config

3. **Authentication Failed**
   - Double-check your database password
   - Verify the username is `postgres`

4. **Schema Errors**
   - Ensure you're running the schema in the correct order
   - Check for any syntax errors in the SQL files

### Getting Help

- **Supabase Documentation**: https://supabase.com/docs
- **Community Support**: https://github.com/supabase/supabase/discussions

## Next Steps

Once your database is set up:

1. **Test API Endpoints** with database integration
2. **Set up Row Level Security** policies
3. **Configure Authentication** with Supabase Auth
4. **Implement Content Generation** workflows

Your Supabase database is now ready for the Content Engine!
