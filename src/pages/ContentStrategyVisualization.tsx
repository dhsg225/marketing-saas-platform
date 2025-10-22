import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';

interface ContentStrategyData {
  hasStrategy: boolean;
  strategy?: {
    id: string;
    name: string;
    description: string;
    status: string;
  };
  targets?: Record<string, number>;
  actuals?: Record<string, number>;
  contentBreakdown?: Array<{
    postTypeName: string;
    color: string;
    targetPercentage: number;
    actualPercentage: number;
    actualCount: number;
    approvedCount: number;
    draftCount: number;
  }>;
  gapAnalysis?: Array<{
    postTypeName: string;
    color: string;
    targetPercentage: number;
    actualPercentage: number;
    gap: number;
    status: 'over' | 'under' | 'on-target';
  }>;
  adherenceScore?: number;
  recommendations?: Array<{
    type: string;
    postType?: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  summary?: {
    totalTargetPercentage: number;
    totalActualPercentage: number;
    totalContentCount: number;
  };
}

const ContentStrategyVisualization: React.FC = () => {
  const { selectedProject, token } = useUser();
  const [data, setData] = useState<ContentStrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStrategyData = useCallback(async () => {
    if (!selectedProject || !token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        api.getUrl(`content-strategy-viz/${selectedProject}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setData(response.data.data);
    } catch (err: any) {
      console.error('Failed to load strategy data:', err);
      setError(err.response?.data?.error || 'Failed to load strategy data');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, token]);

  useEffect(() => {
    loadStrategyData();
  }, [loadStrategyData]);

  const renderPieChart = (targets: Record<string, number>, actuals: Record<string, number>) => {
    const totalTarget = Object.values(targets).reduce((sum, val) => sum + val, 0);
    const totalActual = Object.values(actuals).reduce((sum, val) => sum + val, 0);

    const colors = {
      dish_spotlight: '#3b82f6',
      ingredient_spotlight: '#f59e0b', 
      weekly_special: '#10b981',
      educational: '#3b82f6',
      promotional: '#ef4444',
      behind_scenes: '#10b981',
      user_generated: '#f59e0b',
      test_colour: '#f97316'
    };

    // Helper function to create pie chart segments
    const createPieSegments = (data: Record<string, number>, total: number) => {
      let cumulative = 0;
      const circumference = 2 * Math.PI * 40; // r=40
      
      return Object.entries(data).map(([key, value]) => {
        if (value === 0) return null;
        
        const percentage = (value / total) * 100;
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
        const strokeDashoffset = -(cumulative / 100) * circumference;
        cumulative += percentage;

        return (
          <circle
            key={key}
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={colors[key as keyof typeof colors] || '#6366f1'}
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 hover:stroke-width-10"
          />
        );
      }).filter(Boolean);
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Target Pie Chart */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🎯 Strategic Targets</h3>
          <div className="relative w-64 h-64 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {createPieSegments(targets, totalTarget)}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{Math.round(totalTarget)}%</div>
                <div className="text-sm text-gray-600">Target Mix</div>
              </div>
            </div>
          </div>
          
          {/* Legend for Target Chart */}
          <div className="mt-4 space-y-2">
            {Object.entries(targets).filter(([_, value]) => value > 0).map(([key, value]) => (
              <div key={`target-legend-${key}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: colors[key as keyof typeof colors] || '#6366f1' }}
                  ></div>
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                </div>
                <span className="font-medium">{value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actual Pie Chart */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Actual Content</h3>
          <div className="relative w-64 h-64 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {createPieSegments(actuals, totalActual)}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{Math.round(totalActual)}%</div>
                <div className="text-sm text-gray-600">Actual Mix</div>
              </div>
            </div>
          </div>
          
          {/* Legend for Actual Chart */}
          <div className="mt-4 space-y-2">
            {Object.entries(actuals).filter(([_, value]) => value > 0).map(([key, value]) => (
              <div key={`actual-legend-${key}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: colors[key as keyof typeof colors] || '#6366f1' }}
                  ></div>
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                </div>
                <span className="font-medium">{value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProgressBars = () => {
    if (!data?.contentBreakdown) return null;

    return (
      <div className="glass rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">📈 Post Type Performance</h3>
        <div className="space-y-4">
          {data.contentBreakdown.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="font-medium text-gray-700">{item.postTypeName}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {item.actualCount} pieces ({item.actualPercentage.toFixed(1)}%)
                </div>
              </div>
              
              <div className="space-y-1">
                {/* Target Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Target:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full opacity-60"
                      style={{ 
                        width: `${Math.min(item.targetPercentage, 100)}%`,
                        backgroundColor: item.color 
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-12">{item.targetPercentage.toFixed(0)}%</span>
                </div>
                
                {/* Actual Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">Actual:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(item.actualPercentage, 100)}%`,
                        backgroundColor: item.color 
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-12">{item.actualPercentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGapAnalysis = () => {
    if (!data?.gapAnalysis) return null;

    return (
      <div className="glass rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">⚖️ Gap Analysis</h3>
        <div className="space-y-4">
          {data.gapAnalysis.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="font-medium text-gray-700">{item.postTypeName}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Gap</div>
                  <div className={`font-bold ${item.gap > 0 ? 'text-red-600' : item.gap < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                    {item.gap > 0 ? '+' : ''}{item.gap.toFixed(1)}%
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.status === 'over' ? 'bg-red-100 text-red-800' :
                  item.status === 'under' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.status === 'over' ? 'Over Target' :
                   item.status === 'under' ? 'Under Target' :
                   'On Target'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!data?.recommendations) return null;

    return (
      <div className="glass rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">💡 AI Recommendations</h3>
        <div className="space-y-4">
          {data.recommendations.map((rec, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              rec.priority === 'high' ? 'bg-red-50 border-red-400' :
              rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
              'bg-green-50 border-green-400'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {rec.priority === 'high' ? '!' : rec.priority === 'medium' ? '⚠' : '✓'}
                </div>
                <div>
                  <div className="font-medium text-gray-800 mb-1">
                    {rec.type === 'over' ? 'Over Production' :
                     rec.type === 'under' ? 'Under Production' :
                     'Strategy Alignment'}
                  </div>
                  <div className="text-gray-600">{rec.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Loading content strategy data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Data</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadStrategyData}
          className="btn-modern btn-primary hover-lift"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!data?.hasStrategy) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No Content Strategy Found</h3>
        <p className="text-gray-500 mb-6">
          This project doesn't have an active content strategy yet. Create one in the Playbook Manager to see strategy visualization.
        </p>
        <button
          onClick={() => window.location.href = '/playbook'}
          className="btn-modern btn-primary hover-lift"
        >
          📋 Go to Playbook Manager
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold gradient-text mb-4">📊 Content Strategy Visualization</h1>
        <p className="text-lg text-gray-700 mb-2">
          Track how well your content aligns with strategic goals
        </p>
        {data.strategy && (
          <div className="glass rounded-xl p-4 inline-block">
            <h2 className="text-xl font-bold text-gray-800">{data.strategy.name}</h2>
            <p className="text-gray-600">{data.strategy.description}</p>
          </div>
        )}
      </div>

      {/* Adherence Score */}
      {data.adherenceScore !== undefined && (
        <div className="glass rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">🎯 Strategy Adherence Score</h3>
          <div className="relative inline-block">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {data.adherenceScore.toFixed(0)}
            </div>
            <div className="text-lg text-gray-600">out of 100</div>
            <div className="mt-4 w-64 bg-gray-200 rounded-full h-3 mx-auto">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${
                  data.adherenceScore >= 80 ? 'bg-green-500' :
                  data.adherenceScore >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${data.adherenceScore}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {data.adherenceScore >= 80 ? 'Excellent alignment!' :
               data.adherenceScore >= 60 ? 'Good alignment' :
               'Needs improvement'}
            </div>
          </div>
        </div>
      )}

      {/* Pie Charts */}
      {data.targets && data.actuals && renderPieChart(data.targets, data.actuals)}

      {/* Progress Bars */}
      {renderProgressBars()}

      {/* Gap Analysis */}
      {renderGapAnalysis()}

      {/* Recommendations */}
      {renderRecommendations()}

      {/* Summary Stats */}
      {data.summary && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📈 Summary Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{data.summary.totalContentCount}</div>
              <div className="text-gray-600">Total Content Pieces</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {data.summary.totalTargetPercentage.toFixed(0)}%
              </div>
              <div className="text-gray-600">Target Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {data.summary.totalActualPercentage.toFixed(0)}%
              </div>
              <div className="text-gray-600">Actual Coverage</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentStrategyVisualization;
