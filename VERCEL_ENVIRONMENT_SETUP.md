# 🔧 Vercel Environment Variables Setup Guide

## 📋 **Required Environment Variables**

Go to your Vercel project → Settings → Environment Variables and add these:

### 🗄️ **Supabase Configuration**
```bash
# Supabase Project URL
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anonymous Key (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (if needed for direct access)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

### 🔴 **Redis Configuration (Upstash)**
```bash
# Upstash Redis REST API
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
```

### 🤖 **AI Configuration**
```bash
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Other AI providers
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### 🔐 **Authentication & Security**
```bash
# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-here

# JWT Expiration
JWT_EXPIRES_IN=24h

# Node Environment
NODE_ENV=production
```

### 🌐 **API Configuration**
```bash
# API Base URL for frontend
REACT_APP_API_URL=https://marketing-saas-platform-frontend.vercel.app/api

# CORS Configuration
CORS_ORIGIN=https://marketing-saas-platform-frontend.vercel.app
```

### 📁 **File Storage (Bunny.net) - Optional for now**
```bash
# Bunny.net CDN
BUNNY_STORAGE_ZONE=your-storage-zone
BUNNY_ACCESS_KEY=your-bunny-access-key
BUNNY_PULL_ZONE_URL=https://your-pull-zone.b-cdn.net
```

## 🎯 **Setup Steps**

### **Step 1: Get Supabase Credentials**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key

### **Step 2: Get Redis Credentials**
1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your Redis database
3. Go to **Details** → **REST API**
4. Copy:
   - **REST URL**
   - **REST Token**

### **Step 3: Get OpenAI API Key**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys**
3. Create new key or copy existing

### **Step 4: Add to Vercel**
1. Go to your Vercel project
2. **Settings** → **Environment Variables**
3. Add each variable above
4. Set **Environment** to "Production" for all
5. **Save** each one

## ✅ **Verification**

After adding all variables, redeploy your project:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Check build logs for any missing variables

## 🚨 **Security Notes**

- ✅ **Public variables** (NEXT_PUBLIC_*) are safe for frontend
- ⚠️ **Server variables** are only available in API routes
- 🔒 **Never commit** real API keys to git
- 🔄 **Rotate keys** regularly for security

---

## 🎯 **Next Steps After Environment Setup**

1. **Test Supabase Connection** - Verify database access
2. **Test Redis Connection** - Verify queue system works  
3. **Deploy Backend API** - Convert Node.js routes to Vercel functions
4. **Test AI Integration** - Verify OpenAI API works
5. **Deploy AI Workers** - Set up Google Cloud Run Jobs

Ready to start? Let me know when you've added the environment variables!
