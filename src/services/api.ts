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
          'clients/projects/client': 'clients-projects',
          'auth': 'auth',
          'ai-content-generation': 'ai-content-generation',
          'document-processing': 'document-processing',
          'content-ideas': 'content-ideas',
          'posts': 'posts',
          'content': 'content',
          'prompt-refinement': 'api/prompt-refinement',
          'ai/generate-image': 'ai-image-generation',
          'assets': 'assets'
        };
    
    // Check if this is a mapped endpoint
    if (endpointMapping[cleanEndpoint]) {
      const mappedEndpoint = endpointMapping[cleanEndpoint];
      
      // If it's a Vercel API endpoint, use the current domain
      if (mappedEndpoint.startsWith('api/')) {
        return `${window.location.origin}/${mappedEndpoint}`;
      }
      
      // Otherwise use Google Cloud Functions
      return getGoogleCloudUrl(mappedEndpoint);
    }
    
    // For endpoints with parameters (like clients/clients/org-1), handle them specially
    if (cleanEndpoint.startsWith('clients/clients/')) {
      // Extract the organization ID from the endpoint
      const orgId = cleanEndpoint.split('/')[2]; // clients/clients/{orgId}
      return getGoogleCloudUrl(`clientsClients/${orgId}`);
    }
    
    // For projects endpoints with parameters (like clients/projects/client/clientId), handle them specially
    if (cleanEndpoint.startsWith('clients/projects/client/')) {
      // Extract the client ID from the endpoint
      const clientId = cleanEndpoint.split('/')[3]; // clients/projects/client/{clientId}
      return getGoogleCloudUrl(`clientsProjects/${clientId}`);
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
// Force redeploy - Thu Oct 23 01:07:28 +07 2025
// Force rebuild - 1761156492
// ULTRA FORCE DEPLOYMENT - 1761158166 - API MAPPING FIX
// This comment forces Vercel to rebuild the entire application
