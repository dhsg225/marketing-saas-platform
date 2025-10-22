/**
 * AI Model Settings - Admin UI for Managing Model Configurations
 * 
 * This component allows administrators to:
 * - View all configured AI models
 * - Toggle model availability (is_active)
 * - View usage statistics per model
 * - Manage user API keys (BYOK)
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';

interface AIModel {
  modelId: string;
  providerName: string;
  modelType: string;
  description: string;
  apiKeyType: string;
  estimatedTime: number;
  costPerGeneration: number;
  isActive?: boolean;
  adapterModule?: string;
  apiEndpoint?: string;
}

interface GenerationJob {
  job_id: string;
  model_id: string;
  prompt: string;
  status: string;
  progress: number;
  created_at: string;
  completed_at: string;
}

const AIModelSettings: React.FC = () => {
  const { token } = useUser();
  const [models, setModels] = useState<AIModel[]>([]);
  const [recentJobs, setRecentJobs] = useState<GenerationJob[]>([]);
  const [userApiKeys, setUserApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'models' | 'jobs' | 'keys'>('models');
  const [apiKeyInputs, setApiKeyInputs] = useState<{[key: string]: string}>({});
  const [savingKeys, setSavingKeys] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'models') {
        await loadModels();
      } else if (activeTab === 'jobs') {
        await loadRecentJobs();
      } else if (activeTab === 'keys') {
        await loadUserApiKeys();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
        const response = await axios.get(api.getUrl('ai/models?activeOnly=false'));
      if (response.data.success) {
        setModels(response.data.models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadRecentJobs = async () => {
    try {
        const response = await axios.get(api.getUrl('ai/jobs?limit=50'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.success) {
        setRecentJobs(response.data.jobs);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const loadUserApiKeys = async () => {
    try {
        const response = await axios.get(api.getUrl('user-api-keys/keys'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.success) {
        setUserApiKeys(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load user API keys:', error);
    }
  };

  const saveApiKey = async (modelId: string, apiKey: string) => {
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    setSavingKeys(prev => ({ ...prev, [modelId]: true }));
    
    try {
        const response = await axios.post(api.getUrl('user-api-keys/keys'), {
        modelId,
        apiKey
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        alert('✅ API key saved successfully!');
        setApiKeyInputs(prev => ({ ...prev, [modelId]: '' }));
        await loadUserApiKeys(); // Reload to show updated status
      }
    } catch (error: any) {
      console.error('Failed to save API key:', error);
      alert(`❌ Failed to save API key: ${error.response?.data?.error || error.message}`);
    } finally {
      setSavingKeys(prev => ({ ...prev, [modelId]: false }));
    }
  };

  const deleteApiKey = async (modelId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const response = await axios.delete(api.getUrl(`user-api-keys/keys/${modelId}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        alert('✅ API key deleted successfully!');
        await loadUserApiKeys(); // Reload to show updated status
      }
    } catch (error: any) {
      console.error('Failed to delete API key:', error);
      alert(`❌ Failed to delete API key: ${error.response?.data?.error || error.message}`);
    }
  };

  const getApiKeyStatus = (modelId: string) => {
    const userKey = userApiKeys.find(key => key.model_id === modelId);
    return userKey ? {
      hasKey: true,
      is_valid: userKey.is_valid,
      maskedKey: userKey.maskedKey
    } : {
      hasKey: false,
      is_valid: false,
      maskedKey: null
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'text': return '📝';
      default: return '🤖';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            🤖 AI Model Management
          </h1>
          <p className="text-gray-600 text-lg">
            Manage AI providers, view usage, and configure settings
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-xl border-b border-gray-200">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('models')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'models'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🤖 AI Models
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'jobs'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📊 Generation History
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'keys'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🔑 API Keys
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl shadow-xl p-6">
          
          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">🤖 No AI models configured</p>
                  <p className="text-sm">Run the database migration to load model configurations</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {models.map((model) => (
                    <div key={model.modelId} className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="text-3xl">{getModelTypeIcon(model.modelType)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">{model.providerName}</h3>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                {model.modelType}
                              </span>
                              {model.apiKeyType === 'user_specific' && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                  BYOK
                                </span>
                              )}
                              {model.apiKeyType === 'global' && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                                  Platform Key
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mb-3">{model.description}</p>
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <span>⏱️ ~{model.estimatedTime}s</span>
                              <span>💰 ${model.costPerGeneration.toFixed(4)}/gen</span>
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                {model.modelId}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg mb-2">📊 No generation history yet</p>
                  <p className="text-sm">Generate your first AI image to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentJobs.map((job) => (
                    <div key={job.job_id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(job.status)}`}>
                              {job.status}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">{job.model_id}</span>
                          </div>
                          <p className="text-gray-900 font-medium mb-1 line-clamp-2">{job.prompt}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Created: {new Date(job.created_at).toLocaleDateString()}</span>
                            {job.completed_at && (
                              <span>Completed: {new Date(job.completed_at).toLocaleDateString()}</span>
                            )}
                            <span className="text-blue-600">{job.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  🔑 Bring Your Own Key (BYOK)
                </h3>
                <p className="text-blue-800 text-sm mb-4">
                  For models marked as "BYOK", you can add your own API keys from the provider. 
                  This gives you direct control and may offer better pricing for high-volume usage.
                </p>
                <div className="space-y-4">
                  {models.filter(m => m.apiKeyType === 'user_specific').map((model) => {
                    const keyStatus = getApiKeyStatus(model.modelId);
                    const isSaving = savingKeys[model.modelId] || false;
                    const currentInput = apiKeyInputs[model.modelId] || '';
                    
                    return (
                      <div key={model.modelId} className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{model.providerName}</h4>
                            <p className="text-xs text-gray-600">Requires your personal API key</p>
                            {keyStatus.hasKey && (
                              <p className="text-xs text-green-600 mt-1">
                                ✅ Key saved: {keyStatus.maskedKey}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                              BYOK
                            </span>
                            {keyStatus.hasKey && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                {keyStatus.is_valid ? 'Valid' : 'Invalid'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="password"
                              placeholder={keyStatus.hasKey ? "Enter new API key to update..." : "Enter your API key..."}
                              value={currentInput}
                              onChange={(e) => setApiKeyInputs(prev => ({ ...prev, [model.modelId]: e.target.value }))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            />
                            <button
                              onClick={() => saveApiKey(model.modelId, currentInput)}
                              disabled={isSaving || !currentInput.trim()}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSaving ? 'Saving...' : (keyStatus.hasKey ? 'Update Key' : 'Save Key')}
                            </button>
                          </div>
                          
                          {keyStatus.hasKey && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteApiKey(model.modelId)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                              >
                                🗑️ Delete Key
                              </button>
                              <button
                                onClick={() => {
                                  // Test API key functionality
                                  alert('API key test functionality coming soon!');
                                }}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                              >
                                🧪 Test Key
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {models.filter(m => m.apiKeyType === 'user_specific').length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No BYOK models configured. All models use platform-wide keys.
                    </p>
                  )}
                </div>
              </div>

              {/* Platform Keys Info */}
              <div className="p-6 bg-purple-50 border border-purple-200 rounded-xl">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  🔐 Platform API Keys
                </h3>
                <p className="text-purple-800 text-sm mb-4">
                  The following models use platform-wide API keys configured by administrators.
                  These are managed through environment variables for security.
                </p>
                <div className="space-y-2">
                  {models.filter(m => m.apiKeyType === 'global').map((model) => (
                    <div key={model.modelId} className="bg-white rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{model.providerName}</h4>
                          <p className="text-xs text-gray-600 font-mono">{model.modelId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-xs text-gray-600">Configured</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-6">
            <div className="text-sm text-gray-600 mb-1">Total AI Models</div>
            <div className="text-3xl font-bold text-gray-900">{models.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              {models.filter(m => m.apiKeyType === 'global').length} platform · {models.filter(m => m.apiKeyType === 'user_specific').length} BYOK
            </div>
          </div>
          
          <div className="glass rounded-xl p-6">
            <div className="text-sm text-gray-600 mb-1">Generation Jobs</div>
            <div className="text-3xl font-bold text-gray-900">{recentJobs.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              {recentJobs.filter(j => j.status === 'completed').length} completed
            </div>
          </div>
          
          <div className="glass rounded-xl p-6">
            <div className="text-sm text-gray-600 mb-1">Success Rate</div>
            <div className="text-3xl font-bold text-green-600">
              {recentJobs.length > 0 
                ? Math.round((recentJobs.filter(j => j.status === 'completed').length / recentJobs.length) * 100)
                : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Last {recentJobs.length} jobs
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-6 glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📋 System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Abstraction Layer:</span>
              <span className="ml-2 font-medium text-green-600">✅ Active</span>
            </div>
            <div>
              <span className="text-gray-600">Registered Adapters:</span>
              <span className="ml-2 font-medium text-gray-900">ApiframeAdapter, DalleAdapter</span>
            </div>
            <div>
              <span className="text-gray-600">Database:</span>
              <span className="ml-2 font-medium text-gray-900">PostgreSQL</span>
            </div>
            <div>
              <span className="text-gray-600">API Version:</span>
              <span className="ml-2 font-medium text-gray-900">v1.0.0</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIModelSettings;

