import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import ReportOptionsModal from '../components/ReportOptionsModal';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  client_name: string;
  client_email: string;
}

const Reports: React.FC = () => {
  const { selectedProject, projects, token, selectedClient } = useUser();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedProjectForReport, setSelectedProjectForReport] = useState<Project | null>(null);

  useEffect(() => {
    // Only load projects if we have a selected client
    if (selectedClient) {
      loadProjects();
    }
  }, [selectedClient]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      if (!selectedClient) {
        setError('No client selected');
        setLoading(false);
        return;
      }
      
      // Get all projects for the selected client
      const response = await axios.get(
        `http://localhost:5001/api/clients/projects/client/${selectedClient}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (response.data.success) {
        setAllProjects(response.data.data);
        setError(null); // Clear error on success
      }
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = (project: Project) => {
    setSelectedProjectForReport(project);
    setShowReportModal(true);
  };

  const handleCloseModal = () => {
    setShowReportModal(false);
    setSelectedProjectForReport(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">Client Reports</h1>
          <p className="text-xl text-gray-600 mb-6">
            Generate professional, ready-to-publish reports for your clients
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Reports Overview */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Report Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900">Calendar View</h3>
              <p className="text-sm text-gray-600">Visual layout of scheduled content</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-semibold text-gray-900">Post List</h3>
              <p className="text-sm text-gray-600">Titles, status, and metadata</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-semibold text-gray-900">Post Content</h3>
              <p className="text-sm text-gray-600">Actual social media posts</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600">Performance metrics</p>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Available Projects</h2>
            <p className="text-gray-600 mt-1">Select a project to generate a report</p>
          </div>

          {allProjects.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Projects Available</h3>
              <p className="text-gray-600 mb-6">
                You need to have projects set up before you can generate reports.
              </p>
              <button
                onClick={() => window.location.href = '/clients'}
                className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
              >
                Go to Client Management
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {allProjects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          project.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{project.client_name}</p>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-2">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Client</div>
                        <div className="font-medium text-gray-900">{project.client_name}</div>
                      </div>
                      <button
                        onClick={() => handleGenerateReport(project)}
                        className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
                      >
                        📄 Generate Report
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900">Dashboard</h3>
              <p className="text-sm text-gray-600">View project overview and generate reports</p>
            </button>
            <button
              onClick={() => window.location.href = '/calendar'}
              className="p-4 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all"
            >
              <div className="text-2xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900">Calendar View</h3>
              <p className="text-sm text-gray-600">Generate reports from calendar interface</p>
            </button>
            <button
              onClick={() => window.location.href = '/content-list'}
              className="p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
            >
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-semibold text-gray-900">Content List</h3>
              <p className="text-sm text-gray-600">Generate reports from content management</p>
            </button>
          </div>
        </div>
      </div>

      {/* Report Options Modal */}
      {showReportModal && selectedProjectForReport && (
        <ReportOptionsModal
          isOpen={showReportModal}
          onClose={handleCloseModal}
          projectId={selectedProjectForReport.id}
          projectName={selectedProjectForReport.name}
          clientName={selectedProjectForReport.client_name}
          token={token || ''}
        />
      )}
    </div>
  );
};

export default Reports;
