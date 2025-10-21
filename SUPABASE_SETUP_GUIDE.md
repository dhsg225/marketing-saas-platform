# 🗄️ Supabase Setup Guide
## Marketing SaaS Platform Database Migration

### 📋 **Step 1: Create Supabase Project**

1. **Go to**: [supabase.com](https://supabase.com)
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Fill in details**:
   - **Name**: `marketing-saas-platform`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users (e.g., Southeast Asia)
   - **Pricing Plan**: **Free tier** (perfect for development)

### 📋 **Step 2: Get Connection Details**

After project creation, go to **Settings** → **API** and copy:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 📋 **Step 3: Run Database Migration**

1. **Go to**: **SQL Editor** in your Supabase dashboard
2. **Copy and paste** the contents of `supabase-migration.sql`
3. **Click "Run"** to execute the migration
4. **Verify tables** were created in **Table Editor**

### 📋 **Step 4: Configure Authentication**

1. **Go to**: **Authentication** → **Settings**
2. **Enable Email Auth**: ✅
3. **Site URL**: `https://marketing-saas-platform-frontend.vercel.app`
4. **Redirect URLs**: Add your Vercel domain

### 📋 **Step 5: Test Row-Level Security**

1. **Go to**: **Table Editor**
2. **Try to view data** - you should see empty results (RLS is working)
3. **Create a test user** through Authentication
4. **Verify RLS policies** are working

---

## 🔧 **Environment Variables for Vercel**

Add these to your Vercel project settings:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Database (for direct connections if needed)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

---

## 🎯 **What This Migration Provides**

### ✅ **Database Features**:
- **PostgreSQL** with full SQL support
- **Row-Level Security** for tenant isolation
- **Real-time subscriptions** for live updates
- **Automatic backups** and point-in-time recovery
- **Built-in authentication** system

### ✅ **Security Features**:
- **Tenant isolation** - users only see their organization's data
- **JWT-based authentication** with Supabase Auth
- **Automatic RLS policies** prevent data leakage
- **Secure API keys** for different access levels

### ✅ **Performance Features**:
- **Global CDN** for fast database access
- **Connection pooling** for efficient connections
- **Automatic indexing** for query optimization
- **Real-time updates** via WebSockets

---

## 🚀 **Next Steps After Supabase Setup**

1. **Update your frontend** to use Supabase client
2. **Replace local API calls** with Supabase queries
3. **Set up authentication** with Supabase Auth
4. **Configure real-time subscriptions** for live updates
5. **Test the complete flow** from frontend to database

---

## 💰 **Cost Breakdown**

| Feature | Free Tier | Limits |
|---------|-----------|--------|
| Database | ✅ | 500MB storage |
| API Requests | ✅ | 50,000/month |
| Auth Users | ✅ | 50,000/month |
| Real-time | ✅ | 200 concurrent connections |
| **Total** | **$0/month** | **Perfect for development!** |

---

## 🔗 **Useful Links**

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Documentation](https://supabase.com/docs)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)

---

**Ready to set up Supabase? Let's get your database online!** 🚀
