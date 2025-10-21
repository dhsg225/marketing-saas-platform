# Port Allocation Guide

## 🎯 Clear Port Ranges for Each Project

### **Marketing SaaS Platform** 
**Range: 5000-5099**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Backend API** | 5001 | `http://localhost:5001` | Node.js/Express API |
| **Frontend** | 5002 | `http://localhost:5002` | React.js UI |
| **Database Admin** | 5003 | `http://localhost:5003` | pgAdmin (optional) |
| **Testing** | 5004-5009 | `http://localhost:5004-5009` | Test servers |

---

### **Upwise Trade App**
**Range: 6000-6099**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 6001 | `http://localhost:6001` | Next.js UI |
| **Backend API** | 6002 | `http://localhost:6002` | Node.js API |
| **Admin Panel** | 6003 | `http://localhost:6003` | Admin interface |
| **Testing** | 6004-6009 | `http://localhost:6004-6009` | Test servers |

---

### **Discover Today (dtapp)**
**Range: 7000-7099**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 7001 | `http://localhost:7001` | React.js UI |
| **Backend API** | 7002 | `http://localhost:7002` | Node.js API |
| **Testing** | 7003-7009 | `http://localhost:7003-7009` | Test servers |

---

### **LDP Automation Project**
**Range: 8000-8099**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 8001 | `http://localhost:8001` | React.js UI |
| **Backend API** | 8002 | `http://localhost:8002` | Node.js API |
| **Testing** | 8003-8009 | `http://localhost:8003-8009` | Test servers |

---

### **Upwise Homepage**
**Range: 9000-9099**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 9001 | `http://localhost:9001` | Next.js UI |
| **Testing** | 9002-9009 | `http://localhost:9002-9009` | Test servers |

---

## 🔧 How to Update Each Project

### Marketing SaaS Platform
```bash
# Backend (already correct)
PORT=5001 node server.js

# Frontend - Update package.json scripts
"start": "PORT=5002 react-scripts start"
```

### Upwise Trade App
```bash
# Update frontend port
PORT=6001 npm run dev

# Update backend port (if exists)
PORT=6002 node server.js
```

### Other Projects
Apply similar pattern using their respective port ranges.

---

## 🚨 Current Status Check

Run this to see what's using ports:
```bash
lsof -i :3000-9009 | grep LISTEN
```

---

## 📝 Quick Reference

| Project | Frontend | Backend | Range |
|---------|----------|---------|-------|
| **Marketing SaaS** | 5002 | 5001 | 5000-5099 |
| **Upwise Trade** | 6001 | 6002 | 6000-6099 |
| **Discover Today** | 7001 | 7002 | 7000-7099 |
| **LDP Automation** | 8001 | 8002 | 8000-8099 |
| **Upwise Homepage** | 9001 | - | 9000-9099 |

---

## 🎯 Benefits

✅ **No More Conflicts** - Each project has its own range  
✅ **Easy to Remember** - 5000s, 6000s, 7000s, etc.  
✅ **Scalable** - 100 ports per project for growth  
✅ **Clear Organization** - Know which project by port  
✅ **Testing Space** - Reserved ports for test servers  

---

**Next Step**: Update each project's configuration to use their assigned ports!
