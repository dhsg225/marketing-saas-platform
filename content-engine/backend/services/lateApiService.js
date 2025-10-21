const axios = require('axios');

class LateApiService {
  constructor() {
    this.baseURL = 'https://getlate.dev/api/v1';
    this.apiKey = process.env.LATE_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️ LATE_API_KEY not found in environment variables');
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // ==================== PROFILES ====================
  
  async getProfiles() {
    try {
      const response = await axios.get(`${this.baseURL}/profiles`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Get Profiles Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async createProfile(profileData) {
    try {
      const response = await axios.post(`${this.baseURL}/profiles`, profileData, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Create Profile Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // ==================== ACCOUNTS ====================
  
  async getAccounts(profileId = null) {
    try {
      const url = profileId ? 
        `${this.baseURL}/accounts?profileId=${profileId}` : 
        `${this.baseURL}/accounts`;
      
      const response = await axios.get(url, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Get Accounts Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // ==================== POSTS ====================
  
  async getPosts(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });
      
      const url = `${this.baseURL}/posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await axios.get(url, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Get Posts Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async createPost(postData) {
    try {
      const response = await axios.post(`${this.baseURL}/posts`, postData, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Create Post Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async getPost(postId) {
    try {
      const response = await axios.get(`${this.baseURL}/posts/${postId}`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Get Post Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async updatePost(postId, postData) {
    try {
      const response = await axios.put(`${this.baseURL}/posts/${postId}`, postData, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Update Post Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async deletePost(postId) {
    try {
      const response = await axios.delete(`${this.baseURL}/posts/${postId}`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Delete Post Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // ==================== MEDIA ====================
  
  async uploadMedia(files) {
    try {
      const formData = new FormData();
      
      if (Array.isArray(files)) {
        files.forEach(file => {
          formData.append('files', file);
        });
      } else {
        formData.append('files', files);
      }

      const response = await axios.post(`${this.baseURL}/media`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Upload Media Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // ==================== USAGE STATS ====================
  
  async getUsageStats() {
    try {
      const response = await axios.get(`${this.baseURL}/usage-stats`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Late API - Get Usage Stats Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // ==================== UTILITY METHODS ====================
  
  async testConnection() {
    try {
      const result = await this.getUsageStats();
      return result.success;
    } catch (error) {
      console.error('Late API - Connection Test Failed:', error.message);
      return false;
    }
  }

  // Get Facebook pages specifically
  async getFacebookPages() {
    try {
      const accountsResult = await this.getAccounts();
      if (!accountsResult.success) {
        return accountsResult;
      }

      // Filter for Facebook pages
      const facebookPages = accountsResult.data.filter(account => 
        account.platform === 'facebook' && account.type === 'page'
      );

      return { 
        success: true, 
        data: facebookPages,
        count: facebookPages.length 
      };
    } catch (error) {
      console.error('Late API - Get Facebook Pages Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Helper method to create a post from content idea
  createPostFromContentIdea(contentIdea, platforms, mediaItems = []) {
    return {
      content: contentIdea.title + (contentIdea.description ? `\n\n${contentIdea.description}` : ''),
      platforms: platforms,
      mediaItems: mediaItems,
      tags: contentIdea.topic_keywords || [],
      scheduledFor: contentIdea.suggested_date && contentIdea.suggested_time ? 
        `${contentIdea.suggested_date}T${contentIdea.suggested_time}:00` : null,
      timezone: 'UTC',
      isDraft: contentIdea.status === 'draft'
    };
  }
}

module.exports = new LateApiService();
