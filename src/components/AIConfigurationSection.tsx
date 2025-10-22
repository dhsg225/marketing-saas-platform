import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';

interface AIModel {
  taskType: string;
  model: string;
  description: string;
  max_tokens: number;
}

interface AIConfig {
  [key: string]: {
    model: string;
    max_tokens: number;
    description: string;
    use_case: string;
  };
}

const AIConfigurationSection: React.FC = () => {
  const { token } = useUser();
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [useCases, setUseCases] = useState<{[key: string]: AIModel[]}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'models' | 'tasks' | 'use-cases'>('overview');

  useEffect(() => {
    fetchAIConfiguration();
  }, []);

  const fetchAIConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all AI configuration data
      const [configResponse, modelsResponse, useCasesResponse] = await Promise.all([
        axios.get(api.getUrl('ai-config/current'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        axios.get(api.getUrl('ai-config/models'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        axios.get(api.getUrl('ai-config/use-cases'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      if (configResponse.data.success) {
        setAiConfig(configResponse.data.data);
      }
      if (modelsResponse.data.success) {
        setModels(modelsResponse.data.data);
      }
      if (useCasesResponse.data.success) {
        setUseCases(useCasesResponse.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching AI configuration:', error);
      setError('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const getModelIcon = (model: string) => {
    if (model.includes('claude')) return '🤖';
    if (model.includes('gpt')) return '🧠';
    if (model.includes('haiku')) return '⚡';
    if (model.includes('sonnet')) return '🎭';
    if (model.includes('opus')) return '🎨';
    return '🤖';
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'DOCUMENT_ANALYSIS': return '📄';
      case 'DOCUMENT_EXTRACTION': return '🔍';
      case 'CONTENT_GENERATION': return '✨';
      case 'GENERAL_ANALYSIS': return '🧠';
      case 'QUICK_TASKS': return '⚡';
      default: return '🤖';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading AI configuration...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Configuration</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchAIConfiguration}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">🤖 AI Configuration</h3>
        <p className="text-sm text-gray-500 mt-1">
          View and manage AI models, task assignments, and performance settings
        </p>
      </div>
      
      <div className="p-6">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'models', label: 'All Models', icon: '🤖' },
              { id: 'tasks', label: 'Task Assignments', icon: '⚙️' },
              { id: 'use-cases', label: 'Use Cases', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiConfig && Object.entries(aiConfig).map(([taskType, config]) => (
                <div key={taskType} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{getTaskIcon(taskType)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{taskType.replace(/_/g, ' ')}</h4>
                      <p className="text-sm text-gray-500">{config.use_case}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Model:</span>
                      <span className="text-sm font-medium">{config.model}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Max Tokens:</span>
                      <span className="text-sm font-medium">{config.max_tokens.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Models Tab */}
        {activeView === 'models' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-4">Available AI Models</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((model, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{getModelIcon(model.model)}</span>
                    <div>
                      <h5 className="font-medium text-gray-900">{model.model}</h5>
                      <p className="text-sm text-gray-500">{model.taskType}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{model.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Max Tokens:</span>
                      <span className="text-sm font-medium">{model.max_tokens.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Assignments Tab */}
        {activeView === 'tasks' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 mb-4">Task-Specific Model Assignments</h4>
            <div className="space-y-4">
              {aiConfig && Object.entries(aiConfig).map(([taskType, config]) => (
                <div key={taskType} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getTaskIcon(taskType)}</span>
                      <div>
                        <h5 className="font-medium text-gray-900">{taskType.replace(/_/g, ' ')}</h5>
                        <p className="text-sm text-gray-500">{config.use_case}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{config.model}</div>
                      <div className="text-sm text-gray-500">{config.max_tokens.toLocaleString()} tokens</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Use Cases Tab */}
        {activeView === 'use-cases' && (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 mb-4">Models by Use Case</h4>
            {Object.entries(useCases).map(([useCase, models]) => (
              <div key={useCase} className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">{useCase}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {models.map((model, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-xl">{getModelIcon(model.model)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{model.model}</div>
                        <div className="text-sm text-gray-500">{model.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={fetchAIConfiguration}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              🔄 Refresh Configuration
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
              📊 View Usage Stats
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              ⚙️ Advanced Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfigurationSection;
