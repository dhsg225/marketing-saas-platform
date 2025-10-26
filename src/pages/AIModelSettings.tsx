// AI Model Settings - Admin Interface for Managing Eden AI Models
// [Oct 23, 2025 20:00] - Admin UI for toggling models, viewing usage stats, and configuration
import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import axios from 'axios';

interface AIModel {
  id: string;
  provider: string;
  name: string;
  model_identifier: string;
  enabled: boolean;
  display_order: number;
  description: string;
  estimated_time: number;
  cost_per_generation: number;
  supported_resolutions: string[];
  max_resolution: string;
  features: string[];
  documentation_url?: string;
  requires_api_key: boolean;
  created_at: string;
  updated_at: string;
}

interface UsageStats {
  id: string;
  name: string;
  provider: string;
  total_generations: number;
  successful_generations: number;
  failed_generations: number;
  avg_generation_time_ms: number;
  total_cost_usd: number;
  last_used_at: string | null;
}

const AIModelSettings: React.FC = () => {
  const { token } = useUser();
  const [models, setModels] = useState<AIModel[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'usage' | 'config'>('models');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  const adminApiUrl = api.getUrl('admin/ai-models');

  useEffect(() => {
    loadModels();
    loadUsageStats();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await axios.get(adminApiUrl, {
        headers: api.getHeaders(token)
      });
      
      if (response.data.success) {
        setModels(response.data.models);
        console.log('✅ Loaded models:', response.data.models.length);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      alert('Failed to load AI models');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      // Query the analytics view from Supabase
      const response = await axios.get(api.getUrl('admin/ai-models/usage'), {
        headers: api.getHeaders(token)
      });
      
      if (response.data.success) {
        setUsageStats(response.data.stats || []);
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      // Non-critical, continue without stats
    }
  };

  const toggleModel = async (modelId: string, currentEnabled: boolean) => {
    setUpdating(modelId);
    try {
      const response = await axios.put(
        adminApiUrl,
        {
          modelId: modelId,
          updates: { enabled: !currentEnabled }
        },
        { headers: api.getHeaders(token) }
      );

      if (response.data.success) {
        // Update local state
        setModels(prev => prev.map(m => 
          m.id === modelId ? { ...m, enabled: !currentEnabled } : m
        ));
        console.log(`✅ Toggled ${modelId} to ${!currentEnabled}`);
      }
    } catch (error: any) {
      console.error('Failed to toggle model:', error);
      alert('Failed to update model: ' + (error.response?.data?.error || error.message));
    } finally {
      setUpdating(null);
    }
  };

  const toggleAll = async (enabled: boolean) => {
    setLoading(true);
    try {
      const response = await axios.post(
        adminApiUrl,
        {
          action: 'toggle_all',
          enabled: enabled
        },
        { headers: api.getHeaders(token) }
      );

      if (response.data.success) {
        // Reload models to reflect changes
        await loadModels();
        console.log(`✅ ${enabled ? 'Enabled' : 'Disabled'} all models`);
      }
    } catch (error: any) {
      console.error('Failed to toggle all:', error);
      alert('Failed to toggle all models: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    await loadUsageStats();
  };

  // Filter models based on search and status
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && model.enabled) ||
                         (filterStatus === 'disabled' && !model.enabled);
    return matchesSearch && matchesStatus;
  });

  const enabledCount = models.filter(m => m.enabled).length;
  const disabledCount = models.filter(m => !m.enabled).length;
  const totalCost = usageStats.reduce((sum, stat) => sum + (stat.total_cost_usd || 0), 0);
  const totalGenerations = usageStats.reduce((sum, stat) => sum + (stat.total_generations || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🤖 AI Model Settings</h1>
        <p className="text-lg text-gray-600 mb-4">
          Manage AI image generation models and view usage analytics
        </p>
        
        {/* Quick Stats */}
        <div className="flex justify-center space-x-6 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg px-6 py-3">
            <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
            <div className="text-sm text-green-800">Enabled</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-6 py-3">
            <div className="text-2xl font-bold text-red-600">{disabledCount}</div>
            <div className="text-sm text-red-800">Disabled</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
            <div className="text-2xl font-bold text-blue-600">{totalGenerations}</div>
            <div className="text-sm text-blue-800">Total Generations</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-6 py-3">
            <div className="text-2xl font-bold text-purple-600">${totalCost.toFixed(2)}</div>
            <div className="text-sm text-purple-800">Total Cost</div>
          </div>
        </div>
        </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
            <button
              onClick={() => setActiveTab('models')}
            className={`px-6 py-3 rounded-md font-semibold transition-all ${
                activeTab === 'models'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
            🎨 Models
            </button>
            <button
            onClick={() => setActiveTab('usage')}
            className={`px-6 py-3 rounded-md font-semibold transition-all ${
              activeTab === 'usage'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            📊 Usage Stats
            </button>
            <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 rounded-md font-semibold transition-all ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            ⚙️ Configuration
            </button>
          </div>
        </div>
          
          {/* Models Tab */}
          {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4 flex-1">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                
                {/* Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Models</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>

              {/* Bulk Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleAll(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  ✅ Enable All
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  ❌ Disable All
                </button>
                <button
                  onClick={loadModels}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Models Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading models...</p>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Features
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredModels.map((model) => (
                      <tr 
                        key={model.id}
                        className={`transition-colors ${model.enabled ? 'bg-green-50' : 'bg-gray-50'}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleModel(model.id, model.enabled)}
                            disabled={updating === model.id}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                              model.enabled ? 'bg-green-500' : 'bg-gray-300'
                            } ${updating === model.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                model.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {model.name}
                              </div>
                              <div className="text-xs text-gray-500 max-w-md truncate">
                                {model.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {model.provider}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${model.cost_per_generation.toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ~{model.estimated_time}s
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {model.features?.slice(0, 3).map((feature, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded"
                              >
                                {feature}
                              </span>
                            ))}
                            {model.features?.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                +{model.features.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {model.documentation_url && (
                            <a
                              href={model.documentation_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              Docs
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Model Count Summary */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-sm text-gray-600">
              Showing {filteredModels.length} of {models.length} models
              {filterStatus !== 'all' && ` (${filterStatus})`}
                        </div>
                      </div>
                </div>
              )}

      {/* Usage Stats Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">📊 Usage Statistics</h2>
              <button
                onClick={refreshStats}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔄 Refresh Stats
              </button>
            </div>
          </div>

          {/* Usage Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Gens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usageStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-lg font-medium">No usage data yet</p>
                        <p className="text-sm">Stats will appear after first image generation</p>
                      </td>
                    </tr>
                  ) : (
                    usageStats.map((stat) => {
                      const successRate = stat.total_generations > 0 
                        ? ((stat.successful_generations / stat.total_generations) * 100).toFixed(1)
                        : '0.0';
                      
                      return (
                        <tr key={stat.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{stat.name}</div>
                            <div className="text-xs text-gray-500">{stat.provider}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {stat.total_generations || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              {stat.failed_generations > 0 && (
                                <span className="text-red-600">{stat.failed_generations} failed</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              parseFloat(successRate) >= 95 ? 'bg-green-100 text-green-800' :
                              parseFloat(successRate) >= 80 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {successRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.avg_generation_time_ms 
                              ? `${(stat.avg_generation_time_ms / 1000).toFixed(1)}s`
                              : 'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${(stat.total_cost_usd || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            {stat.last_used_at 
                              ? new Date(stat.last_used_at).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
                </div>
                </div>

          {/* Cost Breakdown */}
          {usageStats.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Cost Breakdown</h3>
              <div className="space-y-2">
                {usageStats
                  .filter(stat => stat.total_cost_usd > 0)
                  .sort((a, b) => b.total_cost_usd - a.total_cost_usd)
                  .map(stat => {
                    const percentage = totalCost > 0 
                      ? ((stat.total_cost_usd / totalCost) * 100).toFixed(1)
                      : '0.0';
                    
                    return (
                      <div key={stat.id} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{stat.name}</span>
                            <span className="text-sm text-gray-600">
                              ${stat.total_cost_usd.toFixed(2)} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                </div>
              )}
            </div>
          )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-6">⚙️ System Configuration</h2>
            
            <div className="space-y-6">
              {/* Eden AI API Status */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🔑 Eden AI API</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                          <div>
                      <p className="text-sm font-medium text-green-800">API Key Configured</p>
                              <p className="text-xs text-green-600 mt-1">
                        Environment variable EDENAI_API_KEY is set
                              </p>
                    </div>
                    <span className="text-2xl">✅</span>
                          </div>
                          </div>
                        </div>
                        
              {/* Database Status */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🗄️ Database</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800">Models Table</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{models.length}</p>
                    <p className="text-xs text-blue-600 mt-1">Total models</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-800">Usage Logs</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">{totalGenerations}</p>
                    <p className="text-xs text-purple-600 mt-1">Logged generations</p>
                  </div>
                </div>
                          </div>
                          
              {/* Model Statistics */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Model Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700">Total Models</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{models.length}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-700">Enabled</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{enabledCount}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-700">Disabled</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{disabledCount}</p>
                            </div>
                        </div>
                      </div>

              {/* Cost Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">💰 Cost Information</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Average Cost per Image</p>
                      <p className="text-2xl font-bold text-yellow-600 mt-1">
                        ${(models.reduce((sum, m) => sum + m.cost_per_generation, 0) / models.length).toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Cost Range</p>
                      <p className="text-lg font-bold text-yellow-600 mt-1">
                        ${Math.min(...models.map(m => m.cost_per_generation)).toFixed(3)} - 
                        ${Math.max(...models.map(m => m.cost_per_generation)).toFixed(3)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-yellow-700">
                    <p>💡 <strong>Tip:</strong> Enable cheaper models (SDXL, Replicate) for drafts, premium models (DALL-E 3, Midjourney) for final assets.</p>
                  </div>
                </div>
              </div>

              {/* Documentation Links */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📚 Documentation</h3>
                <div className="space-y-2">
                  <a
                    href="https://docs.edenai.co/reference/image_generation_create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                      <div className="flex items-center justify-between">
                        <div>
                        <p className="text-sm font-medium text-blue-900">Eden AI Documentation</p>
                        <p className="text-xs text-blue-600">API reference and integration guides</p>
                        </div>
                      <span className="text-blue-600">→</span>
                        </div>
                  </a>
                  <a
                    href="https://app.edenai.run/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">Eden AI Dashboard</p>
                        <p className="text-xs text-purple-600">Monitor API usage and billing</p>
                      </div>
                      <span className="text-purple-600">→</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIModelSettings;
