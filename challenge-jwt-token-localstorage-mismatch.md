# Challenge: JWT Token localStorage Key Mismatch

## Problem Summary
**Issue:** Content idea approval system failing with persistent `401 (Unauthorized)` errors despite valid JWT tokens being present in browser localStorage.

**Root Cause:** Inconsistent localStorage key usage between login system and approval system.

## Technical Details

### The Problem
- **Login System** (UserContext.tsx): Stores JWT token as `auth_token` in localStorage
- **Approval System** (PlaybookManager.tsx): Looks for JWT token as `token` in localStorage
- **Result:** Approval requests fail with `401 Unauthorized` because no token is found

### Error Progression
1. **Initial Error:** `JsonWebTokenError: invalid signature` - JWT secret mismatch
2. **Secondary Error:** `JsonWebTokenError: jwt malformed` - Token format issues  
3. **Final Error:** `JsonWebTokenError: jwt malformed` - Token not found due to key mismatch

### Code Evidence
```javascript
// UserContext.tsx (Login) - CORRECT
const savedToken = localStorage.getItem('auth_token');

// PlaybookManager.tsx (Approval) - INCORRECT  
const token = localStorage.getItem('token');
```

## Solution Applied
**Fixed localStorage key mismatch by updating PlaybookManager.tsx:**
```javascript
// BEFORE
const token = localStorage.getItem('token');

// AFTER  
const token = localStorage.getItem('auth_token');
```

## Key Learnings

### 1. Authentication Debugging Strategy
- **Always check localStorage keys first** when dealing with token issues
- **Verify token format** before assuming signature problems
- **Check both frontend and backend** for consistent key usage

### 2. Common localStorage Key Issues
- Different components using different key names
- Case sensitivity problems (`token` vs `Token`)
- Inconsistent naming conventions across codebase

### 3. JWT Error Interpretation
- `invalid signature` = Wrong JWT secret or corrupted token
- `jwt malformed` = Token format issues or missing token
- `TokenExpiredError` = Token has expired

## Prevention Strategies

### 1. Centralized Token Management
```javascript
// Create a token service
const TokenService = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token) => localStorage.setItem('auth_token', token),
  removeToken: () => localStorage.removeItem('auth_token')
};
```

### 2. Consistent Key Usage
- Use same localStorage key across entire application
- Document key names in project documentation
- Add linting rules to catch inconsistent usage

### 3. Better Error Handling
```javascript
const token = localStorage.getItem('auth_token');
if (!token) {
  console.error('No auth token found in localStorage');
  // Handle missing token gracefully
}
```

## Debugging Checklist
- [ ] Check localStorage for token existence
- [ ] Verify token format (JWT has 3 parts separated by dots)
- [ ] Confirm localStorage key consistency across components
- [ ] Test token with JWT decoder to verify payload
- [ ] Check backend JWT_SECRET configuration
- [ ] Verify database connection for user validation

## Files Modified
- `content-engine/frontend/src/pages/PlaybookManager.tsx` - Fixed localStorage key from `token` to `auth_token`

## Status: ✅ RESOLVED
The content idea approval system now works correctly with proper JWT token authentication.
