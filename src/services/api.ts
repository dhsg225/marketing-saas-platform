// Centralized API service - NO HARDCODED URLs!
// This will work with ANY domain: localhost, Vercel, cognito.guru, etc.

const getApiBaseUrl = () => {
  // Priority order:
  // 1. Environment variable (set in Vercel, .env files, etc.)
  // 2. Current domain + /api (for production)
  // 3. Localhost fallback (development only)
  
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Auto-detect production domain
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}/api`;
  }
  
  // Development fallback
  return 'http://localhost:5001/api';
};

export const api = {
  get baseURL() {
    return getApiBaseUrl();
  },
  
  // Helper function to get full URL
  getUrl: (endpoint: string) => {
    const baseUrl = getApiBaseUrl();
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseUrl}/${cleanEndpoint}`;
  },
  
  // Helper function to get headers with auth token
  getHeaders: (token?: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }
};

export default api;
