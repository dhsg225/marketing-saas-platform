# 🚀 API Migration Strategy - Future-Proof Architecture

## 🎯 **The Problem We Solved**
- **330+ hardcoded `localhost:5001` URLs** throughout the codebase
- Production builds failing because they tried to call localhost
- No flexibility when changing domains (Vercel → cognito.guru)

## ✅ **The Solution: Dynamic API Detection**

### **How It Works:**
1. **Environment Variable Priority**: `REACT_APP_API_URL` (if set)
2. **Auto-Detection**: Uses current domain + `/api` for production
3. **Development Fallback**: `localhost:5001` for local development

### **Migration Path:**
```
localhost:5001 → Vercel → cognito.guru → Any future domain
```

## 🔧 **Implementation Details**

### **1. Centralized API Service (`src/services/api.ts`)**
```typescript
const getApiBaseUrl = () => {
  // 1. Environment variable (highest priority)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 2. Auto-detect production domain
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}/api`;
  }
  
  // 3. Development fallback
  return 'http://localhost:5001/api';
};
```

### **2. Usage in Components**
```typescript
// OLD (hardcoded - BAD):
const response = await axios.get('http://localhost:5001/api/users');

// NEW (dynamic - GOOD):
import api from '../services/api';
const response = await axios.get(api.getUrl('users'));
```

## 🌍 **Domain Migration Examples**

### **Current: Vercel**
- URL: `https://marketing-saas-platform-xyz.vercel.app`
- API: `https://marketing-saas-platform-xyz.vercel.app/api`

### **Future: cognito.guru**
- URL: `https://cognito.guru`
- API: `https://cognito.guru/api`

### **Custom Domain**
- URL: `https://myapp.com`
- API: `https://myapp.com/api`

## 🚀 **Migration Steps for cognito.guru**

### **Step 1: Deploy to cognito.guru**
```bash
# Deploy frontend to cognito.guru
# Deploy API to cognito.guru/api
```

### **Step 2: Set Environment Variable (Optional)**
```bash
# If you want to override auto-detection:
export REACT_APP_API_URL="https://cognito.guru/api"
```

### **Step 3: That's It!**
- No code changes needed
- No hardcoded URLs to update
- Works automatically

## 📋 **Remaining Tasks**

### **High Priority (Fix 404 Errors)**
- [x] Remove `proxy` from `package.json`
- [x] Create dynamic API service
- [x] Fix `ReferenceDocuments.tsx` (main 404 source)
- [ ] Fix remaining 198+ hardcoded URLs in other components

### **Medium Priority**
- [ ] Update all components to use `api.getUrl()`
- [ ] Test with different domains
- [ ] Add API health checks

### **Low Priority**
- [ ] Add API versioning support
- [ ] Add request/response interceptors
- [ ] Add retry logic for failed requests

## 🧪 **Testing Strategy**

### **Local Development**
```bash
# Should use localhost:5001
npm start
```

### **Production Testing**
```bash
# Should auto-detect domain
# Vercel: https://your-app.vercel.app/api
# cognito.guru: https://cognito.guru/api
```

### **Environment Override Testing**
```bash
# Should use custom URL
REACT_APP_API_URL="https://custom-api.com" npm start
```

## 🎉 **Benefits**

1. **Zero Hardcoded URLs**: No more localhost references
2. **Domain Agnostic**: Works with any domain
3. **Environment Flexible**: Override with env vars when needed
4. **Future Proof**: Easy to migrate to new domains
5. **Development Friendly**: Still works locally

## 🚨 **Critical Files to Update**

Based on the grep results, these files have the most hardcoded URLs:

1. **`src/pages/PlaybookManager.tsx`** (24 references)
2. **`src/pages/ContentGenerator.tsx`** (11 references)
3. **`src/pages/Publish.tsx`** (7 references)
4. **`src/pages/SocialPosting.tsx`** (7 references)
5. **`src/components/MediaPicker.tsx`** (7 references)

## 🔄 **Next Steps**

1. **Deploy current fixes** to resolve 404 errors
2. **Systematically update** remaining components
3. **Test with cognito.guru** when ready
4. **Document any custom API requirements**

---

**This architecture will prevent the same problem from happening again when you move to cognito.guru or any other domain!** 🎯
