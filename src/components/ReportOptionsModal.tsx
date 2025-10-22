import React, { useState } from 'react';
import api from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface ReportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  clientName: string;
  token: string;
}

interface ReportOptions {
  includeCalendar: boolean;
  includePostList: boolean;
  includePostContent: boolean;
  includeAnalytics: boolean;
  startDate: string;
  endDate: string;
}

const ReportOptionsModal: React.FC<ReportOptionsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  clientName,
  token
}) => {
  const [options, setOptions] = useState<ReportOptions>({
    includeCalendar: true,
    includePostList: true,
    includePostContent: true,
    includeAnalytics: false,
    startDate: '',
    endDate: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptionChange = (key: keyof ReportOptions, value: boolean | string) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('📊 Generating report with options:', options);

      // Generate the report
      const response = await axios.post(
        api.getUrl('reports/generate-pdf'),
        {
          projectId,
          reportOptions: options
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Create a blob and download the HTML file
        const blob = new Blob([response.data.data.html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        onClose();
      } else {
        setError('Failed to generate report');
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      setError(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generate Report</h2>
            <p className="text-gray-600 mt-1">
              {projectName} • {clientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Report Sections */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Sections</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeCalendar}
                    onChange={(e) => handleOptionChange('includeCalendar', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">📅 Calendar View</div>
                    <div className="text-sm text-gray-500">Visual layout of scheduled content</div>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includePostList}
                    onChange={(e) => handleOptionChange('includePostList', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">📋 Post List</div>
                    <div className="text-sm text-gray-500">Titles, status, publish date, assigned user</div>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includePostContent}
                    onChange={(e) => handleOptionChange('includePostContent', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">📱 Actual Post Content</div>
                    <div className="text-sm text-gray-500">Exactly as it appears on social feeds</div>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.includeAnalytics}
                    onChange={(e) => handleOptionChange('includeAnalytics', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">📊 Summary Analytics</div>
                    <div className="text-sm text-gray-500">Content statistics and performance metrics</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range Filter</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={options.startDate}
                    onChange={(e) => handleOptionChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={options.endDate}
                    onChange={(e) => handleOptionChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Leave empty to include all content
              </p>
            </div>

            {/* Report Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Report Preview</h4>
              <div className="text-sm text-gray-600">
                <p>This report will include:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {options.includeCalendar && <li>Calendar view with scheduled content</li>}
                  {options.includePostList && <li>List of all posts with metadata</li>}
                  {options.includePostContent && <li>Actual post content as it appears</li>}
                  {options.includeAnalytics && <li>Summary analytics and statistics</li>}
                  <li>Client branding and professional formatting</li>
                  <li>Export date and project information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || (!options.includeCalendar && !options.includePostList && !options.includePostContent)}
            className="px-6 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </div>
            ) : (
              '📄 Generate Report'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportOptionsModal;
