import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';
import ContentMappingDialog from './ContentMappingDialog';
import api from '../services/api';

interface ReferenceDocument {
  id: string;
  name: string;
  description?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  document_category: string;
  is_ai_accessible: boolean;
  uploaded_by_name: string;
  created_at: string;
}

interface Category {
  value: string;
  label: string;
}

const ReferenceDocuments: React.FC = () => {
  const { selectedProject, projects, token } = useUser();
  const currentProject = projects.find(p => p.id === selectedProject);
  const [documents, setDocuments] = useState<ReferenceDocument[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ReferenceDocument | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('general');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // AI Processing state
  const [aiProcessing, setAiProcessing] = useState<string | null>(null); // Track which document is being processed
  const [lastProcessedDocId, setLastProcessedDocId] = useState<string | null>(null); // Track last processed document
  const [aiResults, setAiResults] = useState<any>(null);
  const [showAiResults, setShowAiResults] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummaryData, setImportSummaryData] = useState<{
    imported: number;
    totalExtracted: number;
    totalInDocument: number;
    hasMoreItems: boolean;
  } | null>(null);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    document_category: 'general',
    is_ai_accessible: true
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    document_category: 'general',
    is_ai_accessible: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedProject) {
      fetchDocuments();
      fetchCategories();
    }
  }, [selectedProject]);

  const fetchDocuments = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const response = await axios.get(api.getUrl(`reference-documents/${selectedProject}`), {
        headers: api.getHeaders(token)
      });
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await axios.get(api.getUrl(`reference-documents/${selectedProject}/categories`), {
        headers: api.getHeaders(token)
      });
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleFileUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedProject || !fileInputRef.current?.files?.[0]) {
      setError('Please select a file to upload');
      return;
    }

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    
    formData.append('document', file);
    formData.append('name', uploadForm.name || file.name);
    formData.append('description', uploadForm.description);
    formData.append('document_category', uploadForm.document_category);
    formData.append('is_ai_accessible', uploadForm.is_ai_accessible.toString());

    try {
      setUploading(true);
      setError(null);
      
      const response = await axios.post(
        api.getUrl(`reference-documents/${selectedProject}`),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...api.getHeaders(token)
          },
        }
      );

      setSuccess('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({
        name: '',
        description: '',
        document_category: 'general',
        is_ai_accessible: true
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      fetchDocuments(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setError(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: ReferenceDocument) => {
    try {
      const response = await axios.get(
        api.getUrl(`reference-documents/${selectedProject}/${doc.id}/download`),
        { 
          responseType: 'blob',
          headers: api.getHeaders(token)
        }
      );
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const handleDelete = async (doc: ReferenceDocument) => {
    if (!selectedProject) return;
    
    if (!window.confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      return;
    }

    try {
      await axios.delete(api.getUrl(`reference-documents/${selectedProject}/${doc.id}`), {
        headers: api.getHeaders(token)
      });
      setSuccess('Document deleted successfully!');
      fetchDocuments(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  // AI Document Processing
  const handleAiProcess = async (doc: ReferenceDocument) => {
    if (!selectedProject) return;
    
    setAiProcessing(doc.id); // Track which specific document is being processed
    setLastProcessedDocId(doc.id); // Remember this document for potential re-processing
    setError(null);
    
    try {
      // Process the document directly using its ID - let the backend handle file retrieval
      const aiResponse = await axios.post(
        api.getUrl(`document-ingestion/${selectedProject}/process-existing`),
        {
          documentId: doc.id,
          documentName: doc.file_name,
          mimeType: doc.mime_type
        },
        {
          headers: api.getHeaders(token)
        }
      );
      
      if (aiResponse.data.success) {
        setAiResults(aiResponse.data.data);
        setShowAiResults(true);
        setSuccess('Document processed with AI successfully!');
      }
    } catch (error: any) {
      console.error('AI processing error:', error);
      setError(error.response?.data?.error || 'Failed to process document with AI');
    } finally {
      setAiProcessing(null); // Clear processing state
    }
  };

  const handleImportContent = () => {
    if (!aiResults?.contentItems) return;
    // Pass ALL content items, not just the preview
    setShowMappingDialog(true);
  };

  const handleMappingComplete = (importedCount: number) => {
    // Calculate summary data
    const totalExtracted = aiResults?.contentItems?.length || 0;
    const totalInDocument = aiResults?.summary?.totalItems || 0;
    const hasMoreItems = totalInDocument > totalExtracted;

    setImportSummaryData({
      imported: importedCount,
      totalExtracted,
      totalInDocument,
      hasMoreItems
    });

    // Close mapping dialog and show summary
    setShowMappingDialog(false);
    setShowAiResults(false);
    setShowImportSummary(true);
  };

  const handleContinueImporting = async () => {
    // Close summary and re-process the document to get more items
    setShowImportSummary(false);
    setImportSummaryData(null);
    
    // Show progress indication
    setSuccess('🔄 Continuing import process... Please wait while we extract more items.');
    
    // Find the document we just processed and process it again
    const lastProcessedDoc = documents.find(doc => doc.id === lastProcessedDocId);
    if (lastProcessedDoc) {
      await handleAiProcess(lastProcessedDoc);
    } else {
      setError('Could not continue importing. Please try processing the document again.');
    }
  };

  const handleFinishImporting = () => {
    setShowImportSummary(false);
    setImportSummaryData(null);
    setAiResults(null);
    
    // Refresh the page to show new content
    window.location.reload();
  };

  const handleEdit = (doc: ReferenceDocument) => {
    setEditingDocument(doc);
    setEditForm({
      name: doc.name,
      description: doc.description || '',
      document_category: doc.document_category,
      is_ai_accessible: doc.is_ai_accessible
    });
    setShowEditModal(true);
  };

  const handleUpdateDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProject || !editingDocument) return;

    try {
      setUpdating(true);
      setError(null);
      
      const response = await axios.put(
        api.getUrl(`reference-documents/${selectedProject}/${editingDocument.id}`),
        editForm,
        {
          headers: api.getHeaders(token)
        }
      );

      setSuccess('Document updated successfully!');
      setShowEditModal(false);
      setEditingDocument(null);
      fetchDocuments(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error updating document:', error);
      setError('Failed to update document');
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!selectedProject || !editingDocument) return;

    try {
      setGeneratingDescription(true);
      setError(null);
      
      const response = await axios.post(
        api.getUrl(`reference-documents/${selectedProject}/${editingDocument.id}/generate-description`),
        {},
        {
          headers: api.getHeaders(token)
        }
      );

      if (response.data.success && response.data.description) {
        setEditForm({...editForm, description: response.data.description});
        setSuccess('Description generated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to generate description');
      }
      
    } catch (error) {
      console.error('Error generating description:', error);
      setError('Failed to generate description. The document may not be accessible or the AI service may be unavailable.');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category?.label || categoryValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📁</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Project Selected</h2>
          <p className="text-gray-600">Please select a project to view reference documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="glass rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📁 Client Reference Documents
              </h1>
              <p className="text-gray-600">
                Manage business documents, menus, brand guidelines, and other reference materials for <strong>{currentProject?.name || 'your project'}</strong>
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-gradient-primary text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
            >
              <span>📤</span>
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button 
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Documents List */}
        <div className="glass rounded-xl p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Documents Yet</h3>
              <p className="text-gray-600 mb-6">Upload your first reference document to get started.</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-primary text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">
                          {doc.mime_type.startsWith('image/') ? '🖼️' : 
                           doc.mime_type.includes('pdf') ? '📄' :
                           doc.mime_type.includes('word') ? '📝' :
                           doc.mime_type.includes('excel') ? '📊' :
                           doc.mime_type.includes('powerpoint') ? '📽️' : '📁'}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-800">{doc.name}</h3>
                          <p className="text-sm text-gray-600">{doc.file_name}</p>
                        </div>
                      </div>
                      
                      {doc.description && (
                        <p className="text-gray-600 text-sm mb-2">{doc.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>📂 {getCategoryLabel(doc.document_category)}</span>
                        <span>📏 {formatFileSize(doc.file_size)}</span>
                        <span>👤 {doc.uploaded_by_name}</span>
                        <span>📅 {formatDate(doc.created_at)}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          doc.is_ai_accessible 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.is_ai_accessible ? '🤖 AI Accessible' : '🔒 Private'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => handleAiProcess(doc)}
                        disabled={aiProcessing === doc.id}
                        className="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                        title="Process with AI"
                      >
                        {aiProcessing === doc.id ? '⏳' : '🤖'}
                      </button>
                      <button
                        onClick={() => handleEdit(doc)}
                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Upload Document</h3>
              
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document File *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to use file name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Optional description of the document"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={uploadForm.document_category}
                    onChange={(e) => setUploadForm({...uploadForm, document_category: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="ai-accessible"
                    checked={uploadForm.is_ai_accessible}
                    onChange={(e) => setUploadForm({...uploadForm, is_ai_accessible: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="ai-accessible" className="text-sm text-gray-700">
                    Allow AI to access this document for content generation
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-gradient-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Document</h3>
              
              <form onSubmit={handleUpdateDocument} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={generatingDescription}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Generate description using AI"
                    >
                      <span>🤖</span>
                      <span>{generatingDescription ? 'Analyzing...' : 'AI Generate'}</span>
                    </button>
                  </div>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Optional description of the document"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={editForm.document_category}
                    onChange={(e) => setEditForm({...editForm, document_category: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="edit-ai-accessible"
                    checked={editForm.is_ai_accessible}
                    onChange={(e) => setEditForm({...editForm, is_ai_accessible: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="edit-ai-accessible" className="text-sm text-gray-700">
                    Allow AI to access this document for content generation
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingDocument(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="bg-gradient-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Results Modal */}
        {showAiResults && aiResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">AI Processing Results</h3>
                <button
                  onClick={() => setShowAiResults(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Document Analysis */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Document Analysis</h4>
                  
                  {/* Completion Status */}
                  {aiResults.summary?.isComplete && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">🎉</span>
                        <div>
                          <h5 className="font-semibold text-green-900">All Content Processed!</h5>
                          <p className="text-sm text-green-800">
                            You've successfully imported all {aiResults.summary.alreadyProcessed} items from this document. 
                            No more content to extract.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{aiResults.summary?.documentType || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Items Found:</span>
                      <span className={`ml-2 font-medium ${aiResults.summary?.isComplete ? 'text-green-600' : ''}`}>
                        {aiResults.summary?.totalItems || 0}
                        {aiResults.summary?.isComplete && ' (All processed)'}
                      </span>
                    </div>
                    {aiResults.summary?.dateRange && (
                      <div>
                        <span className="text-gray-600">Date Range:</span>
                        <span className="ml-2 font-medium">
                          {aiResults.summary.dateRange.start} - {aiResults.summary.dateRange.end}
                        </span>
                      </div>
                    )}
                    {aiResults.summary?.platforms && aiResults.summary.platforms.length > 0 && (
                      <div>
                        <span className="text-gray-600">Platforms:</span>
                        <span className="ml-2 font-medium">{aiResults.summary.platforms.join(', ')}</span>
                      </div>
                    )}
                    {aiResults.summary?.alreadyProcessed > 0 && (
                      <div>
                        <span className="text-gray-600">Already Processed:</span>
                        <span className="ml-2 font-medium text-blue-600">{aiResults.summary.alreadyProcessed} items</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Insights */}
                {aiResults.summary?.insights && aiResults.summary.insights.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">AI Insights</h4>
                    <ul className="space-y-1">
                      {aiResults.summary.insights.map((insight: string, index: number) => (
                        <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quality Check Section */}
                <div className={`border rounded-lg p-4 ${
                  aiResults.summary?.isComplete 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={aiResults.summary?.isComplete ? 'text-blue-600' : 'text-green-600'}>
                      {aiResults.summary?.isComplete ? '🎉' : '✅'}
                    </span>
                    <h4 className={`font-semibold ${
                      aiResults.summary?.isComplete ? 'text-blue-900' : 'text-green-900'
                    }`}>
                      {aiResults.summary?.isComplete ? 'Import Complete!' : 'AI Quality Check'}
                    </h4>
                  </div>
                  <p className={`text-sm ${
                    aiResults.summary?.isComplete ? 'text-blue-800' : 'text-green-800'
                  }`}>
                    {aiResults.summary?.isComplete 
                      ? `All content from this document has been successfully imported! You've processed all ${aiResults.summary.alreadyProcessed} items. No more content to extract.`
                      : `Review the sample items below to verify AI extraction quality. If the format and content look good, click "Process All Items" to import all ${aiResults.contentItems?.length || 0} items at once.`
                    }
                  </p>
                </div>

                {/* Content Items Preview */}
                {aiResults.contentItems && aiResults.contentItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        Preview Content Items ({aiResults.contentItems.length} total found)
                      </h4>
                      <div className="text-sm text-gray-500">
                        Showing all {aiResults.contentItems.length} items for review
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {aiResults.contentItems.map((item: any, index: number) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start space-x-3">
                            <span className="text-lg">
                              {aiResults.summary?.documentType === 'Content Calendar' ? '📅' : '📄'}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">
                                {item.title || item.caption || `Item ${index + 1}`}
                              </p>
                              {item.description && (
                                <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.format && (
                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    {item.format}
                                  </span>
                                )}
                                {item.date && (
                                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                    {item.date}
                                  </span>
                                )}
                                {item.platform && (
                                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                    {item.platform}
                                  </span>
                                )}
                                {item.type && (
                                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                    {item.type}
                                  </span>
                                )}
                              </div>
                              {item.hashtags && item.hashtags.length > 0 && (
                                <div className="mt-2">
                                  <div className="flex flex-wrap gap-1">
                                    {item.hashtags.map((tag: string, tagIndex: number) => (
                                      <span key={tagIndex} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {aiResults.contentItems.length > 2 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                          <p className="text-sm text-blue-800 font-medium">
                            + {aiResults.contentItems.length - 2} more items will be processed
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            All {aiResults.contentItems.length} items will be imported when you click "Process All Items"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAiResults(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {aiResults.summary?.isComplete ? (
                  <button
                    onClick={() => {
                      setShowAiResults(false);
                      setAiResults(null);
                      // Refresh the page to show new content
                      window.location.reload();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                  >
                    🎉 View All Imported Content
                  </button>
                ) : (
                  <button
                    onClick={handleImportContent}
                    disabled={importing}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 font-medium shadow-lg hover:shadow-xl"
                  >
                    {importing ? 'Processing All Items...' : `Process All ${aiResults.contentItems?.length || 0} Items`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Mapping Dialog */}
        {showMappingDialog && aiResults?.contentItems && (
          <ContentMappingDialog
            isOpen={showMappingDialog}
            onClose={() => setShowMappingDialog(false)}
            contentItems={aiResults.contentItems}
            projectId={selectedProject || ''}
            onImportComplete={handleMappingComplete}
          />
        )}

        {/* Import Summary Dialog */}
        {showImportSummary && importSummaryData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
              <div className="text-center">
                {/* Success Icon */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <span className="text-4xl">✅</span>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h3>

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Items Imported:</span>
                    <span className="text-xl font-bold text-green-600">{importSummaryData.imported}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Items Extracted This Round:</span>
                    <span className="text-lg font-semibold text-gray-800">{importSummaryData.totalExtracted}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-gray-600">Total Items in Document:</span>
                    <span className="text-lg font-semibold text-gray-800">{importSummaryData.totalInDocument}</span>
                  </div>
                  {importSummaryData.hasMoreItems && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Remaining Items:</span>
                      <span className="text-lg font-semibold text-orange-600">
                        ~{importSummaryData.totalInDocument - importSummaryData.totalExtracted}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                {importSummaryData.hasMoreItems ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Due to AI token limits, we extracted {importSummaryData.totalExtracted} items out of {importSummaryData.totalInDocument} total. 
                      You can continue importing more items or finish now.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800">
                      <strong>Great!</strong> All available items from this document have been successfully imported.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {importSummaryData.hasMoreItems && (
                    <button
                      onClick={handleContinueImporting}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      🔄 Continue Importing More Items
                    </button>
                  )}
                  <button
                    onClick={handleFinishImporting}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                      importSummaryData.hasMoreItems
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    ✅ Finish & View Content
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferenceDocuments;
