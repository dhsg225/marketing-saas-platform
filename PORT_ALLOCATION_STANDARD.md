# 🚨 MANDATORY PORT ALLOCATION STANDARD

## ⚠️ CRITICAL: READ BEFORE STARTING ANY PROJECT

**This document must be followed by ALL development projects to prevent port conflicts.**

---

## 📋 **PORT ALLOCATION RULES**

### **🎯 PRIMARY RULE**
- **NEVER use port 3000** - Reserved for emergencies only
- **NEVER use port 5001** - Reserved for Marketing SaaS Platform backend
- **Each project gets 100 ports** (e.g., 5000-5099, 6000-6099, etc.)

---

## 🏗️ **PROJECT PORT RANGES**

### **1. Marketing SaaS Platform** 
**Range: 5000-5099** | **Status: ACTIVE** ✅

| Service | Port | URL | Owner | Notes |
|---------|------|-----|-------|-------|
| **Backend API** | 5001 | `http://localhost:5001` | Marketing SaaS | **PRIMARY API** |
| **Frontend** | 5002 | `http://localhost:5002` | Marketing SaaS | React.js UI |
| **Database Admin** | 5003 | `http://localhost:5003` | Marketing SaaS | pgAdmin (optional) |
| **Testing** | 5004-5009 | Various | Marketing SaaS | Test servers |
| **Reserved** | 5010-5099 | Various | Marketing SaaS | Future services |

---

### **2. Upwise Trade App**
**Range: 6000-6099** | **Status: ACTIVE** ✅

| Service | Port | URL | Owner | Notes |
|---------|------|-----|-------|-------|
| **Frontend** | 6001 | `http://localhost:6001` | Upwise Trade | Next.js UI |
| **Backend API** | 6002 | `http://localhost:6002` | Upwise Trade | Node.js API |
| **Admin Panel** | 6003 | `http://localhost:6003` | Upwise Trade | Admin interface |
| **Testing** | 6004-6009 | Various | Upwise Trade | Test servers |
| **Reserved** | 6010-6099 | Various | Upwise Trade | Future services |

---

### **3. Discover Today (dtapp)**
**Range: 7000-7099** | **Status: AVAILABLE** 🟡

| Service | Port | URL | Owner | Notes |
|---------|------|-----|-------|-------|
| **Frontend** | 7001 | `http://localhost:7001` | Discover Today | React.js UI |
| **Backend API** | 7002 | `http://localhost:7002` | Discover Today | Node.js API |
| **Testing** | 7003-7009 | Various | Discover Today | Test servers |
| **Reserved** | 7010-7099 | Various | Discover Today | Future services |

---

### **4. LDP Automation Project**
**Range: 8000-8099** | **Status: AVAILABLE** 🟡

| Service | Port | URL | Owner | Notes |
|---------|------|-----|-------|-------|
| **Frontend** | 8001 | `http://localhost:8001` | LDP Automation | React.js UI |
| **Backend API** | 8002 | `http://localhost:8002` | LDP Automation | Node.js API |
| **Testing** | 8003-8009 | Various | LDP Automation | Test servers |
| **Reserved** | 8010-8099 | Various | LDP Automation | Future services |

---

### **5. LocalPlus Ecosystem**
**Range: 9000-9199** | **Status: ACTIVE** ✅

| Service | Port | URL | Owner | Notes |
|---------|------|-----|-------|-------|
| **Consumer App** | 9001 | `http://localhost:9001` | LocalPlus | React.js Consumer UI |
| **Admin App** | 9002 | `http://localhost:9002` | LocalPlus | React.js Admin Dashboard |
| **Partner App** | 9003 | `http://localhost:9003` | LocalPlus | React.js Partner Portal |
| **Backend API** | 9004 | `http://localhost:9004` | LocalPlus | Node.js API Server |
| **Testing** | 9005-9009 | Various | LocalPlus | Test servers |
| **Reserved** | 9010-9199 | Various | LocalPlus | Future services |

---

### **6. Upwise Homepage**
**Range: 9200-9299** | **Status: AVAILABLE** 🟡

| Service | Port | URL | Owner | Notes |
|---------|------|-----|-------|-------|
| **Frontend** | 9201 | `http://localhost:9201` | Upwise Homepage | Next.js UI |
| **Testing** | 9202-9209 | Various | Upwise Homepage | Test servers |
| **Reserved** | 9210-9299 | Various | Upwise Homepage | Future services |

---

## 🚨 **MANDATORY COMPLIANCE RULES**

### **BEFORE Starting Any Development:**

1. ✅ **Check this document** for your project's port range
2. ✅ **Verify no conflicts** with `lsof -i :PORT_NUMBER`
3. ✅ **Update your project config** to use assigned ports
4. ✅ **Test ports are free** before starting services
5. ✅ **Document any port changes** in your project README

### **FORBIDDEN ACTIONS:**
- ❌ **Using port 3000** without explicit permission
- ❌ **Using another project's port range**
- ❌ **Starting services without checking conflicts**
- ❌ **Changing ports without updating this document**

---

## 🔧 **IMPLEMENTATION CHECKLIST**

### **For Each Project:**

- [ ] **Read this PORT_ALLOCATION_STANDARD.md**
- [ ] **Identify your assigned port range**
- [ ] **Update package.json scripts** to use assigned ports
- [ ] **Update environment variables** (.env files)
- [ ] **Update API base URLs** in frontend code
- [ ] **Update documentation** with correct URLs
- [ ] **Test all services** start on correct ports
- [ ] **Verify no conflicts** with other projects

---

## 🛠️ **QUICK REFERENCE COMMANDS**

### **Check Port Usage:**
```bash
# Check specific port
lsof -i :5001

# Check all development ports
lsof -i :5000-9099 | grep LISTEN

# Check running Node.js processes
ps aux | grep -E "(node|npm|next)" | grep -v grep
```

### **Kill Conflicting Processes:**
```bash
# Kill by port
kill $(lsof -t -i:3000)

# Kill by process ID
kill 12345
```

---

## 📝 **PROJECT CONFIGURATION EXAMPLES**

### **React.js Frontend (package.json):**
```json
{
  "scripts": {
    "start": "PORT=5002 react-scripts start",
    "dev": "PORT=5002 react-scripts start"
  }
}
```

### **Next.js Frontend (package.json):**
```json
{
  "scripts": {
    "dev": "next dev -p 6001",
    "start": "next start -p 6001"
  }
}
```

### **Node.js Backend (.env):**
```bash
PORT=5001
NODE_ENV=development
```

### **Frontend API Configuration:**
```javascript
// Update API base URL in your frontend
const API_BASE_URL = 'http://localhost:5001/api'; // Marketing SaaS
const API_BASE_URL = 'http://localhost:6002/api'; // Upwise Trade
const API_BASE_URL = 'http://localhost:7002/api'; // Discover Today
```

---

## 🎯 **CURRENT PROJECT STATUS**

| Project | Frontend | Backend | Status | Notes |
|---------|----------|---------|--------|-------|
| **Marketing SaaS** | 5002 | 5001 | ✅ **ACTIVE** | Image processing ready |
| **Upwise Trade** | 6001 | 6002 | ✅ **ACTIVE** | Currently on 3000 - needs update |
| **Discover Today** | 7001 | 7002 | 🟡 **AVAILABLE** | Not started |
| **LDP Automation** | 8001 | 8002 | 🟡 **AVAILABLE** | Not started |
| **LocalPlus Consumer** | 9001 | 9004 | ✅ **ACTIVE** | Restaurant discovery app |
| **LocalPlus Admin** | 9002 | 9004 | ✅ **ACTIVE** | Admin dashboard with API switching |
| **LocalPlus Partner** | 9003 | 9004 | 🟡 **AVAILABLE** | Partner onboarding portal |
| **Upwise Homepage** | 9201 | - | 🟡 **AVAILABLE** | Not started |

---

## 🚨 **EMERGENCY PROTOCOL**

### **If Port Conflicts Occur:**

1. 🛑 **STOP all conflicting services immediately**
2. 📋 **Check this document** for correct port assignments
3. 🔧 **Update configurations** to use assigned ports
4. ✅ **Test services** start without conflicts
5. 📝 **Update this document** if changes are needed

### **Emergency Contacts:**
- **Port conflicts**: Check this document first
- **Configuration issues**: Review project-specific README
- **System conflicts**: Use `lsof` and `ps aux` to identify processes

---

## 📚 **DOCUMENTATION REQUIREMENTS**

### **Each Project Must Have:**
- [ ] **PORT_ALLOCATION_STANDARD.md** (this file)
- [ ] **README.md** with correct localhost URLs
- [ ] **package.json** with correct port configurations
- [ ] **Environment files** (.env) with correct ports
- [ ] **API documentation** with correct base URLs

---

## 🔄 **UPDATING THIS DOCUMENT**

### **When Adding New Projects:**
1. 📝 **Add new port range** (next available 1000s)
2. 📋 **Update status table**
3. 📤 **Distribute to all projects**
4. ✅ **Verify no conflicts**

### **When Changing Ports:**
1. 📝 **Update this document**
2. 📤 **Notify all developers**
3. 🔄 **Update all project configs**
4. ✅ **Test all services**

---

## ⚡ **QUICK START FOR NEW PROJECTS**

1. **Choose next available range** (e.g., 10000-10099)
2. **Update this document** with your project details
3. **Configure your project** to use assigned ports
4. **Test with other projects** running
5. **Document in your README**

---

**Last Updated**: January 21, 2025  
**Version**: 1.1.0  
**Authority**: Development Team Standard

---

## 🎯 **BOTTOM LINE**

**FOLLOW THIS DOCUMENT OR FACE PORT CONFLICTS!**

Every developer must read, understand, and comply with this port allocation standard. No exceptions.

**Questions?** Check this document first, then ask the team.
