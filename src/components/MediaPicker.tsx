import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (mediaUrl: string) => void;
}

interface Asset {
  id: number;
  file_name: string;
  storage_path: string;
  cdn_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface AIModel {
  modelId: string;
  providerName: string;
  modelType: string;
  description: string;
  apiKeyType: string;
  estimatedTime: number;
  costPerGeneration: number;
}

interface GenerationJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedTime?: number;
}

const MediaPicker: React.FC<MediaPickerProps> = ({ isOpen, onClose, onSelectMedia }) => {
  const { token, user, selectedOrganization, selectedProject } = useUser();
  const [activeTab, setActiveTab] = useState<'library' | 'generate' | 'upload'>('library');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // AI Generation states - NEW: Using abstraction layer
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOptions, setAiOptions] = useState({
    aspectRatio: '1:1',
    quality: 'standard',
    negativePrompt: ''
  });
  const [generating, setGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<GenerationJob | null>(null);
  
  // Advanced options states
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState<any>({});

  // Get provider-specific advanced options
  const getProviderAdvancedOptions = (modelId: string) => {
    if (modelId.includes('apiframe')) {
      return {
        style: { type: 'select', options: ['photorealistic', 'anime', 'oil-painting', 'digital-art', 'sketch'], default: 'photorealistic', label: 'Style' },
        chaos: { type: 'slider', min: 0, max: 100, default: 0, label: 'Chaos (randomness)' },
        stylize: { type: 'slider', min: 0, max: 1000, default: 100, label: 'Stylize' },
        version: { type: 'select', options: ['v6', 'v6.1'], default: 'v6', label: 'Version' },
        upscale: { type: 'select', options: ['none', 'light', 'beta'], default: 'none', label: 'Upscale' }
      };
    } else if (modelId.includes('dalle')) {
      return {
        style: { type: 'select', options: ['vivid', 'natural'], default: 'vivid', label: 'Style' },
        size: { type: 'select', options: ['1024x1024', '1792x1024', '1024x1792'], default: '1024x1024', label: 'Size' },
        response_format: { type: 'select', options: ['url', 'b64_json'], default: 'url', label: 'Response Format' }
      };
    }
    return {};
  };

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load AI models when generate tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'generate' && availableModels.length === 0) {
      loadAIModels();
    }
  }, [isOpen, activeTab]);

  // Load assets when library tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      loadAssets();
    }
  }, [isOpen, activeTab]);

  // Reset advanced options when model changes
  useEffect(() => {
    if (selectedModel) {
      setAdvancedOptions({});
      setShowAdvancedOptions(false);
    }
  }, [selectedModel]);

  const loadAIModels = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/ai/models?type=image');
      if (response.data.success) {
        setAvailableModels(response.data.models);
        // Set default model to first available
        if (response.data.models.length > 0) {
          setSelectedModel(response.data.models[0].modelId);
        }
      }
    } catch (error) {
      console.error('Failed to load AI models:', error);
    }
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5001/api/assets', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { limit: 50 }
      });
      setAssets(response.data.assets || []);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || !selectedModel) return;

    setGenerating(true);
    try {
      // Step 1: Initiate generation using abstraction layer
      const response = await axios.post(
        'http://localhost:5001/api/ai/generate',
        { 
          modelId: selectedModel,
          prompt: aiPrompt,
          options: {
            // Common options
            aspectRatio: aiOptions.aspectRatio,
            quality: aiOptions.quality,
            negativePrompt: aiOptions.negativePrompt || undefined,
            // Advanced options (provider-specific)
            ...advancedOptions
          }
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      
      if (response.data.success) {
        const job: GenerationJob = {
          jobId: response.data.jobId,
          status: response.data.status,
          progress: 0,
          estimatedTime: response.data.estimatedTime
        };
        
        setCurrentJob(job);
        
        // Step 2: Poll for completion
        pollJobStatus(job.jobId);
      }
    } catch (error: any) {
      console.error('Failed to initiate generation:', error);
      alert('Failed to start generation: ' + (error.response?.data?.message || error.message));
      setGenerating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/ai/status/${jobId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        
        const { status, progress } = response.data;
        
        setCurrentJob(prev => prev ? { ...prev, status, progress } : null);
        
        if (status === 'completed') {
          clearInterval(pollInterval);
          await handleGenerationComplete(jobId);
        } else if (status === 'failed') {
          clearInterval(pollInterval);
          alert('Generation failed. Please try again.');
          setGenerating(false);
          setCurrentJob(null);
        }
      } catch (error) {
        console.error('Status check failed:', error);
        clearInterval(pollInterval);
        setGenerating(false);
        setCurrentJob(null);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleGenerationComplete = async (jobId: string) => {
    try {
      // Step 3: Fetch results
      const response = await axios.get(
        `http://localhost:5001/api/ai/results/${jobId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      
      if (response.data.success && response.data.assets.length > 0) {
        const assets = response.data.assets;
        
        // Auto-save all generated images to the asset library
        console.log(`🎨 Auto-saving ${assets.length} generated image(s) to asset library...`);
        
        const savePromises = assets.map(async (asset: any, index: number) => {
          const assetData = {
            file_name: `AI Generated ${index + 1} - ${aiPrompt.substring(0, 30)}...`,
            storage_path: asset.url,
            url: asset.url, // Add main URL field for compatibility
            scope: 'project', // Default to project scope
            project_id: selectedProject,
            organization_id: selectedOrganization,
            owner_user_id: user?.id,
            variants: {
              original: {
                url: asset.url,
                width: asset.metadata?.width || 1024,
                height: asset.metadata?.height || 1024,
                format: asset.metadata?.format || 'png',
                size: 0 // We don't have size info from AI providers
              }
            },
            metadata: {
              ...asset.metadata,
              aiGenerated: true,
              provider: asset.metadata?.provider || 'unknown',
              prompt: aiPrompt,
              generatedAt: new Date().toISOString()
            }
          };
          
          try {
            const saveResponse = await axios.post(
              'http://localhost:5001/api/assets',
              assetData,
              { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );
            
            if (saveResponse.data.success) {
              console.log(`✅ Saved AI generated image ${index + 1} to asset library`);
              return saveResponse.data.asset;
            } else {
              console.error(`❌ Failed to save AI generated image ${index + 1}:`, saveResponse.data.error);
              return null;
            }
          } catch (error: any) {
            console.error(`❌ Error saving AI generated image ${index + 1}:`, error.message);
            return null;
          }
        });
        
        // Wait for all saves to complete
        const savedAssets = await Promise.all(savePromises);
        const successfulSaves = savedAssets.filter(asset => asset !== null);
        
        alert(`🎨 Image generation complete! ${successfulSaves.length} of ${assets.length} image(s) saved to your asset library.`);
        
        // Auto-select the first generated image
        const firstAsset = assets[0];
        onSelectMedia(firstAsset.url);
        
        // Reset form
        setAiPrompt('');
        setCurrentJob(null);
        setGenerating(false);
        
        // Refresh library to show the new assets
        loadAssets();
        
        // Close modal after successful generation
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to fetch results:', error);
      alert('Failed to retrieve results: ' + (error.response?.data?.message || error.message));
      setGenerating(false);
      setCurrentJob(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        'http://localhost:5001/api/uploads/direct',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      if (response.data.success) {
        alert('File uploaded successfully!');
        setSelectedFile(null);
        setActiveTab('library');
        loadAssets();
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAsset = () => {
    if (selectedAsset && selectedAsset.cdn_url) {
      onSelectMedia(selectedAsset.cdn_url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🖼️ Add Media</h2>
            <p className="text-sm text-gray-600 mt-1">Choose from library, generate with AI, or upload new media</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'library'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📚 Library
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'generate'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ✨ Generate with AI
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'upload'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ⬆️ Upload & Manipulate
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          
          {/* Library Tab */}
          {activeTab === 'library' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📂</div>
                  <p className="text-gray-600 mb-4">No images in your library yet</p>
                  <p className="text-sm text-gray-500">Upload or generate images to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        selectedAsset?.id === asset.id
                          ? 'border-purple-500 shadow-lg scale-105'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <img
                          src={asset.cdn_url}
                          alt={asset.file_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-xs font-medium text-gray-900 truncate">{asset.file_name}</p>
                        <p className="text-xs text-gray-500">{(asset.file_size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generate Tab - NEW: Using AI Abstraction Layer */}
          {activeTab === 'generate' && (
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleGenerateImage} className="space-y-6">
                
                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    🤖 AI Model
                  </label>
                  {availableModels.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-yellow-800">Loading AI models...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {availableModels.map((model) => (
                        <label
                          key={model.modelId}
                          className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                            selectedModel === model.modelId
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="aiModel"
                            value={model.modelId}
                            checked={selectedModel === model.modelId}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="mt-1 w-4 h-4 text-purple-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900">{model.providerName}</h3>
                              <div className="flex items-center gap-2">
                                {model.apiKeyType === 'user_specific' && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    BYOK
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">~{model.estimatedTime}s</span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{model.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prompt Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    ✨ Describe the image you want to create
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={5}
                    placeholder="E.g., A modern office space with plants and natural lighting, professional photography style..."
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Tip: Be specific about style, mood, colors, and composition for best results
                  </p>
                </div>

                {/* Generation Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      value={aiOptions.aspectRatio}
                      onChange={(e) => setAiOptions({ ...aiOptions, aspectRatio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="1:1">Square (1:1)</option>
                      <option value="16:9">Landscape (16:9)</option>
                      <option value="9:16">Portrait (9:16)</option>
                      <option value="4:3">Standard (4:3)</option>
                      <option value="3:4">Tall (3:4)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality
                    </label>
                    <select
                      value={aiOptions.quality}
                      onChange={(e) => setAiOptions({ ...aiOptions, quality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="standard">Standard</option>
                      <option value="hd">High Definition</option>
                    </select>
                  </div>
                </div>

                {/* Negative Prompt (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negative Prompt (Optional)
                  </label>
                  <input
                    type="text"
                    value={aiOptions.negativePrompt}
                    onChange={(e) => setAiOptions({ ...aiOptions, negativePrompt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="E.g., blurry, low quality, distorted"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Describe what you don't want in the image
                  </p>
                </div>

                {/* Advanced Options Toggle */}
                <div className="border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <svg className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Advanced Options
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedModel && getProviderAdvancedOptions(selectedModel) ? 'Provider-specific' : 'None available'}
                    </span>
                  </button>
                </div>

                {/* Advanced Options Panel */}
                {showAdvancedOptions && selectedModel && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h4 className="text-sm font-medium text-gray-800">
                        {selectedModel.includes('apiframe') ? 'Apiframe/Midjourney Options' : 
                         selectedModel.includes('dalle') ? 'DALL-E Options' : 'Advanced Options'}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(getProviderAdvancedOptions(selectedModel)).map(([key, option]: [string, any]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {option.label}
                          </label>
                          
                          {option.type === 'select' ? (
                            <select
                              value={advancedOptions[key] || option.default}
                              onChange={(e) => setAdvancedOptions({ ...advancedOptions, [key]: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            >
                              {option.options.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : option.type === 'slider' ? (
                            <div className="space-y-1">
                              <input
                                type="range"
                                min={option.min}
                                max={option.max}
                                value={advancedOptions[key] || option.default}
                                onChange={(e) => setAdvancedOptions({ ...advancedOptions, [key]: parseInt(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{option.min}</span>
                                <span className="font-medium">{advancedOptions[key] || option.default}</span>
                                <span>{option.max}</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setAdvancedOptions({});
                          setShowAdvancedOptions(false);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Indicator */}
                {currentJob && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        {currentJob.status === 'pending' && '⏳ Queued...'}
                        {currentJob.status === 'processing' && '🎨 Generating...'}
                        {currentJob.status === 'completed' && '✅ Complete!'}
                      </span>
                      <span className="text-sm text-blue-700">{currentJob.progress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${currentJob.progress}%` }}
                      ></div>
                    </div>
                    {currentJob.estimatedTime && (
                      <p className="text-xs text-blue-600 mt-2">
                        Estimated time: ~{currentJob.estimatedTime} seconds
                      </p>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={generating || !aiPrompt.trim() || !selectedModel}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating with AI...
                    </span>
                  ) : (
                    '✨ Generate Image'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    ⬆️ Select a file to upload
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <div className="text-6xl mb-4">📁</div>
                      <p className="text-gray-700 font-medium mb-2">
                        Click to select a file
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </label>
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-600">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </span>
                  ) : (
                    '⬆️ Upload File'
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          {activeTab === 'library' && (
            <button
              onClick={handleSelectAsset}
              disabled={!selectedAsset}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Select Image
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default MediaPicker;

