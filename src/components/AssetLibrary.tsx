import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import PromptRefinementModal from './PromptRefinementModal';
import api from '../services/api';

type Scope = 'project' | 'user' | 'organization';

interface Asset {
  id: string;
  scope: Scope;
  organization_id?: string;
  project_id?: string;
  owner_user_id?: string;
  file_name: string;
  mime_type?: string;
  width?: number;
  height?: number;
  storage_path: string;
  created_at: string;
  image_prompt?: string;
  variants?: {
    [key: string]: {
      url: string;
      width: number;
      height: number;
      size: number;
      format?: string;
      path?: string;
    };
  };
}

interface Props {
  projectId?: string | null;
  onClose?: () => void;
}

const API = api.getUrl('assets');

const AssetLibrary: React.FC<Props> = ({ projectId, onClose }) => {
  const { user, selectedOrganization } = useUser();
  const [activeScope, setActiveScope] = useState<Scope>('project');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [processingOptions, setProcessingOptions] = useState({
    generateVariants: true,
    addWatermark: false,
    brandFilter: 'neutral' as 'vibrant' | 'muted' | 'warm' | 'cool' | 'neutral'
  });
  
  // Prompt refinement modal state
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [selectedAssetForRefinement, setSelectedAssetForRefinement] = useState<Asset | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    q.set('scope', activeScope);
    if (activeScope === 'project' && projectId) q.set('project_id', projectId);
    if (activeScope === 'organization' && selectedOrganization) q.set('organization_id', selectedOrganization);
    if (activeScope === 'user' && user) q.set('owner_user_id', user.id);
    return q.toString();
  }, [activeScope, projectId, selectedOrganization, user]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?${query}`);
      const json = await res.json();
      setAssets(json.data || []);
    } catch (e) {
      console.error('Failed to load assets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [query]);

  const openVariantsModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowVariantsModal(true);
  };

  const closeVariantsModal = () => {
    setShowVariantsModal(false);
    setSelectedAsset(null);
  };

  // Handle prompt refinement
  const handleRefinePrompt = (asset: Asset) => {
    setSelectedAssetForRefinement(asset);
    setShowRefinementModal(true);
  };

  const handleRefinementClose = () => {
    setShowRefinementModal(false);
    setSelectedAssetForRefinement(null);
  };

  const handleImageGenerated = (imageUrl: string) => {
    // Update the asset with the new image URL
    if (selectedAssetForRefinement) {
      setAssets(prev => 
        prev.map(asset => 
          asset.id === selectedAssetForRefinement.id 
            ? { ...asset, storage_path: imageUrl }
            : asset
        )
      );
    }
  };

  const create = async () => {
    if (!newUrl || !newName) return;
    
    // Use custom name if provided, otherwise use newName
    const finalFileName = customFileName.trim() || newName;
    
    try {
      const payload: any = {
        scope: activeScope,
        storage_path: newUrl, // Required field for database
        file_name: finalFileName, // Database expects file_name
      };
      if (activeScope === 'project') payload.project_id = projectId;
      if (activeScope === 'organization') payload.organization_id = selectedOrganization;
      if (activeScope === 'user') payload.owner_user_id = user?.id;
      
      console.log('Creating asset with payload:', payload);
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      console.log('Create asset response:', json);
      
      if (json.success) {
        console.log('Asset created successfully');
        // Don't close modal or reset loading here - let upload function handle it
      } else {
        throw new Error(json.error || 'Failed to create asset');
      }
    } catch (e) {
      console.error('Create asset failed', e);
      throw e; // Re-throw so upload function can handle it
    }
  };

  const createFromUrl = async () => {
    if (!newUrl || !newName) return;
    setLoading(true);
    try {
      await create();
      await load(); // Reload the asset list
      setShowAdd(false); 
      setNewUrl(''); 
      setNewName('');
    } catch (e: any) {
      console.error('Create asset from URL failed', e);
      alert(`Failed to create asset: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    
    // Check file size (warn if > 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(`File is ${Math.round(file.size / 1024 / 1024)}MB. Large files may take longer to upload.`);
    }
    
    setLoading(true);
    setUploadProgress(0);
    setUploadStatus('Processing image...');
    
    try {
      // [2025-10-08] - Use new Sharp image processing endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scope', activeScope);
      formData.append('generateVariants', processingOptions.generateVariants.toString());
      formData.append('addWatermark', processingOptions.addWatermark.toString());
      formData.append('brandFilter', processingOptions.brandFilter);
      
      if (activeScope === 'project' && projectId) formData.append('project_id', projectId);
      if (activeScope === 'organization' && selectedOrganization) formData.append('organization_id', selectedOrganization);
      if (activeScope === 'user' && user) formData.append('owner_user_id', user.id);
      
      setUploadStatus('Processing image with Sharp...');
      setUploadProgress(20);
      
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for processing
      
      try {
        const uploadRes = await fetch(api.getUrl('uploads/process-image'), { 
          method: 'POST', 
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('Upload response status:', uploadRes.status);
        console.log('Upload response headers:', Object.fromEntries(uploadRes.headers.entries()));
        
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          console.error('Upload error response:', errorText);
          throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText} - ${errorText}`);
        }
        
        const responseJson = await uploadRes.json();
        console.log('Upload success response:', responseJson);
        
        if (!responseJson.success) {
          throw new Error(responseJson.error || 'Image processing failed');
        }
        
        setUploadStatus('Creating asset record...');
        setUploadProgress(70);
        
        // Use the original variant URL as the main URL
        const originalUrl = responseJson.data.variants?.original?.url || responseJson.data.variants?.large?.url;
        if (!originalUrl) {
          throw new Error('No image URL returned from processing');
        }
        
        // Use custom name if provided, otherwise use original filename
        const finalFileName = customFileName.trim() || file.name;
        
        // Set the URL and name for asset creation
        setNewUrl(originalUrl);
        setNewName(finalFileName);
        
        console.log('Creating asset with URL:', originalUrl, 'and name:', file.name);
        await create();
        console.log('Asset creation completed');
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Upload timeout - file may be too large or network too slow');
        }
        throw error;
      }
      
      setUploadStatus('Refreshing library...');
      setUploadProgress(90);
      
      // Reload the asset list to show the new image
      console.log('Reloading asset list...');
      await load();
      console.log('Asset list reloaded');
      
      setUploadStatus('Upload complete!');
      setUploadProgress(100);
      
      setFile(null);
      
      // Keep success state until user clicks Finish button
      // Don't auto-reset - let user control when to close
    } catch (e: any) {
      console.error('Upload failed', e);
      alert(`Upload failed: ${e.message}`);
      // Reset progress and status on error
      setUploadProgress(0);
      setUploadStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowAdd(false);
          if (onClose) onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Asset Library</h3>
          <div className="space-x-2">
            <button onClick={() => setShowAdd(true)} className="px-3 py-1 rounded bg-gradient-primary text-white">+ Add</button>
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200">Close</button>
          </div>
        </div>

        <div className="flex space-x-2 mb-4">
          {(['project','user','organization'] as Scope[]).map(s => (
            <button key={s} onClick={() => setActiveScope(s)} className={`px-3 py-1 rounded ${activeScope===s? 'bg-gradient-primary text-white':'bg-gray-100'}`}>
              {s === 'project' ? 'Project' : s === 'user' ? 'My Library' : 'Organization'}
            </button>
          ))}
        </div>

        {loading && <div className="text-gray-500">Loading…</div>}

        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-auto">
            {assets.map(a => (
              <div key={a.id} className="border rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-1">{a.file_name}</div>
                {/* naive preview for URLs */}
                <img src={a.storage_path} alt={a.file_name} className="w-full h-28 object-cover rounded" />
                <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                  <span>{a.scope}</span>
                  <div className="flex space-x-1">
                    {a.variants && Object.keys(a.variants).length > 0 && (
                      <button 
                        onClick={() => openVariantsModal(a)}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {Object.keys(a.variants).length} variants
                      </button>
                    )}
                    {/* Refine Image Prompt - Show if asset has an image prompt */}
                    {a.image_prompt && (
                      <button 
                        onClick={() => handleRefinePrompt(a)}
                        className="text-purple-600 hover:text-purple-800 underline"
                        title="Refine Image Prompt"
                      >
                        ✨ Refine
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="text-gray-500">No assets yet.</div>
            )}
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">Add Asset</h4>
                <button 
                  onClick={() => setShowAdd(false)} 
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-700">Upload File</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFile(file);
                      if (file) {
                        setCustomFileName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
                      }
                    }} 
                    className="mt-1" 
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    ✨ <strong>Enhanced Processing:</strong> Images are automatically optimized with Sharp, generating thumbnail, medium, large, and original variants.
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-700">Custom File Name (Optional)</label>
                  <input 
                    type="text" 
                    value={customFileName} 
                    onChange={(e) => setCustomFileName(e.target.value)} 
                    placeholder={file ? file.name.replace(/\.[^/.]+$/, "") : "Enter custom name..."} 
                    className="modern-input w-full mt-1" 
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    Leave empty to use original filename. Extension will be added automatically.
                  </div>
                </div>
                
                {/* Processing Options */}
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="text-sm font-semibold text-gray-700">Processing Options</h4>
                  
                  {/* Generate Variants */}
                  <div className="flex items-center space-x-2">
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
                  <div className="flex items-center space-x-2">
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
                    <label className="block text-sm text-gray-700 mb-1">Brand Filter:</label>
                    <select
                      value={processingOptions.brandFilter}
                      onChange={(e) => setProcessingOptions(prev => ({ ...prev, brandFilter: e.target.value as any }))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value="neutral">Neutral (No filter)</option>
                      <option value="vibrant">Vibrant</option>
                      <option value="muted">Muted</option>
                      <option value="warm">Warm</option>
                      <option value="cool">Cool</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Name</label>
                  <input value={newName} onChange={e=>setNewName(e.target.value)} className="modern-input w-full mt-1" placeholder="e.g., hero.jpg" />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Image URL</label>
                  <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} className="modern-input w-full mt-1" placeholder="https://..." />
                </div>
                {/* Upload Status Bar */}
                {loading && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">{uploadStatus}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-300" 
                        style={{width: `${uploadProgress}%`}}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button onClick={()=>setShowAdd(false)} className="px-3 py-1 rounded bg-gray-200">Cancel</button>
                    <button onClick={uploadFile} className="px-3 py-1 rounded bg-gradient-primary text-white" disabled={loading || !file}>
                      {loading ? 'Uploading...' : 'Upload'}
                    </button>
                    <button onClick={createFromUrl} className="px-3 py-1 rounded bg-gradient-primary text-white" disabled={loading || !newUrl || !newName}>Copy URL</button>
                  </div>
                  {!loading && uploadProgress === 100 && (
                    <button onClick={() => {
                      setShowAdd(false);
                      setUploadProgress(0);
                      setUploadStatus('');
                      setNewUrl('');
                      setNewName('');
                      setCustomFileName('');
                      setFile(null);
                    }} className="px-3 py-1 rounded bg-green-500 text-white font-semibold">
                      Finish ✓
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Variants Modal */}
      {showVariantsModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Image Variants: {selectedAsset.file_name}
              </h2>
              <button
                onClick={closeVariantsModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedAsset.variants && Object.entries(selectedAsset.variants).map(([variantType, variantData]) => {
                const variant = variantData as {
                  url: string;
                  width: number;
                  height: number;
                  size: number;
                  format?: string;
                  path?: string;
                };
                return (
                <div key={variantType} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold capitalize text-gray-900">
                      {variantType} Variant
                    </h3>
                    <span className="text-sm text-gray-500">
                      {variant.width} × {variant.height}
                    </span>
                  </div>
                  
                  {/* Variant Image */}
                  <div className="mb-4">
                    <img
                      src={variant.url}
                      alt={`${variantType} variant`}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>

                  {/* Variant Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Size:</span>
                      <span className="font-medium">
                        {variant.size ? `${(variant.size / 1024).toFixed(1)} KB` : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <span className="font-medium">{variant.format?.toUpperCase() || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dimensions:</span>
                      <span className="font-medium">{variant.width} × {variant.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Path:</span>
                      <span className="font-medium text-xs truncate ml-2" title={variant.path}>
                        {variant.path}
                      </span>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="mt-4">
                    <a
                      href={variant.url}
                      download={`${selectedAsset.file_name}_${variantType}.${variant.format || 'jpg'}`}
                      className="w-full inline-block text-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Download {variantType.charAt(0).toUpperCase() + variantType.slice(1)}
                    </a>
                  </div>
                </div>
                );
              })}
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

      {/* Prompt Refinement Modal */}
      {showRefinementModal && selectedAssetForRefinement && (
        <PromptRefinementModal
          isOpen={showRefinementModal}
          onClose={handleRefinementClose}
          originalPrompt={selectedAssetForRefinement.image_prompt || ''}
          onImageGenerated={handleImageGenerated}
          title="Refine Image Prompt"
          showOriginalImage={!!selectedAssetForRefinement.storage_path}
          originalImageUrl={selectedAssetForRefinement.storage_path}
        />
      )}
    </div>
  );
};

export default AssetLibrary;


