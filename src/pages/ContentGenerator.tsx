import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import EnhancedImagePromptField from '../components/EnhancedImagePromptField';
import RichTextEditor from '../components/RichTextEditor';
import { CalendarIcon, SparklesIcon, ArrowLeftIcon, DocumentArrowDownIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

interface ContentRequest {
  type: string;
  industry: string;
  topic: string;
  tone?: string;
  length?: string;
  postTypeId?: string;
  toneProfileId?: string;
}

interface PostType {
  id: string;
  name: string;
  description: string;
  purpose: string;
  target_audience: string;
  required_asset_type: string;
  tone: string;
  suggested_frequency: string;
  ai_instructions: string;
}

interface ToneProfile {
  tone_id: string;
  name: string;
  description: string;
  system_instruction: string;
  is_public: boolean;
  usage_count: number;
  owner_name?: string;
}

const ContentGenerator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedProject, projects } = useUser();
  
  // Get the current project object from the selected project ID
  const currentProject = projects.find(p => p.id === selectedProject);
  
  // Check for prefilled data from approved concept
  const prefilledData = location.state?.prefilledData;
  const source = location.state?.source;
  
  const [formData, setFormData] = useState<ContentRequest>({
    type: 'social_media_post',
    industry: 'restaurant',
    topic: prefilledData?.title || '',
    tone: 'professional',
    length: 'medium',
    postTypeId: '',
    toneProfileId: ''
  });
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [contentStatus, setContentStatus] = useState<'draft' | 'ready_to_publish' | 'published'>('draft');
  const [isContentEdited, setIsContentEdited] = useState<boolean>(false);
  const [isContentSaved, setIsContentSaved] = useState<boolean>(false);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [selectedPostType, setSelectedPostType] = useState<PostType | null>(null);
  const [toneProfiles, setToneProfiles] = useState<ToneProfile[]>([]);
  const [selectedToneProfile, setSelectedToneProfile] = useState<ToneProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'caption' | 'image' | 'video'>('caption');
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'generate' | 'asset'>('generate');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showAssetBrowser, setShowAssetBrowser] = useState<boolean>(false);
  const [selectedCaptionAsset, setSelectedCaptionAsset] = useState<any>(null); // NEW: For caption asset picker
  const [showCaptionAssetPicker, setShowCaptionAssetPicker] = useState<boolean>(false); // NEW
  const [assets, setAssets] = useState<any[]>([]); // NEW: Store available assets
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false); // NEW
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('Asia/Bangkok');
  const [platform, setPlatform] = useState<string>('instagram');
  const [autoPublish, setAutoPublish] = useState<boolean>(false);
  const { selectedClient, token } = useUser();

  const contentTypes = [
    { value: 'social_media_post', label: 'Social Media Post' },
    { value: 'email_campaign', label: 'Email Campaign' },
    { value: 'blog_post', label: 'Blog Post' },
    { value: 'ad_copy', label: 'Advertisement Copy' },
    { value: 'product_description', label: 'Product Description' }
  ];

  const industries = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'property', label: 'Property/Real Estate' },
    { value: 'agency', label: 'Marketing Agency' }
  ];

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'inspiring', label: 'Inspiring' }
  ];

  // Load existing draft if one exists for this concept
  useEffect(() => {
    const loadDraft = async () => {
      if (!prefilledData?.id || !token) return;

      try {
        console.log('📖 Loading saved draft for concept:', prefilledData.id);
        
        const response = await axios.get(
          api.getUrl(`posts/draft-by-concept/${prefilledData.id}`),
          {
            headers: api.getHeaders(token)
          }
        );

        if (response.data.success && response.data.draft) {
          const draft = response.data.draft;
          console.log('✅ Draft loaded:', draft);

          // Restore the saved draft
          setGeneratedContent(draft.content);
          setEditedContent(draft.content);
          setContentStatus(draft.status);
          setLastSaved(new Date(draft.updated_at));
          setIsContentSaved(true);
          setIsContentEdited(false);

          // Restore image prompt
          if (draft.image_prompt) {
            setImagePrompt(draft.image_prompt);
          }

          // Restore generated image
          if (draft.generated_image) {
            setGeneratedImage(draft.generated_image);
          }

          // Restore attached asset
          if (draft.attached_asset_id && draft.attached_asset_url) {
            setSelectedCaptionAsset({
              id: draft.attached_asset_id,
              url: draft.attached_asset_url,
              storage_path: draft.attached_asset_url,
              file_name: draft.asset_file_name,
              tags: draft.asset_tags
            });
          }
        } else {
          console.log('ℹ️ No saved draft found, using concept description');
          // No saved draft, use concept description as initial content
          if (prefilledData.description) {
            setGeneratedContent(prefilledData.description);
            setEditedContent(prefilledData.description);
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        // Fallback to concept description
        if (prefilledData.description) {
          setGeneratedContent(prefilledData.description);
          setEditedContent(prefilledData.description);
        }
      }
    };

    loadDraft();
  }, [prefilledData?.id, token]);

  // Handle prefilled data from approved concept
  useEffect(() => {
    if (prefilledData && source === 'approved_concept') {
      console.log('ContentGenerator: Loading prefilled data from approved concept:', prefilledData);
      
      // Prefill the form with concept data
      setFormData(prev => ({
        ...prev,
        topic: prefilledData.title,
        type: 'social_media_post' // Default to social media post
      }));
      
      // Set image prompt if available (will be overridden by draft if one exists)
      if (prefilledData.image_prompt) {
        setImagePrompt(prefilledData.image_prompt);
      }
    }
  }, [prefilledData, source]);

  // Load Tone Profiles when component mounts
  useEffect(() => {
    const loadToneProfiles = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get(
          api.getUrl('tone-profiles'),
          { headers: api.getHeaders(token) }
        );
        setToneProfiles(response.data.data || []);
      } catch (error) {
        console.error('Failed to load tone profiles:', error);
        setToneProfiles([]);
      }
    };

    loadToneProfiles();
  }, [token]);

  // Load Post Types when client is selected
  useEffect(() => {
    const loadPostTypes = async () => {
      if (!selectedClient) {
        setPostTypes([]);
        return;
      }
      
      try {
        // First get projects for the client
        const projectsResponse = await axios.get(
          api.getUrl(`clients/projects/client/${selectedClient}`),
          token ? { headers: api.getHeaders(token) } : undefined
        );
        
        const projects = projectsResponse.data.data || [];
        if (projects.length === 0) {
          setPostTypes([]);
          return;
        }
        
        // Get post types for the first project (or could be made selectable)
        const projectId = projects[0].id;
        const postTypesResponse = await axios.get(
          api.getUrl(`playbook/recipes/${projectId}`)
        );
        
        setPostTypes(postTypesResponse.data.data || []);
      } catch (error) {
        console.error('Failed to load post types:', error);
        setPostTypes([]);
      }
    };

    loadPostTypes();
  }, [selectedClient, token]);

  // Handle URL parameters for pre-filling form from content ideas
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const topic = searchParams.get('topic');
    const postType = searchParams.get('postType');
    const priority = searchParams.get('priority');
    const suggestedDate = searchParams.get('suggestedDate');
    const suggestedTime = searchParams.get('suggestedTime');

    if (title || description || topic) {
      // Use title as topic if no topic provided, or combine title and description
      const combinedTopic = topic || (title && description ? `${title} - ${description}` : title || description || '');
      
      setFormData(prev => ({
        ...prev,
        topic: combinedTopic,
        // Map priority to tone if available
        tone: priority === 'high' ? 'urgent' : priority === 'low' ? 'casual' : 'professional',
        // Map priority to length
        length: priority === 'high' ? 'long' : priority === 'low' ? 'short' : 'medium'
      }));

      // If we have a post type name, try to find the matching post type
      if (postType && postTypes.length > 0) {
        const matchingPostType = postTypes.find(pt => pt.name === postType);
        if (matchingPostType) {
          setFormData(prev => ({
            ...prev,
            postTypeId: matchingPostType.id
          }));
          setSelectedPostType(matchingPostType);
        }
      }
    }
  }, [location.search, postTypes]);

  // Handle pre-filled data from calendar "No content" click
  useEffect(() => {
    const prefillData = location.state?.prefillData;
    if (prefillData) {
      console.log('Prefilling ContentGenerator with data:', prefillData);
      
      setFormData(prev => ({
        ...prev,
        industry: prefillData.industry || prev.industry,
        topic: prefillData.topic || prev.topic,
        tone: prefillData.tone || prev.tone,
        length: prefillData.length || prev.length
      }));

      // Set the image prompt with client context
      if (prefillData.clientName && prefillData.projectName) {
        setImagePrompt(`Professional content for ${prefillData.clientName} - ${prefillData.projectName} project`);
      }
    }
  }, [location.state]);

  // Load assets for the project
  useEffect(() => {
    const loadAssets = async () => {
      if (!currentProject?.id || !token) return;
      
      setLoadingAssets(true);
      try {
        const response = await axios.get(
          api.getUrl(`assets?project_id=${currentProject.id}&scope=project&limit=100`),
          {
            headers: api.getHeaders(token)
          }
        );
        
        if (response.data.success && response.data.data) {
          setAssets(response.data.data);
          console.log('📸 Loaded assets:', response.data.data.length);
        }
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        setLoadingAssets(false);
      }
    };

    loadAssets();
  }, [currentProject?.id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setGeneratedContent('');

    // Set image generation state if we're on the image tab
    if (activeTab === 'image') {
      setIsGeneratingImage(true);
    }

    try {
      const response = await fetch(api.getUrl('/content/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedContent(data.content);
        setEditedContent(data.content); // Initialize edited content with generated content
        
        // Increment tone profile usage count if one was selected
        if (formData.toneProfileId && token) {
          try {
            await axios.post(
              api.getUrl(`/tone-profiles/${formData.toneProfileId}/increment-usage`),
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (usageError) {
            console.error('Failed to increment tone profile usage:', usageError);
            // Don't show error to user, this is non-critical
          }
        }
      } else {
        setError(data.error || 'Failed to generate content');
      }
    } catch (err) {
      setError('Failed to connect to the API. Please check if the backend is running.');
      console.error('Content generation error:', err);
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePostTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const postTypeId = e.target.value;
    const postType = postTypes.find(pt => pt.id === postTypeId);
    
    setFormData(prev => ({
      ...prev,
      postTypeId,
      tone: postType?.tone || prev.tone
    }));
    setSelectedPostType(postType || null);
  };

  const handleToneProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const toneProfileId = e.target.value;
    const toneProfile = toneProfiles.find(tp => tp.tone_id === toneProfileId);
    
    setFormData(prev => ({
      ...prev,
      toneProfileId
    }));
    setSelectedToneProfile(toneProfile || null);
  };

  // AI Prompt Enhancement for Image Generation
  const handleEnhancePrompt = async () => {
    if (!imagePrompt.trim()) {
      alert('Please enter a basic idea first');
      return;
    }

    setIsEnhancingPrompt(true);
    try {
      const response = await fetch(api.getUrl('/content/enhance-prompt'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          type: 'image',
          model: 'midjourney'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setImagePrompt(data.enhancedPrompt);
      } else {
        alert('Failed to enhance prompt: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Prompt enhancement error:', error);
      alert('Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Save content functions
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setError('');

    try {
      const contentToSave = editedContent || generatedContent;
      const requestBody = {
        concept_id: prefilledData?.id,
        project_id: currentProject?.id,
        title: prefilledData?.title || formData.topic,
        content: contentToSave,
        content_type: prefilledData?.content_type || 'social_media_post',
        status: 'draft',
        image_prompt: imagePrompt,
        generated_image: generatedImage,
        attached_asset_id: selectedCaptionAsset?.id,
        attached_asset_url: selectedCaptionAsset?.url || selectedCaptionAsset?.storage_path,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        timezone,
        platform,
        auto_publish: autoPublish
      };
      console.log('📤 Frontend sending save-draft request:', requestBody);
      const response = await axios.post(
        api.getUrl('/posts/save-draft'),
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setLastSaved(new Date());
        setContentStatus('draft');
        setIsContentSaved(true);
        setIsContentEdited(false);
        console.log('✅ Draft saved successfully');
      } else {
        setError(response.data.error || 'Failed to save draft');
      }
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setError(err.response?.data?.error || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsReady = async () => {
    setIsSaving(true);
    setError('');

    try {
      const contentToSave = editedContent || generatedContent;
      const requestBody = {
        concept_id: prefilledData?.id,
        project_id: currentProject?.id,
        title: prefilledData?.title || formData.topic,
        content: contentToSave,
        content_type: prefilledData?.content_type || 'social_media_post',
        status: 'ready_to_publish',
        image_prompt: imagePrompt,
        generated_image: generatedImage,
        attached_asset_id: selectedCaptionAsset?.id,
        attached_asset_url: selectedCaptionAsset?.url || selectedCaptionAsset?.storage_path,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        timezone,
        platform,
        auto_publish: autoPublish
      };
      console.log('📤 Frontend sending mark-as-ready request:', requestBody);
      const response = await axios.post(
        api.getUrl('/posts/save-draft'),
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setLastSaved(new Date());
        setContentStatus('ready_to_publish');
        setIsContentSaved(true);
        setIsContentEdited(false);
        console.log('✅ Content marked as ready for publish');
      } else {
        setError(response.data.error || 'Failed to mark as ready');
      }
    } catch (err: any) {
      console.error('Error marking as ready:', err);
      setError(err.response?.data?.error || 'Failed to mark as ready');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    // Re-run the AI generation
    await handleSubmit(new Event('submit') as any);
  };

  const handleAutoSave = async (content: string) => {
    try {
      await axios.post(
        api.getUrl('/posts/auto-save'),
        {
          concept_id: prefilledData?.id,
          project_id: currentProject?.id,
          content: content,
          image_prompt: imagePrompt
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      console.log('Auto-save failed (non-critical):', err);
    }
  };

  // Auto-save on navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isContentEdited && !isContentSaved) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        // Auto-save before leaving
        handleAutoSave(editedContent || generatedContent);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isContentEdited, isContentSaved, editedContent, generatedContent]);

  return (
    <div className="space-y-8">
      {/* Concept Banner - Show when working on approved concept */}
      {source === 'approved_concept' && prefilledData && (
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SparklesIcon className="h-5 w-5 text-purple-600" />
              <div>
                <h3 className="font-semibold text-purple-800">Working on: {prefilledData.title}</h3>
                <p className="text-sm text-purple-700">
                  {prefilledData.client_name} • {prefilledData.project_name}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/content-list')}
              className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="text-sm">Back to Concepts</span>
            </button>
          </div>
        </div>
      )}

      {/* Ready to Generate Screen for Prefilled Concepts */}
      {source === 'approved_concept' && prefilledData && !generatedContent && (
        <div className="text-center py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to Generate Content</h2>
            <p className="text-lg text-gray-600 mb-8">
              We've prefilled all the details for <strong>{prefilledData.title}</strong>. 
              Click the button below to generate AI-powered content.
            </p>
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-800 mb-3">Generation Settings:</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div><strong>Topic:</strong> {prefilledData.title}</div>
                <div><strong>Client:</strong> {prefilledData.client_name}</div>
                <div><strong>Project:</strong> {prefilledData.project_name}</div>
                <div><strong>Type:</strong> {prefilledData.content_type}</div>
                {prefilledData.description && (
                  <div><strong>Description:</strong> {prefilledData.description}</div>
                )}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="btn-modern text-lg px-8 py-4 hover-lift disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Generating Content...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-6 w-6 mr-3" />
                  Generate Content
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="text-center">
        <h1 className="text-5xl font-bold gradient-text text-shadow mb-4">Content Generator</h1>
        <p className="text-xl text-gray-600">
          Create AI-powered content for your marketing campaigns
        </p>
        
        
        {/* Pre-filled form indicator */}
        {location.search && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-green-600">✨</span>
              <span className="text-green-800 font-medium">
                Form pre-filled from content idea
              </span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Topic and settings have been automatically populated from your selected content idea
            </p>
          </div>
        )}
      </div>

      {/* Content Type Tabs - Above both columns */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('caption')}
            className={`flex-1 py-3 px-6 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'caption'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 Caption
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-3 px-6 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'image'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🖼️ Image
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-3 px-6 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'video'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🎥 Video
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="modern-card hover-lift">
          <div className="px-8 py-8">
            <h3 className="text-2xl font-bold gradient-text mb-8 text-center">
              {activeTab === 'caption' 
                ? '🎯 Caption Parameters'
                : activeTab === 'image'
                ? '🖼️ Image Parameters'
                : '🎥 Video Parameters'
              }
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Prefill banner */}
              {location.state?.prefillData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">
                        Pre-filled from Calendar
                      </h4>
                      <p className="text-sm text-blue-600 mt-1">
                        Content for <strong>{location.state.prefillData.clientName}</strong> on{' '}
                        <strong>{new Date(location.state.prefillData.suggestedDate).toLocaleDateString()}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show different fields based on active tab */}
              {activeTab === 'caption' && (
                <>
              <div>
                <label htmlFor="postTypeId" className="block text-sm font-semibold text-gray-700 mb-2">
                  🧩 Post Type (Optional)
                </label>
                <select
                  id="postTypeId"
                  name="postTypeId"
                  value={formData.postTypeId}
                  onChange={handlePostTypeChange}
                  className="modern-select w-full"
                >
                  <option value="">Select a Post Type...</option>
                  {postTypes.map((postType) => (
                    <option key={postType.id} value={postType.id}>
                      {postType.name}
                    </option>
                  ))}
                </select>
                {selectedPostType && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <div className="font-medium">{selectedPostType.purpose}</div>
                      <div className="text-xs text-blue-600 mt-1">
                        Tone: {selectedPostType.tone} | Target: {selectedPostType.target_audience}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="toneProfileId" className="block text-sm font-semibold text-gray-700 mb-2">
                  🎭 Tone Profile (Optional)
                </label>
                <select
                  id="toneProfileId"
                  name="toneProfileId"
                  value={formData.toneProfileId}
                  onChange={handleToneProfileChange}
                  className="modern-select w-full"
                >
                  <option value="">Select a Tone Profile...</option>
                  {toneProfiles.map((profile) => (
                    <option key={profile.tone_id} value={profile.tone_id}>
                      {profile.name} {profile.is_public ? '(Public)' : '(Private)'}
                    </option>
                  ))}
                </select>
                {selectedToneProfile && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm text-purple-800">
                      <div className="font-medium">{selectedToneProfile.description}</div>
                      <div className="text-xs text-purple-600 mt-1">
                        Used {selectedToneProfile.usage_count} times
                        {selectedToneProfile.owner_name && ` | By: ${selectedToneProfile.owner_name}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Content Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="modern-select w-full"
                >
                  {contentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-semibold text-gray-700 mb-2">
                  🏢 Industry
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="modern-select w-full"
                >
                  {industries.map((industry) => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="topic" className="block text-sm font-semibold text-gray-700 mb-2">
                      💡 Caption Topic/Subject
                </label>
                <textarea
                  id="topic"
                  name="topic"
                  rows={4}
                  value={formData.topic}
                  onChange={handleInputChange}
                  placeholder="e.g., New lunch specials, Property listing features, Holiday promotion..."
                  className="modern-textarea w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="tone" className="block text-sm font-semibold text-gray-700 mb-2">
                    🎭 Tone
                  </label>
                  <select
                    id="tone"
                    name="tone"
                    value={formData.tone}
                    onChange={handleInputChange}
                    className="modern-select w-full"
                  >
                    {tones.map((tone) => (
                      <option key={tone.value} value={tone.value}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="length" className="block text-sm font-semibold text-gray-700 mb-2">
                    📏 Length
                  </label>
                  <select
                    id="length"
                    name="length"
                    value={formData.length}
                    onChange={handleInputChange}
                    className="modern-select w-full"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
              </div>
                </>
              )}

              {activeTab === 'image' && (
                <>
                  {/* Choose Source */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                      📚 Choose Source
                    </label>
                    <div className="space-y-3">
                      <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="generate-new"
                            name="imageSource"
                            value="generate"
                            checked={imageSource === 'generate'}
                            onChange={(e) => setImageSource(e.target.value as 'generate' | 'asset')}
                            className="mr-3 text-indigo-600"
                          />
                          <label htmlFor="generate-new" className="flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900">🎨 Generate New Image</div>
                            <div className="text-sm text-gray-600">Create a brand new image using AI</div>
                          </label>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="use-asset"
                            name="imageSource"
                            value="asset"
                            checked={imageSource === 'asset'}
                            onChange={(e) => setImageSource(e.target.value as 'generate' | 'asset')}
                            className="mr-3 text-blue-600"
                          />
                          <label htmlFor="use-asset" className="flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900">📚 Use Existing Asset</div>
                            <div className="text-sm text-gray-600">Select from your asset library</div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asset Browser - Show when asset source is selected */}
                  {imageSource === 'asset' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-4">
                        🖼️ Select Asset
                      </label>
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        {selectedAsset ? (
                          <div className="flex items-center space-x-4">
                            <img 
                              src={selectedAsset.url} 
                              alt={selectedAsset.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{selectedAsset.name}</div>
                              <div className="text-sm text-gray-600">{selectedAsset.type}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAssetBrowser(true)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">📚</div>
                            <p className="text-gray-600 mb-4">No asset selected</p>
                            <button
                              type="button"
                              onClick={() => setShowAssetBrowser(true)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Browse Assets
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Model Selection - Only show when generating new */}
                  {imageSource === 'generate' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-4">
                        🌱 AI Model
                      </label>
                      <div className="space-y-3">
                        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="midjourney"
                              name="aiModel"
                              value="midjourney"
                              className="mr-3 text-purple-600"
                              defaultChecked
                            />
                            <label htmlFor="midjourney" className="flex-1 cursor-pointer">
                              <div className="font-medium text-gray-900">Apiframe (Midjourney v6)</div>
                              <div className="text-sm text-gray-600">High-quality artistic image generation powered by Midjourney v6</div>
                              <div className="text-xs text-gray-500 mt-1">Estimated time: ~60s</div>
                            </label>
                          </div>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="dalle2"
                              name="aiModel"
                              value="dalle2"
                              className="mr-3 text-blue-600"
                            />
                            <label htmlFor="dalle2" className="flex-1 cursor-pointer">
                              <div className="font-medium text-gray-900">OpenAI DALL-E 2</div>
                              <div className="text-sm text-gray-600">Affordable image generation from OpenAI. Good for quick iterations.</div>
                              <div className="text-xs text-gray-500 mt-1">Estimated time: BYOK ~10s</div>
                            </label>
                          </div>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="dalle3"
                              name="aiModel"
                              value="dalle3"
                              className="mr-3 text-blue-600"
                            />
                            <label htmlFor="dalle3" className="flex-1 cursor-pointer">
                              <div className="font-medium text-gray-900">OpenAI DALL-E 3</div>
                              <div className="text-sm text-gray-600">Fast, reliable image generation from OpenAI. Supports BYOK.</div>
                              <div className="text-xs text-gray-500 mt-1">Estimated time: BYOK ~15s</div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Description/Prompt - Only show when generating new */}
                  {imageSource === 'generate' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          ✨ Describe the image you want to create
                        </label>
                        <button
                          type="button"
                          onClick={handleEnhancePrompt}
                          disabled={isEnhancingPrompt}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {isEnhancingPrompt ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                              <span>Enhancing...</span>
                            </>
                          ) : (
                            <>
                              <span>🤖</span>
                              <span>AI Enhance</span>
                            </>
                          )}
                        </button>
                      </div>
                      <EnhancedImagePromptField
                        value={imagePrompt}
                        onChange={setImagePrompt}
                        placeholder="E.g., A modern office space with plants and natural lighting, professional photography style..."
                        label=""
                        projectId={currentProject?.id}
                        showSavedPrompts={true}
                        showRefinementButton={true}
                        onImageGenerated={(imageUrl: string) => {
                          setGeneratedImage(imageUrl);
                          setIsGeneratingImage(false);
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Tip: Enter a basic idea and click "AI Enhance" to get a professional Midjourney-style prompt
                      </p>
                    </div>
                  )}

                  {/* Image Style - Only show when generating new */}
                  {imageSource === 'generate' && (
                    <div>
                      <label htmlFor="imageStyle" className="block text-sm font-semibold text-gray-700 mb-2">
                        🎨 Image Style
                      </label>
                      <select
                        id="imageStyle"
                        name="imageStyle"
                        className="modern-select w-full"
                      >
                        <option value="photorealistic">Photorealistic</option>
                        <option value="illustration">Illustration</option>
                        <option value="artistic">Artistic</option>
                        <option value="minimalist">Minimalist</option>
                        <option value="vintage">Vintage</option>
                      </select>
                    </div>
                  )}

                  {/* Aspect Ratio - Only show when generating new */}
                  {imageSource === 'generate' && (
                    <div>
                      <label htmlFor="aspectRatio" className="block text-sm font-semibold text-gray-700 mb-2">
                        📐 Aspect Ratio
                      </label>
                      <select
                        id="aspectRatio"
                        name="aspectRatio"
                        className="modern-select w-full"
                      >
                        <option value="1:1">Square (1:1)</option>
                        <option value="16:9">Landscape (16:9)</option>
                        <option value="9:16">Portrait (9:16)</option>
                        <option value="4:3">Standard (4:3)</option>
                        <option value="3:4">Vertical (3:4)</option>
                      </select>
                    </div>
                  )}

                  {/* Quality - Only show when generating new */}
                  {imageSource === 'generate' && (
                    <div>
                      <label htmlFor="quality" className="block text-sm font-semibold text-gray-700 mb-2">
                        ⭐ Quality
                      </label>
                      <select
                        id="quality"
                        name="quality"
                        className="modern-select w-full"
                      >
                        <option value="standard">Standard</option>
                        <option value="high">High</option>
                        <option value="vivid">Vivid</option>
                      </select>
                    </div>
                  )}

                  {/* Negative Prompt - Only show when generating new */}
                  {imageSource === 'generate' && (
                    <div>
                      <label htmlFor="negativePrompt" className="block text-sm font-semibold text-gray-700 mb-2">
                        🚫 Negative Prompt (Optional)
                      </label>
                      <textarea
                        id="negativePrompt"
                        name="negativePrompt"
                        rows={3}
                        className="modern-textarea w-full"
                        placeholder="e.g., blurry, low quality, distorted"
                      />
                    </div>
                  )}

                  {/* Advanced Options - Only show when generating new */}
                  {imageSource === 'generate' && (
                    <div>
                      <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <span className="font-semibold text-gray-700">⚙️ Advanced Options</span>
                          <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              🎭 Style
                            </label>
                            <select className="modern-select w-full">
                              <option value="photorealistic">Photorealistic</option>
                              <option value="artistic">Artistic</option>
                              <option value="minimalist">Minimalist</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              🎲 Chaos (randomness): <span className="text-gray-500">0</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              defaultValue="0"
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              🎨 Stylize: <span className="text-gray-500">100</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1000"
                              defaultValue="100"
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              🔢 Version
                            </label>
                            <select className="modern-select w-full">
                              <option value="v6">v6</option>
                              <option value="v5">v5</option>
                              <option value="v4">v4</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              📈 Upscale
                            </label>
                            <select className="modern-select w-full">
                              <option value="none">None</option>
                              <option value="2x">2x</option>
                              <option value="4x">4x</option>
                            </select>
                          </div>
                          
                          <div className="pt-2">
                            <button
                              type="button"
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              Reset to defaults
                            </button>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Create Complete Post Button */}
                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={isLoading || (imageSource === 'asset' && !selectedAsset)}
                      className="btn-modern w-full text-lg py-4 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="loading-spinner mr-3"></div>
                          Creating Post...
                        </>
                      ) : (
                        '🎯 Create Complete Post'
                      )}
                    </button>
                  </div>

                </>
              )}

              {activeTab === 'video' && (
                <div>
                  <label htmlFor="videoType" className="block text-sm font-semibold text-gray-700 mb-2">
                    🎬 Video Type
                  </label>
                  <select
                    id="videoType"
                    name="videoType"
                    className="modern-select w-full"
                  >
                    <option value="short-form">Short Form (15-60s)</option>
                    <option value="story">Story (15s)</option>
                    <option value="reel">Reel (30-90s)</option>
                    <option value="tutorial">Tutorial (2-5min)</option>
                    <option value="behind-scenes">Behind the Scenes</option>
                  </select>
                </div>
              )}


              <button
                type="submit"
                disabled={isLoading}
                className="btn-modern w-full text-lg py-4 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner mr-3"></div>
                    Generating Magic...
                  </>
                ) : (
                  activeTab === 'caption' 
                    ? '✨ Generate Caption'
                    : activeTab === 'image'
                    ? '🖼️ Generate Image'
                    : '🎥 Generate Video'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Generated Content */}
        <div className="modern-card hover-lift">
          <div className="px-8 py-8">
            <h3 className="text-2xl font-bold gradient-text mb-8 text-center">
              {activeTab === 'caption' 
                ? '✨ Generated Caption'
                : activeTab === 'image'
                ? '🖼️ Generated Image'
                : '🎥 Generated Video'
              }
            </h3>
            
            {error && (
              <div className="error-message mb-6">
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            {generatedContent ? (
              <div className="space-y-6">
                {activeTab === 'caption' && (
                  <div className="space-y-4">
                <div className="glass rounded-xl p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Generated Caption</h3>
                        <RichTextEditor
                          value={editedContent || generatedContent}
                          onChange={(content) => {
                            setEditedContent(content);
                            setIsContentEdited(content !== generatedContent);
                            setIsContentSaved(false);
                          }}
                          placeholder="Edit the generated content..."
                          autoSave={true}
                          onAutoSave={handleAutoSave}
                          className="min-h-[200px]"
                          originalValue={generatedContent}
                          isEdited={isContentEdited}
                          isSaved={isContentSaved}
                        />
                </div>
                    </div>

                    {/* Image Asset Picker */}
                    <div className="glass rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Attach Image</h3>
                        {selectedCaptionAsset && (
                  <button 
                            onClick={() => setSelectedCaptionAsset(null)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            ❌ Remove
                          </button>
                        )}
                      </div>

                      {selectedCaptionAsset ? (
                        <div className="relative">
                          <img
                            src={selectedCaptionAsset.url || selectedCaptionAsset.storage_path}
                            alt={selectedCaptionAsset.file_name || 'Selected asset'}
                            className="w-full h-auto rounded-lg border border-gray-200"
                          />
                          <div className="mt-2 text-sm text-gray-600">
                            <strong>{selectedCaptionAsset.file_name}</strong>
                            {selectedCaptionAsset.tags && Array.isArray(selectedCaptionAsset.tags) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedCaptionAsset.tags.map((tag: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={() => setShowCaptionAssetPicker(!showCaptionAssetPicker)}
                            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600"
                          >
                            {showCaptionAssetPicker ? '🔼 Hide Assets' : '🖼️ Choose from Asset Library'}
                          </button>

                          {showCaptionAssetPicker && (
                            <div className="mt-4 max-h-96 overflow-y-auto">
                              {loadingAssets ? (
                                <div className="text-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                  <p className="text-gray-600">Loading assets...</p>
                                </div>
                              ) : assets.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3">
                                  {assets.map((asset) => (
                                    <div
                                      key={asset.id}
                                      onClick={() => {
                                        setSelectedCaptionAsset(asset);
                                        setShowCaptionAssetPicker(false);
                                      }}
                                      className="cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all"
                                    >
                                      <img
                                        src={asset.url || asset.storage_path}
                                        alt={asset.file_name}
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="p-2 bg-white">
                                        <p className="text-xs font-medium text-gray-800 truncate">
                                          {asset.file_name}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                  <p className="text-gray-600">No assets available</p>
                                  <p className="text-sm text-gray-500 mt-1">Upload assets to the Asset Library first</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {activeTab === 'image' && (
                  <div className="glass rounded-xl p-6">
                    {isGeneratingImage ? (
                      <div className="space-y-6">
                        {/* Progress Indicator */}
                        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">🎨</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">Generating...</h4>
                              <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: '6%' }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-gray-600">Estimated time: ~60 seconds</span>
                                <span className="text-sm font-medium text-blue-600">6%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Generating Status */}
                        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 border border-purple-200">
                          <div className="flex items-center justify-center space-x-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span className="text-white font-medium">Generating with AI...</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-6xl mb-4">🖼️</div>
                        <p className="text-gray-600 mb-4">Generated image will appear here</p>
                        <div className="bg-gray-100 rounded-lg p-8 border-2 border-dashed border-gray-300">
                          <p className="text-gray-500">Image placeholder</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'video' && (
                  <div className="glass rounded-xl p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎥</div>
                      <p className="text-gray-600 mb-4">Generated video will appear here</p>
                      <div className="bg-gray-100 rounded-lg p-8 border-2 border-dashed border-gray-300">
                        <p className="text-gray-500">Video placeholder</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Status indicator */}
                  {contentStatus === 'ready_to_publish' && (
                    <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircleIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Ready for Publish</span>
                    </div>
                  )}

                  {/* Scheduling Section */}
                  <div className="glass rounded-xl p-5 border border-purple-100">
                    <div className="flex items-center space-x-2 mb-4">
                      <CalendarIcon className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">Schedule Post</h3>
                    </div>

                    <div className="space-y-4">
                      {/* Date and Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            📅 Date
                          </label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ⏰ Time
                          </label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Timezone and Platform */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            🌍 Timezone
                          </label>
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
                            <option value="America/New_York">New York (UTC-5)</option>
                            <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
                            <option value="Europe/London">London (UTC+0)</option>
                            <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                            <option value="Australia/Sydney">Sydney (UTC+11)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            📱 Platform
                          </label>
                          <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="twitter">Twitter/X</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="tiktok">TikTok</option>
                          </select>
                        </div>
                      </div>

                      {/* Auto-publish Toggle */}
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">🚀 Auto-Publish</span>
                          <span className="text-xs text-gray-500">(Publish automatically at scheduled time)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAutoPublish(!autoPublish)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                            autoPublish ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              autoPublish ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Scheduled Info Display */}
                      {(scheduledDate || scheduledTime) && (
                        <div className="text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
                          📅 Scheduled for: {scheduledDate || 'No date'} at {scheduledTime || 'No time'} ({timezone}) • Platform: {platform}
                          {autoPublish && ' • Will auto-publish ✓'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => navigator.clipboard.writeText(editedContent || generatedContent)}
                    className="btn-modern-secondary flex-1 hover-lift"
                  >
                    📄 Copy to Clipboard
                  </button>
                    <button 
                      onClick={handleRegenerate}
                      disabled={isLoading}
                      className="btn-modern-secondary flex-1 hover-lift disabled:opacity-50"
                    >
                      <ArrowPathIcon className="h-4 w-4 inline mr-2" />
                      Regenerate
                  </button>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button 
                      onClick={handleSaveDraft}
                      disabled={isSaving}
                      className="btn-modern-secondary flex-1 hover-lift disabled:opacity-50"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 inline mr-2" />
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button 
                      onClick={handleMarkAsReady}
                      disabled={isSaving}
                      className="btn-modern flex-1 hover-lift disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4 inline mr-2" />
                      {isSaving ? 'Saving...' : 'Mark as Ready'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-8xl mb-6 float">
                  {activeTab === 'caption' && '📄'}
                  {activeTab === 'image' && '🖼️'}
                  {activeTab === 'video' && '🎥'}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {activeTab === 'caption' && 'No caption generated yet'}
                  {activeTab === 'image' && 'No image generated yet'}
                  {activeTab === 'video' && 'No video generated yet'}
                </h3>
                <p className="mt-2 text-gray-600">
                  {activeTab === 'caption' && 'Fill out the form and click "Generate Caption" to create amazing captions!'}
                  {activeTab === 'image' && 'Fill out the form and click "Generate Image" to create amazing images!'}
                  {activeTab === 'video' && 'Fill out the form and click "Generate Video" to create amazing videos!'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentGenerator;
