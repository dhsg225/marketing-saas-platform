// ========================================
// INTERN MODULE - PHASE 3
// Super Admin Dashboard Component
// ========================================

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { 
  formatFileSize, 
  getFileIcon, 
  getDocumentUrl,
  deleteDocument 
} from '@/lib/intern-service';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// ========================================
// TYPES & INTERFACES
// ========================================

interface InternWithDetails {
  id: string;
  user_id: string;
  email: string;
  application_date: string;
  status: 'Applied' | 'Active' | 'Exited' | 'Rejected';
  assigned_topic: string | null;
  start_date: string | null;
  end_date: string | null;
  agreement_signed: boolean;
  document_count: number;
}

interface InternDocument {
  id: string;
  document_type: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
}

interface InternStats {
  total_interns: number;
  applied_count: number;
  active_count: number;
  exited_count: number;
  rejected_count: number;
}

// ========================================
// MAIN DASHBOARD COMPONENT
// ========================================

export default function InternAdminDashboard() {
  // State management
  const [interns, setInterns] = useState<InternWithDetails[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<InternWithDetails[]>([]);
  const [stats, setStats] = useState<InternStats | null>(null);
  const [activeTab, setActiveTab] = useState<'Applied' | 'Active' | 'Exited' | 'Rejected' | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<InternWithDetails | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [internDocuments, setInternDocuments] = useState<InternDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Available topics
  const topics = ['auto', 'health', 'tech', 'finance', 'lifestyle', 'education', 'food', 'travel'];

  // ========================================
  // DATA FETCHING FUNCTIONS
  // ========================================

  const fetchInterns = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_interns_by_status');

      if (error) {
        console.error('Error fetching interns:', error);
        setError('Failed to fetch intern data');
        return;
      }

      setInterns(data || []);
      setFilteredInterns(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_intern_stats');

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchInternDocuments = async (internId: string) => {
    try {
      setDocumentsLoading(true);
      
      const { data, error } = await supabase
        .from('intern_documents')
        .select('*')
        .eq('intern_id', internId)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      setInternDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // ========================================
  // ACTION FUNCTIONS
  // ========================================

  const updateInternStatus = async (internId: string, newStatus: 'Active' | 'Exited' | 'Rejected') => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'Active') {
        updateData.start_date = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'Exited') {
        updateData.end_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('interns')
        .update(updateData)
        .eq('id', internId);

      if (error) {
        console.error('Error updating status:', error);
        alert('Failed to update intern status');
        return;
      }

      // Refresh data
      await fetchInterns();
      await fetchStats();
      alert('Intern status updated successfully!');
    } catch (err) {
      console.error('Error updating status:', err);
      alert('An error occurred while updating status');
    }
  };

  const updateAssignedTopic = async () => {
    if (!selectedIntern || !selectedTopic) return;

    try {
      const { error } = await supabase
        .from('interns')
        .update({ assigned_topic: selectedTopic })
        .eq('id', selectedIntern.id);

      if (error) {
        console.error('Error updating topic:', error);
        alert('Failed to update assigned topic');
        return;
      }

      // Refresh data and close modal
      await fetchInterns();
      setShowTopicModal(false);
      setSelectedIntern(null);
      setSelectedTopic('');
      alert('Assigned topic updated successfully!');
    } catch (err) {
      console.error('Error updating topic:', err);
      alert('An error occurred while updating topic');
    }
  };

  const handleViewDocuments = async (intern: InternWithDetails) => {
    setSelectedIntern(intern);
    setShowDocsModal(true);
    await fetchInternDocuments(intern.id);
  };

  const handleDownloadDocument = async (document: InternDocument) => {
    try {
      const url = await getDocumentUrl(document.storage_path);
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('Failed to generate download link');
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Failed to download document');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const result = await deleteDocument(documentId);
      if (result.success) {
        await fetchInternDocuments(selectedIntern!.id);
        alert('Document deleted successfully!');
      } else {
        alert(`Failed to delete document: ${result.error}`);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  // ========================================
  // FILTER FUNCTIONS
  // ========================================

  const filterInterns = (status: 'Applied' | 'Active' | 'Exited' | 'Rejected' | 'All') => {
    setActiveTab(status);
    
    if (status === 'All') {
      setFilteredInterns(interns);
    } else {
      setFilteredInterns(interns.filter(intern => intern.status === status));
    }
  };

  // ========================================
  // EFFECTS
  // ========================================

  useEffect(() => {
    fetchInterns();
    fetchStats();
  }, []);

  // ========================================
  // RENDER FUNCTIONS
  // ========================================

  const renderStatsCard = () => (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">📊 Intern Statistics</h2>
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.total_interns}</div>
            <div className="text-sm opacity-90">Total</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-300">{stats.applied_count}</div>
            <div className="text-sm opacity-90">Applied</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-300">{stats.active_count}</div>
            <div className="text-sm opacity-90">Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-300">{stats.exited_count}</div>
            <div className="text-sm opacity-90">Exited</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-300">{stats.rejected_count}</div>
            <div className="text-sm opacity-90">Rejected</div>
          </div>
        </div>
      ) : (
        <div className="text-center">Loading statistics...</div>
      )}
    </div>
  );

  const renderStatusTabs = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {(['All', 'Applied', 'Active', 'Exited', 'Rejected'] as const).map((status) => (
        <button
          key={status}
          onClick={() => filterInterns(status)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {status} ({status === 'All' ? interns.length : interns.filter(i => i.status === status).length})
        </button>
      ))}
    </div>
  );

  const renderInternRow = (intern: InternWithDetails) => (
    <tr key={intern.id} className="border-b hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="font-medium">{intern.email}</div>
        <div className="text-sm text-gray-500">ID: {intern.id.slice(0, 8)}...</div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          intern.status === 'Applied' ? 'bg-yellow-100 text-yellow-800' :
          intern.status === 'Active' ? 'bg-green-100 text-green-800' :
          intern.status === 'Exited' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {intern.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {intern.assigned_topic ? (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
            {intern.assigned_topic}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">Not assigned</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {new Date(intern.application_date).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
          intern.agreement_signed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {intern.agreement_signed ? '✅ Signed' : '❌ Pending'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
          📄 {intern.document_count}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {intern.status === 'Applied' && (
            <button
              onClick={() => updateInternStatus(intern.id, 'Active')}
              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
            >
              Set Active
            </button>
          )}
          <button
            onClick={() => {
              setSelectedIntern(intern);
              setSelectedTopic(intern.assigned_topic || '');
              setShowTopicModal(true);
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
          >
            Assign Topic
          </button>
          <button
            onClick={() => handleViewDocuments(intern)}
            className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
          >
            View Docs
          </button>
          {intern.status === 'Active' && (
            <button
              onClick={() => updateInternStatus(intern.id, 'Exited')}
              className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
            >
              Set Exited
            </button>
          )}
          {intern.status === 'Applied' && (
            <button
              onClick={() => updateInternStatus(intern.id, 'Rejected')}
              className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
            >
              Reject
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const renderTopicModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4">Assign Topic</h3>
        <p className="text-gray-600 mb-4">Assign a content vertical to {selectedIntern?.email}</p>
        
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
        >
          <option value="">Select a topic...</option>
          {topics.map(topic => (
            <option key={topic} value={topic}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</option>
          ))}
        </select>
        
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setShowTopicModal(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={updateAssignedTopic}
            disabled={!selectedTopic}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Assign Topic
          </button>
        </div>
      </div>
    </div>
  );

  const renderDocumentsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Documents for {selectedIntern?.email}</h3>
        
        {documentsLoading ? (
          <div className="text-center py-8">Loading documents...</div>
        ) : internDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No documents uploaded</div>
        ) : (
          <div className="space-y-3">
            {internDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(doc.mime_type)}</span>
                  <div>
                    <div className="font-medium">{doc.original_filename}</div>
                    <div className="text-sm text-gray-500">
                      {doc.document_type} • {formatFileSize(doc.file_size)} • {new Date(doc.upload_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowDocsModal(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // ========================================
  // MAIN RENDER
  // ========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-2xl font-bold mb-4">🔄 Loading Intern Command Center...</div>
            <div className="text-gray-600">Please wait while we fetch the latest data</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => {
              setError(null);
              fetchInterns();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 Intern Command Center
          </h1>
          <p className="text-gray-600">
            Super Admin Dashboard for Managing Intern Applications and Documents
          </p>
        </div>

        {/* Stats Card */}
        {renderStatsCard()}

        {/* Status Tabs */}
        <div className="mt-8">
          {renderStatusTabs()}
        </div>

        {/* Interns Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              Interns ({filteredInterns.length})
            </h2>
          </div>
          
          {filteredInterns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No interns found for the selected status.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Intern
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agreement
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Docs
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInterns.map(renderInternRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modals */}
        {showTopicModal && renderTopicModal()}
        {showDocsModal && renderDocumentsModal()}
      </div>
    </div>
  );
}

