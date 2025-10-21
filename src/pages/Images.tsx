import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import MediaPicker from '../components/MediaPicker';

interface ImageAsset {
  id: string;
  name: string;
  url: string;
  storage_path?: string;
  scope: 'project' | 'user' | 'organization';
  project_id?: string;
  variants?: {
    thumbnail?: { url: string; width: number; height: number; size: number; format?: string; path?: string };
    medium?: { url: string; width: number; height: number; size: number; format?: string; path?: string };
    large?: { url: string; width: number; height: number; size: number; format?: string; path?: string };
    original?: { url: string; width: number; height: number; size: number; format?: string; path?: string };
  };
  created_at: string;
}

interface ProcessingOptions {
  generateVariants: boolean;
  addWatermark: boolean;
  brandFilter: 'vibrant' | 'muted' | 'warm' | 'cool' | 'neutral';
  cropConfig?: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
  };
}

const Images: React.FC = () => {
  const { user, selectedOrganization, selectedProject, projects } = useUser();
  const currentProject = projects.find(p => p.id === selectedProject);
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'generate' | 'videos' | 'storage'>('library');
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  
  // MediaPicker states
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    generateVariants: true,
    addWatermark: false,
    brandFilter: 'neutral'
  });
  
  // MediaPicker handler
  const handleSelectMedia = (mediaUrl: string) => {
    console.log('Selected media:', mediaUrl);
    // Refresh the library to show the new image
    loadAssets();
  };

  // Lightbox handlers
  const openLightbox = (asset: ImageAsset) => {
    setLightboxImage(asset);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setLightboxImage(null);
  };

  
  // Filter states
  const [selectedScope, setSelectedScope] = useState<'project' | 'user' | 'organization'>('project');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('');
  
  // Variants modal states
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ImageAsset | null>(null);
  
  // Multi-select states
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Lightbox states
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ImageAsset | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 12 images per page (3 rows of 4)
  const [totalAssets, setTotalAssets] = useState(0);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: selectedScope });
      if (selectedScope === 'project' && selectedProjectFilter) {
        params.append('project_id', selectedProjectFilter);
      }
      if (selectedScope === 'organization' && selectedOrganization) {
        params.append('organization_id', selectedOrganization);
      }
      if (selectedScope === 'user' && user) {
        params.append('owner_user_id', user.id);
      }
      
      // Add pagination parameters
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const response = await fetch(`http://localhost:5001/api/assets?${params.toString()}`);
      const data = await response.json();
      setAssets(data.data || []);
      setTotalAssets(data.pagination?.total || data.total || data.data?.length || 0);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedScope, selectedProjectFilter, selectedOrganization, user, currentPage, itemsPerPage]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Keyboard event handler for lightbox
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showLightbox) {
        closeLightbox();
      }
    };

    if (showLightbox) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showLightbox]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setUploadProgress(0);
    setUploadStatus('Processing image...');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('scope', selectedScope);
      formData.append('generateVariants', processingOptions.generateVariants.toString());
      formData.append('addWatermark', processingOptions.addWatermark.toString());
      formData.append('brandFilter', processingOptions.brandFilter);
      
      if (selectedScope === 'project' && selectedProjectFilter) {
        formData.append('project_id', selectedProjectFilter);
      }
      if (selectedScope === 'organization' && selectedOrganization) {
        formData.append('organization_id', selectedOrganization);
      }
      if (selectedScope === 'user' && user) {
        formData.append('owner_user_id', user.id);
      }
      
      if (processingOptions.cropConfig) {
        formData.append('cropConfig', JSON.stringify(processingOptions.cropConfig));
      }
      
      setUploadStatus('Processing with Sharp...');
      setUploadProgress(30);
      
      const response = await fetch('http://localhost:5001/api/uploads/process-image', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      setUploadStatus('Creating asset record...');
      setUploadProgress(80);
      
      // Use custom name if provided, otherwise use original filename
      const finalFileName = customFileName.trim() || selectedFile.name;
      
      // Create asset record
      const originalUrl = result.data.variants?.original?.url || result.data.variants?.large?.url;
      const assetData = {
        file_name: finalFileName, // Database expects file_name, not name
        storage_path: originalUrl, // Required field for database
        scope: selectedScope,
        project_id: selectedScope === 'project' ? selectedProjectFilter : null,
        organization_id: selectedScope === 'organization' ? selectedOrganization : null,
        owner_user_id: selectedScope === 'user' ? user?.id : null,
        variants: result.data.variants
      };
      
      await fetch('http://localhost:5001/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      
      setUploadStatus('Complete!');
      setUploadProgress(100);
      
      // Reset form
      setSelectedFile(null);
      setCustomFileName('');
      setActiveTab('library');
      await loadAssets();
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  // Old handleGenerateImage removed - now using MediaPicker with AI Abstraction Layer

  const deleteAsset = async (assetId: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    
    try {
      await fetch(`http://localhost:5001/api/assets/${assetId}`, {
        method: 'DELETE'
      });
      await loadAssets();
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const openVariantsModal = (asset: ImageAsset) => {
    setSelectedAsset(asset);
    setShowVariantsModal(true);
  };

  const closeVariantsModal = () => {
    setShowVariantsModal(false);
    setSelectedAsset(null);
  };

  // Multi-select functions
  const toggleAssetSelection = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
    setSelectAll(newSelected.size === assets.length && assets.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(assets.map(asset => asset.id)));
    }
    setSelectAll(!selectAll);
  };

  const batchDeleteSelected = async () => {
    if (selectedAssets.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedAssets.size} selected images?`)) return;
    
    try {
      const deletePromises = Array.from(selectedAssets).map(assetId =>
        fetch(`http://localhost:5001/api/assets/${assetId}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      setSelectedAssets(new Set());
      setSelectAll(false);
      await loadAssets();
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('Failed to delete selected images');
    }
  };

  const batchDownloadSelected = () => {
    if (selectedAssets.size === 0) return;
    
    const selectedAssetsData = assets.filter(asset => selectedAssets.has(asset.id));
    selectedAssetsData.forEach(asset => {
      // Download original or first available variant
      const downloadUrl = asset.variants?.original?.url || asset.variants?.large?.url || asset.storage_path || asset.url;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${asset.name}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // Pagination functions
  const totalPages = Math.ceil(totalAssets / itemsPerPage);
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedAssets(new Set()); // Clear selection when changing pages
      setSelectAll(false);
    }
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  const tabs = [
    { id: 'library', name: 'Image Library', icon: '📚' },
    { id: 'upload', name: 'Upload Images', icon: '⬆️' },
    { id: 'generate', name: 'Generate Images', icon: '🎨' },
    { id: 'videos', name: 'Videos', icon: '🎥' },
    { id: 'storage', name: 'Storage', icon: '💾' }
  ];

  return (
    <div className="space-y-8">
      {/* Header - Clean like Calendar View */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Asset Management</h1>
        <p className="text-lg text-gray-600 mb-4">Upload, generate, and manage your assets with full control over processing options</p>
        
        {/* Project Badge - Simple like Calendar View */}
        <div className="inline-flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">{currentProject?.name || 'No Project Selected'}</span>
        </div>
      </div>

      {/* Tab Navigation - Like Screenshot 2 */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-md font-semibold transition-all flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Library Tab */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="text-sm font-semibold text-gray-700">Scope:</label>
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value as any)}
                  className="ml-2 px-3 py-2 border rounded-lg"
                >
                  <option value="project">Project</option>
                  <option value="user">My Library</option>
                  <option value="organization">Organization</option>
                </select>
              </div>
              
              {selectedScope === 'project' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Project:</label>
                  <select
                    value={selectedProjectFilter}
                    onChange={(e) => setSelectedProjectFilter(e.target.value)}
                    className="ml-2 px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Project</option>
                    {/* TODO: Load projects from API - remove hardcoded mock data */}
                  </select>
                </div>
              )}
              
              <button
                onClick={() => setActiveTab('upload')}
                className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
              >
                + Upload New Image
              </button>
            </div>
          </div>

          {/* Multi-select Controls */}
          {assets.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({selectedAssets.size} selected)
                    </span>
                  </label>
                  
                  {selectedAssets.size > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={batchDownloadSelected}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        📥 Download Selected
                      </button>
                      <button
                        onClick={batchDeleteSelected}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                      >
                        🗑️ Delete Selected
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-600">
                  Showing {assets.length} of {totalAssets} images
                </div>
              </div>
            </div>
          )}

          {/* Image Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="text-4xl mb-4 float">⏳</div>
                <p className="text-gray-600">Loading images...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4 float">🖼️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Images Found</h3>
                <p className="text-gray-600 mb-4">Upload your first image to get started!</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Upload Image
                </button>
              </div>
            ) : (
              assets.map((asset) => (
                <div key={asset.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all relative">
                  {/* Multi-select checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedAssets.has(asset.id)}
                      onChange={() => toggleAssetSelection(asset.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-white shadow-md"
                    />
                  </div>
                  
                  <div 
                    className="aspect-square bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openLightbox(asset)}
                  >
                    {asset.variants?.thumbnail ? (
                      <img
                        src={asset.variants.thumbnail.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={asset.variants?.original?.url || asset.storage_path || asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">{asset.name}</h3>
                    <p className="text-sm text-gray-600">
                      {asset.variants ? (
                        <button 
                          onClick={() => openVariantsModal(asset)}
                          className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          {Object.keys(asset.variants).length} variants
                        </button>
                      ) : (
                        'Single image'
                      )}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-500">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => deleteAsset(asset.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-xl p-4 shadow-lg mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} ({totalAssets} total images)
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-2 text-sm rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white'
                              : 'border hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload & Process Images</h2>
            
            <div className="space-y-6">
              {/* File Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    // Auto-populate custom name with original filename
                    if (file) {
                      setCustomFileName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors"
                />
              </div>

              {/* Custom File Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Custom File Name (Optional)
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder={selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "Enter custom name..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use original filename. Extension will be added automatically.
                </p>
              </div>

              {/* Processing Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Processing Options</h3>
                
                {/* Generate Variants */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="generateVariants"
                    checked={processingOptions.generateVariants}
                    onChange={(e) => setProcessingOptions(prev => ({ ...prev, generateVariants: e.target.checked }))}
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor="generateVariants" className="text-sm text-gray-700">
                    Generate multiple sizes (thumbnail, medium, large, original)
                  </label>
                </div>

                {/* Add Watermark */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="addWatermark"
                    checked={processingOptions.addWatermark}
                    onChange={(e) => setProcessingOptions(prev => ({ ...prev, addWatermark: e.target.checked }))}
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor="addWatermark" className="text-sm text-gray-700">
                    Add watermark overlay
                  </label>
                </div>

                {/* Brand Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Brand Filter
                  </label>
                  <select
                    value={processingOptions.brandFilter}
                    onChange={(e) => setProcessingOptions(prev => ({ ...prev, brandFilter: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="neutral">Neutral (No filter)</option>
                    <option value="vibrant">Vibrant</option>
                    <option value="muted">Muted</option>
                    <option value="warm">Warm</option>
                    <option value="cool">Cool</option>
                  </select>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || loading}
                className="w-full px-6 py-4 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? `${uploadStatus} (${uploadProgress}%)` : 'Upload & Process Image'}
              </button>

              {/* Progress Bar */}
              {loading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Tab - NEW: Using AI Abstraction Layer */}
      {activeTab === 'generate' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Image Generation</h2>
              <p className="text-gray-600 mb-8">
                Generate high-quality images using multiple AI providers including Midjourney and DALL-E.
                Choose from different models, styles, and options for the perfect image.
              </p>
            </div>
            
            <button
              onClick={() => setShowMediaPicker(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 px-8 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              ✨ Open AI Image Generator
            </button>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>✨ Multiple AI providers available</p>
              <p>🎨 Choose aspect ratio and quality</p>
              <p>⚡ Real-time progress tracking</p>
              <p>💾 Auto-saves to your library</p>
            </div>
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">🎥</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Video Management</h2>
              <p className="text-gray-600 mb-8">
                Upload, generate, and manage video content for your marketing campaigns.
                Support for multiple formats and AI-powered video generation.
              </p>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowMediaPicker(true)}
                className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
              >
                📤 Upload Videos
              </button>
              <button
                onClick={() => setShowMediaPicker(true)}
                className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
              >
                🎬 Generate Videos
              </button>
            </div>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>🎥 Multiple video formats supported</p>
              <p>✂️ Built-in video editing tools</p>
              <p>🤖 AI-powered video generation</p>
              <p>💾 Cloud storage integration</p>
            </div>
          </div>
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === 'storage' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">💾</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Storage Management</h2>
              <p className="text-gray-600 mb-8">
                Manage your asset library storage across all projects and organizations.
                Monitor usage, organize files, and optimize storage.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-gray-600">Images</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Videos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">2.4 MB</div>
                  <div className="text-sm text-gray-600">Total Size</div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setActiveTab('library')}
                className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
              >
                📚 View Library
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
              >
                🗂️ Organize Files
              </button>
            </div>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>📊 Real-time storage analytics</p>
              <p>🗑️ Bulk file management</p>
              <p>🔒 Secure cloud storage</p>
              <p>♻️ Automatic optimization</p>
            </div>
          </div>
        </div>
      )}

      {/* Variants Modal */}
      {showVariantsModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Image Variants: {selectedAsset.name}
              </h2>
              <button
                onClick={closeVariantsModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedAsset.variants && Object.entries(selectedAsset.variants).map(([variantType, variantData]) => (
                <div key={variantType} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold capitalize text-gray-900">
                      {variantType} Variant
                    </h3>
                    <span className="text-sm text-gray-500">
                      {variantData.width} × {variantData.height}
                    </span>
                  </div>
                  
                  {/* Variant Image */}
                  <div className="mb-4">
                    <img
                      src={variantData.url}
                      alt={`${variantType} variant`}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>

                  {/* Variant Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Size:</span>
                      <span className="font-medium">
                        {variantData.size ? `${(variantData.size / 1024).toFixed(1)} KB` : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium">{variantData.format?.toUpperCase() || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dimensions:</span>
                      <span className="font-medium">{variantData.width} × {variantData.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Path:</span>
                      <span className="font-medium text-xs truncate ml-2" title={variantData.path}>
                        {variantData.path}
                      </span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="mt-4">
                    <a
                      href={variantData.url}
                      download={`${selectedAsset.name}_${variantType}.${variantData.format || 'jpg'}`}
                      className="w-full inline-block text-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Download {variantType.charAt(0).toUpperCase() + variantType.slice(1)}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <strong>Total Variants:</strong> {selectedAsset.variants ? Object.keys(selectedAsset.variants).length : 0}
                </div>
                <button
                  onClick={closeVariantsModal}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MediaPicker Modal */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelectMedia={handleSelectMedia}
      />

      {/* Lightbox Modal */}
      {showLightbox && lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={closeLightbox}
        >
          <div 
            className="relative max-w-7xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Image */}
            <img
              src={lightboxImage.variants?.original?.url || lightboxImage.variants?.large?.url || lightboxImage.storage_path || lightboxImage.url}
              alt={lightboxImage.name}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Image info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">{lightboxImage.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Size:</span> {lightboxImage.variants?.original?.width || 'N/A'} × {lightboxImage.variants?.original?.height || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Format:</span> {lightboxImage.variants?.original?.format || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date(lightboxImage.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Scope:</span> {lightboxImage.scope}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Images;
