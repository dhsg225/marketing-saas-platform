// Centralized API service - GOOGLE CLOUD FUNCTIONS APPROACH!
// All backend operations now use Google Cloud Functions
// Updated: Fixed URL mapping for frontend endpoints

// Google Cloud Functions base URL
const GOOGLE_CLOUD_BASE_URL = 'https://us-central1-marketing-saas-ai.cloudfunctions.net';

// Google Cloud Functions URLs
const getGoogleCloudUrl = (functionName: string) => {
  return `${GOOGLE_CLOUD_BASE_URL}/${functionName}`;
};

export const api = {
  get baseURL() {
    return GOOGLE_CLOUD_BASE_URL;
  },
  
  // Helper function to get full URL for Google Cloud Functions
  getUrl: (endpoint: string) => {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    // Map frontend endpoints to Google Cloud Function names
    const endpointMapping: Record<string, string> = {
      'dashboard/data': 'dashboard-data',
      'dashboard/quick-actions': 'dashboard-quick-actions',
      'clients/clients': 'clients-clients',
      'auth': 'auth',
      'ai-content-generation': 'ai-content-generation',
      'document-processing': 'document-processing'
    };
    
    // Check if this is a mapped endpoint
    if (endpointMapping[cleanEndpoint]) {
      return getGoogleCloudUrl(endpointMapping[cleanEndpoint]);
    }
    
    // For endpoints with parameters (like clients/clients/org-1), handle them specially
    if (cleanEndpoint.startsWith('clients/clients/')) {
      return getGoogleCloudUrl('clients-clients');
    }
    
    return getGoogleCloudUrl(cleanEndpoint);
  },
  
  // Google Cloud Functions URLs
  getGoogleCloudUrl: (functionName: string) => {
    return getGoogleCloudUrl(functionName);
  },
  
  // Specific Google Cloud Functions
  auth: () => getGoogleCloudUrl('auth'),
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
