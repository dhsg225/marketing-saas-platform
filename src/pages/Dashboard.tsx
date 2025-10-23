import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import ReportOptionsModal from '../components/ReportOptionsModal';

// FORCE DEPLOYMENT - API URL MAPPING FIX APPLIED

interface DashboardData {
  upcomingContent: any[];
  recentContent: any[];
  recentActivity: any[];
  recentCommunications: any[];
  imminentPosts: any[];
  recentAnalytics: any[];
  aiSuggestedTodos: any[];
  stats: {
    totalContent: number;
    activeProjects: number;
    thisMonth: number;
    successRate: string;
  };
}

interface QuickAction {
  id: number;
  title: string;
  description: string;
  icon: string;
  link: string;
  color: string;
  reason: string;
}

const Dashboard: React.FC = () => {
  const { token, selectedProject, projects } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered, token:', token ? 'present' : 'missing');
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    console.log('🔍 DEBUG: fetchDashboardData called!');
    try {
      setLoading(true);
      
      // DEBUG: Test API URL mapping
      console.log('🔍 DEBUG: Testing API URL mapping...');
      console.log('dashboard/data ->', api.getUrl('dashboard/data'));
      console.log('dashboard/quick-actions ->', api.getUrl('dashboard/quick-actions'));
      console.log('clients/clients/org ->', api.getUrl('clients/clients/org'));
      
      const [dashboardResponse, actionsResponse] = await Promise.all([
        axios.get(api.getUrl('dashboard/data'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        axios.get(api.getUrl('dashboard/quick-actions'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      console.log('🔍 DEBUG: Dashboard response:', dashboardResponse.data);
      console.log('🔍 DEBUG: Actions response:', actionsResponse.data);

      if (dashboardResponse.data.success) {
        console.log('🔍 DEBUG: Setting dashboard data:', dashboardResponse.data.data);
        setDashboardData(dashboardResponse.data.data);
      } else {
        console.log('🔍 DEBUG: Dashboard response not successful:', dashboardResponse.data);
      }
      
      if (actionsResponse.data.success) {
        console.log('🔍 DEBUG: Setting quick actions:', actionsResponse.data.data);
        setQuickActions(actionsResponse.data.data);
      } else {
        console.log('🔍 DEBUG: Actions response not successful:', actionsResponse.data);
      }
    } catch (err: any) {
      console.error('Dashboard data fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold gradient-text text-shadow mb-4">Dashboard</h1>
          <p className="text-xl text-gray-600">Loading your AI-powered marketing command center...</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold gradient-text text-shadow mb-4">Dashboard</h1>
          <p className="text-xl text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  const stats = dashboardData ? [
    { name: 'Total Content Generated', value: dashboardData.stats.totalContent.toString(), icon: '📄' },
    { name: 'Active Projects', value: dashboardData.stats.activeProjects.toString(), icon: '👥' },
    { name: 'This Month', value: dashboardData.stats.thisMonth.toString(), icon: '✨' },
    { name: 'Success Rate', value: dashboardData.stats.successRate, icon: '📊' },
  ] : [
    { name: 'Total Content Generated', value: '0', icon: '📄' },
    { name: 'Active Projects', value: '0', icon: '👥' },
    { name: 'This Month', value: '0', icon: '✨' },
    { name: 'Success Rate', value: '0%', icon: '📊' },
  ];

  const currentProject = projects.find(p => p.id === selectedProject);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold gradient-text text-shadow mb-4">Dashboard</h1>
        <p className="text-xl text-gray-600">Welcome to your AI-powered marketing command center</p>
        
        {/* Generate Report Button */}
        {currentProject && (
          <div className="mt-6">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all inline-flex items-center"
            >
              📄 Generate Client Report
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item, index) => {
          const gradients = ['bg-gradient-primary', 'bg-gradient-secondary', 'bg-gradient-success', 'bg-gradient-warning'];
          const glows = ['shadow-glow', 'shadow-glow-pink', 'shadow-glow-blue', 'shadow-glow-green'];
          return (
            <div key={item.name} className={`stats-card hover-lift ${glows[index]}`}>
              <div className="flex items-center">
                <div className={`icon-container ${gradients[index]} ${glows[index]}`}>
                  <div className="text-3xl">{item.icon}</div>
                </div>
                <div className="ml-6">
                  <p className="text-sm font-medium text-gray-600">{item.name}</p>
                  <p className="mt-2 text-4xl font-bold text-gray-900">{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="modern-card hover-lift">
        <div className="px-8 py-8">
          <h3 className="text-2xl font-bold gradient-text text-center mb-8">
            Recently Used Actions
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.slice(0, 8).map((action, index) => {
              const colorClasses = {
                primary: 'bg-gradient-primary text-white',
                secondary: 'bg-gradient-secondary text-white',
                accent: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
                success: 'bg-gradient-success text-white',
                warning: 'bg-gradient-warning text-white',
                info: 'bg-gradient-info text-white',
                purple: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                gray: 'bg-gray-500 text-white'
              };
              
              return (
            <Link
                  key={action.id}
                  to={action.link}
                  className={`${colorClasses[action.color as keyof typeof colorClasses] || 'bg-gray-500 text-white'} rounded-lg p-3 text-center block hover-lift transition-all duration-300 group`}
                  title={action.reason}
                >
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <div className="text-sm font-semibold mb-1">{action.title}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
            </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity - Compact Design */}
      <div className="modern-card hover-lift">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold gradient-text">
              📋 Recent Activity
            </h3>
            {dashboardData?.recentActivity && dashboardData.recentActivity.length > 5 && (
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Show More ▼
              </button>
            )}
          </div>
          
          {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
            <div className="space-y-1">
              {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={activity.id} className="flex items-center justify-between py-1 px-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">
                      {activity.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {activity.message || activity.description}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          activity.color === 'green' ? 'bg-green-100 text-green-800' :
                          activity.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                          activity.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.color === 'green' ? '✅ Ready' :
                           activity.color === 'blue' ? '📝 Draft' :
                           activity.color === 'orange' ? '💡 Approved' :
                           '📋 Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatTimeAgo(new Date(activity.timestamp))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* New Dashboard Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Communications */}
        <div className="modern-card hover-lift">
          <div className="px-6 py-6">
            <h3 className="text-xl font-bold gradient-text mb-6 flex items-center">
              <span className="text-2xl mr-3">💬</span>
              Recent Communications
            </h3>
            <div className="space-y-4">
              {dashboardData?.recentCommunications && dashboardData.recentCommunications.length > 0 ? (
                dashboardData.recentCommunications.map((comm, index) => (
                  <div key={comm.id} className="glass rounded-lg p-4 hover-lift transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        comm.priority === 'high' ? 'bg-red-500' :
                        comm.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {comm.subject}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(new Date(comm.timestamp))}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {comm.message}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span>From: {comm.from}</span>
                          <span>•</span>
                          <span>{comm.project_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-2xl mb-2">💬</div>
                  <p className="text-sm">No recent communications</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Imminent Posts */}
        <div className="modern-card hover-lift">
          <div className="px-6 py-6">
            <h3 className="text-xl font-bold gradient-text mb-6 flex items-center">
              <span className="text-2xl mr-3">⏰</span>
              Imminent Posts
            </h3>
            <div className="space-y-4">
              {dashboardData?.imminentPosts && dashboardData.imminentPosts.length > 0 ? (
                dashboardData.imminentPosts.map((post, index) => (
                  <div key={post.id} className="glass rounded-lg p-4 hover-lift transition-all duration-300">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-lg">
                          📅
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {post.title}
                        </h4>
                        <p className="text-xs text-gray-600 mb-1">
                          {post.project_name} • {post.post_type_name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatDate(post.suggested_date)}
                          </span>
                          {post.suggested_time && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {post.suggested_time}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          post.status === 'approved' ? 'bg-green-100 text-green-800' :
                          post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-2xl mb-2">⏰</div>
                  <p className="text-sm">No posts scheduled for next 24h</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Analytics */}
        <div className="modern-card hover-lift">
          <div className="px-6 py-6">
            <h3 className="text-xl font-bold gradient-text mb-6 flex items-center">
              <span className="text-2xl mr-3">📊</span>
              Recent Analytics (24h)
            </h3>
            <div className="space-y-4">
              {dashboardData?.recentAnalytics && dashboardData.recentAnalytics.length > 0 ? (
                dashboardData.recentAnalytics.map((metric, index) => (
                  <div key={metric.id} className="glass rounded-lg p-4 hover-lift transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {metric.project_name}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {metric.period}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 mb-1">
                          {metric.metric.replace('_', ' ').toUpperCase()}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-gray-900">
                            {metric.value}%
                          </span>
                          <span className={`text-xs font-medium ${
                            metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {metric.change}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {metric.client_name}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-2xl mb-2">📊</div>
                  <p className="text-sm">No analytics data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI-Suggested To-Dos */}
        <div className="modern-card hover-lift">
          <div className="px-6 py-6">
            <h3 className="text-xl font-bold gradient-text mb-6 flex items-center">
              <span className="text-2xl mr-3">🤖</span>
              AI-Suggested To-Dos
            </h3>
            <div className="space-y-4">
              {dashboardData?.aiSuggestedTodos && dashboardData.aiSuggestedTodos.length > 0 ? (
                dashboardData.aiSuggestedTodos.map((todo, index) => (
                  <div key={todo.id} className="glass rounded-lg p-4 hover-lift transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        todo.priority === 'high' ? 'bg-red-500' :
                        todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {todo.task}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {Math.round(todo.confidence * 100)}% confidence
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              todo.priority === 'high' ? 'bg-red-100 text-red-800' :
                              todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {todo.priority}
                    </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {todo.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {todo.project_name} • {todo.estimated_time}
                          </div>
                          <div className="flex space-x-2">
                            <button className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                              Accept
                            </button>
                            <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-2xl mb-2">🤖</div>
                  <p className="text-sm">No AI suggestions available</p>
                </div>
              )}
              </div>
          </div>
        </div>
      </div>

      {/* Report Options Modal */}
      {showReportModal && currentProject && (
        <ReportOptionsModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          projectId={currentProject.id}
          projectName={currentProject.name}
          clientName={currentProject.client_name || 'Unknown Client'}
          token={token || ''}
        />
      )}
    </div>
  );
};

export default Dashboard;
