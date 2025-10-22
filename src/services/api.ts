// Centralized API service - HYBRID APPROACH!
// Vercel functions for core operations, Google Cloud for heavy processing

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
    // TEMPORARY FIX: Use working Vercel deployment until cognito.guru domain is properly configured
    if (window.location.hostname === 'cognito.guru') {
      return 'https://marketing-saas-platform-1sa8nxfau-shannons-projects-3f909922.vercel.app/api';
    }
    return `${window.location.protocol}//${window.location.hostname}/api`;
  }
  
  // Development fallback
  return 'http://localhost:5001/api';
};

// Google Cloud Functions URLs
const getGoogleCloudUrl = (functionName: string) => {
  return `https://us-central1-marketing-saas-ai.cloudfunctions.net/${functionName}`;
};

export const api = {
  get baseURL() {
    return getApiBaseUrl();
  },
  
  // Helper function to get full URL for Vercel functions
  getUrl: (endpoint: string) => {
    const baseUrl = getApiBaseUrl();
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseUrl}/${cleanEndpoint}`;
  },
  
  // Google Cloud Functions URLs
  getGoogleCloudUrl: (functionName: string) => {
    return getGoogleCloudUrl(functionName);
  },
  
  // Specific Google Cloud Functions
  aiContentGeneration: () => getGoogleCloudUrl('ai-content-generation'),
  documentProcessing: () => getGoogleCloudUrl('document-processing'),
  
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
