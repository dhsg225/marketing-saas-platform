import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReportOptionsModal from '../components/ReportOptionsModal';
import PromptRefinementModal from '../components/PromptRefinementModal';
import api from '../services/api';
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  PaperClipIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  Bars3Icon,
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
  CloudArrowUpIcon,
  ServerIcon,
  SparklesIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface ContentListItem {
  id: string;
  title: string;
  description?: string;
  content_type: string;
  stage: 'ideas' | 'in_progress' | 'assets_attached' | 'ready_to_publish' | 'published';
  assigned_user_id?: string;
  assigned_user_name?: string;
  created_by: string;
  created_by_name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  suggested_date?: string;
  suggested_time?: string;
  content_text?: string;
  media_attachments?: any[];
  created_at: string;
  updated_at: string;
  stage_order: number;
  // Approval status fields
  status?: string;
  approval_status?: 'approved' | 'unapproved';
  approved_at?: string;
  post_type_name?: string;
  post_type_color?: string;
  // Image fields
  image_prompt?: string;
  full_visual_url?: string;
}

interface GroupedContent {
  ideas: ContentListItem[];
  concept_approved: ContentListItem[];
  in_development: ContentListItem[];
  ready_to_publish: ContentListItem[];
  published: ContentListItem[];
}

type ContentTab = 'ideas' | 'images' | 'videos' | 'upload' | 'storage';

const ContentList: React.FC = () => {
  const { selectedProject, projects, token, setSelectedProject } = useUser();
  const currentProject = projects.find(p => p.id === selectedProject);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ContentTab>('ideas');
  const [contentItems, setContentItems] = useState<GroupedContent>({
    ideas: [],
    concept_approved: [],
    in_development: [],
    ready_to_publish: [],
    published: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    content_type: 'post',
    priority: 'medium',
    assigned_user_id: '',
    due_date: ''
  });
  const [draggedItem, setDraggedItem] = useState<ContentListItem | null>(null);
  const [filters, setFilters] = useState({
    assigned_user: 'all',
    content_type: 'all',
    approval_status: 'all' // New filter for approval status
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentListItem | null>(null);
  const [editMode, setEditMode] = useState<'full' | 'date' | null>(null);
  const [editForm, setEditForm] = useState({
    suggested_date: '',
    suggested_time: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Prompt refinement modal state
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [selectedItemForRefinement, setSelectedItemForRefinement] = useState<ContentListItem | null>(null);

  // Tab configurations
  const tabs = [
    {
      key: 'ideas' as ContentTab,
      title: 'Content Ideas',
      icon: '💡',
      description: 'Manage your content development workflow'
    },
    {
      key: 'images' as ContentTab,
      title: 'Images',
      icon: '🖼️',
      description: 'Upload, generate, and manage your images'
    },
    {
      key: 'videos' as ContentTab,
      title: 'Videos',
      icon: '🎥',
      description: 'Create and organize video content'
    },
    {
      key: 'upload' as ContentTab,
      title: 'Upload',
      icon: '📤',
      description: 'Upload new assets and media files'
    },
    {
      key: 'storage' as ContentTab,
      title: 'Storage',
      icon: '💾',
      description: 'Manage your asset library and storage'
    }
  ];

  // Stage configurations - Updated for Two-Stage Approval Workflow
  const stages = [
    {
      key: 'ideas',
      title: 'Ideas',
      description: 'Raw concepts, unapproved',
      color: 'bg-gray-100',
      textColor: 'text-gray-700',
      icon: '💡'
    },
    {
      key: 'concept_approved',
      title: 'Concept Approved',
      description: 'Client approved the topic/concept',
      color: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '✅'
    },
    {
      key: 'in_development',
      title: 'In Development',
      description: 'Adding images, refining caption, finalizing content',
      color: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      icon: '⚡'
    },
    {
      key: 'ready_to_publish',
      title: 'Ready to Publish',
      description: 'Client approved final content for publishing',
      color: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '🎯'
    },
    {
      key: 'published',
      title: 'Published',
      description: 'Actually published to social media',
      color: 'bg-purple-100',
      textColor: 'text-purple-700',
      icon: '🚀'
    }
  ];

  // Load content items
  const loadContentItems = async () => {
    if (!currentProject || !token) {
      console.log('ContentList: Missing currentProject or token', { currentProject: !!currentProject, token: !!token });
      return;
    }
    
    try {
      setLoading(true);
      console.log('ContentList: Loading content items for project:', currentProject.id, 'with filter:', filters.approval_status);
      
      // Build query parameters for filtering
      const params = new URLSearchParams();
      if (filters.approval_status !== 'all') {
        params.append('status_filter', filters.approval_status);
      }
      
      const url = api.getUrl(`content-list/project/${currentProject.id}?${params.toString()}`);
      console.log('ContentList: Making API call to:', url);
      
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      
      console.log('ContentList: API response:', response.data);
      
      if (response.data.success) {
        setContentItems(response.data.data);
        console.log('ContentList: Set content items:', response.data.data);
      } else {
        console.error('ContentList: API returned success: false', response.data);
        setError(response.data.error || 'Failed to load content items');
      }
    } catch (error) {
      console.error('ContentList: Error loading content items:', error);
      setError('Failed to load content items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContentItems();
  }, [selectedProject, filters.approval_status, token]); // Reload when approval status filter or token changes

  // Toggle section collapse
  const toggleSection = (stageKey: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(stageKey)) {
      newCollapsed.delete(stageKey);
    } else {
      newCollapsed.add(stageKey);
    }
    setCollapsedSections(newCollapsed);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get content type icon
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝';
      case 'video': return '🎥';
      case 'ad': return '📢';
      case 'blog': return '📄';
      case 'email': return '📧';
      case 'story': return '📖';
      case 'reel': return '🎬';
      default: return '📄';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: ContentListItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.stage === targetStage) {
      setDraggedItem(null);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(
        api.getUrl(`content-list/${draggedItem.id}/move`),
        { new_stage: targetStage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reload content items
      await loadContentItems();
    } catch (error) {
      console.error('Error moving item:', error);
      setError('Failed to move content item');
    } finally {
      setDraggedItem(null);
    }
  };

  // Filter content items
  const getFilteredItems = (items: ContentListItem[] | undefined) => {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    return items.filter(item => {
      if (filters.assigned_user !== 'all' && item.assigned_user_id !== filters.assigned_user) {
        return false;
      }
      if (filters.content_type !== 'all' && item.content_type !== filters.content_type) {
        return false;
      }
      return true;
    });
  };

  // Generate content from approved concept
  const handleGenerateContent = (item: ContentListItem) => {
    // Prepare the concept data to pass to Content Generator
    const conceptData = {
      id: item.id,
      title: item.title,
      description: item.description || '',
      content_type: item.content_type,
      post_type_name: item.post_type_name,
      post_type_color: item.post_type_color,
      project_id: currentProject?.id,
      project_name: currentProject?.name,
      client_name: currentProject?.client_name,
      assigned_user_id: item.assigned_user_id,
      assigned_user_name: item.assigned_user_name,
      priority: item.priority,
      due_date: item.due_date
    };

    // Navigate to Content Generator with prefilled data
    navigate('/generate', { 
      state: { 
        prefilledData: conceptData,
        source: 'approved_concept'
      } 
    });
  };

  // Create new content item
  const handleCreateContent = async () => {
    if (!newContent.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
          api.getUrl('content-list'),
        {
          ...newContent,
          project_id: currentProject?.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setShowAddModal(false);
        setNewContent({
          title: '',
          description: '',
          content_type: 'post',
          priority: 'medium',
          assigned_user_id: '',
          due_date: ''
        });
        await loadContentItems();
      }
    } catch (error) {
      console.error('Error creating content item:', error);
      setError('Failed to create content item');
    }
  };

  // Edit content item - open full edit modal
  const handleEditItem = (item: ContentListItem) => {
    setEditingItem(item);
    setEditMode('full');
    setEditForm({
      suggested_date: item.suggested_date ? item.suggested_date.split('T')[0] : (item.due_date ? item.due_date.split('T')[0] : ''),
      suggested_time: item.suggested_time || ''
    });
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Edit date only - open date edit modal
  const handleEditDate = (item: ContentListItem) => {
    setEditingItem(item);
    setEditMode('date');
    setEditForm({
      suggested_date: item.suggested_date ? item.suggested_date.split('T')[0] : (item.due_date ? item.due_date.split('T')[0] : ''),
      suggested_time: item.suggested_time || ''
    });
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Save edit changes
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.put(
        api.getUrl(`content-ideas/${editingItem.id}`),
        {
          suggested_date: editForm.suggested_date,
          suggested_time: editForm.suggested_time
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update the local state - find and update the item in any stage
        setContentItems(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(stage => {
            updated[stage as keyof GroupedContent] = updated[stage as keyof GroupedContent].map((item: ContentListItem) =>
              item.id === editingItem.id
                ? { 
                    ...item, 
                    due_date: editForm.suggested_date,
                    suggested_date: editForm.suggested_date,
                    suggested_time: editForm.suggested_time
                  }
                : item
            );
          });
          return updated;
        });
        
        setSaveSuccess(true);
        
        // Close modal after a brief success message
        setTimeout(() => {
          setEditingItem(null);
          setEditMode(null);
          setEditForm({ suggested_date: '', suggested_time: '' });
          setSaveSuccess(false);
          
          // Trigger calendar refresh by reloading content
          loadContentItems();
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating content idea:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditMode(null);
    setEditForm({ suggested_date: '', suggested_time: '' });
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Handle prompt refinement
  const handleRefinePrompt = (item: ContentListItem) => {
    setSelectedItemForRefinement(item);
    setShowRefinementModal(true);
  };

  const handleRefinementClose = () => {
    setShowRefinementModal(false);
    setSelectedItemForRefinement(null);
  };

  const handleImageGenerated = (imageUrl: string) => {
    // Update the item with the new image URL
    if (selectedItemForRefinement) {
      setContentItems(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(stage => {
          updated[stage as keyof GroupedContent] = updated[stage as keyof GroupedContent].map((item: ContentListItem) =>
            item.id === selectedItemForRefinement.id
              ? { ...item, full_visual_url: imageUrl }
              : item
          );
        });
        return updated;
      });
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'ideas':
        return renderIdeasTab();
      case 'images':
        return renderImagesTab();
      case 'videos':
        return renderVideosTab();
      case 'upload':
        return renderUploadTab();
      case 'storage':
        return renderStorageTab();
      default:
        return renderIdeasTab();
    }
  };

  // Render Ideas tab (existing workflow)
  const renderIdeasTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Status
            </label>
            <select
              value={filters.approval_status}
              onChange={(e) => setFilters(prev => ({ ...prev, approval_status: e.target.value }))}
              className="modern-select"
            >
              <option value="all">All Ideas</option>
              <option value="approved">Approved Only</option>
              <option value="unapproved">Unapproved Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned User
            </label>
            <select
              value={filters.assigned_user}
              onChange={(e) => setFilters(prev => ({ ...prev, assigned_user: e.target.value }))}
              className="modern-select"
            >
              <option value="all">All Users</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <select
              value={filters.content_type}
              onChange={(e) => setFilters(prev => ({ ...prev, content_type: e.target.value }))}
              className="modern-select"
            >
              <option value="all">All Types</option>
              <option value="post">Post</option>
              <option value="video">Video</option>
              <option value="ad">Ad</option>
              <option value="blog">Blog</option>
              <option value="email">Email</option>
              <option value="story">Story</option>
              <option value="reel">Reel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Stages */}
      {stages.map((stage) => {
        const items = getFilteredItems(contentItems[stage.key as keyof GroupedContent]);
        const isCollapsed = collapsedSections.has(stage.key);
        
        return (
          <div
            key={stage.key}
            className="bg-white rounded-lg shadow-sm border border-gray-200"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            {/* Stage Header */}
            <div
              className={`${stage.color} ${stage.textColor} p-4 rounded-t-lg cursor-pointer`}
              onClick={() => toggleSection(stage.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isCollapsed ? (
                    <ChevronRightIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                  <span className="text-2xl">{stage.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{stage.title}</h3>
                    <p className="text-sm opacity-80">{stage.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="bg-white bg-opacity-50 px-3 py-1 rounded-full text-sm font-medium">
                    {items.length} items
                  </span>
                  {/* Approval Status Counts - Updated for Two-Stage Approval */}
                  {stage.key === 'ideas' && items.length > 0 && (
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const conceptApprovedCount = items.filter(item => item.status === 'concept_approved').length;
                        const publishApprovedCount = items.filter(item => item.status === 'ready_to_publish' || item.status === 'published').length;
                        const pendingCount = items.filter(item => item.status === 'draft' || !item.status).length;
                        return (
                          <>
                            {conceptApprovedCount > 0 && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                {conceptApprovedCount} concept approved
                              </span>
                            )}
                            {publishApprovedCount > 0 && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                {publishApprovedCount} publish approved
                              </span>
                            )}
                            {pendingCount > 0 && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                {pendingCount} pending
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stage Content */}
            {!isCollapsed && (
              <div className="p-4">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">{stage.icon}</div>
                    <p>No content in this stage</p>
                    <p className="text-sm">Drag items here or create new content</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-move"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-lg">{getContentTypeIcon(item.content_type)}</span>
                              <h4 className="font-semibold text-gray-900">{item.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </span>
                              {/* Approval Status Indicator - Updated for Two-Stage Approval */}
                              {item.status && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'concept_approved' 
                                    ? 'bg-blue-100 text-blue-800'
                                    : item.status === 'ready_to_publish' || item.status === 'published'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.status === 'concept_approved' ? '✅ Concept Approved' : 
                                   item.status === 'ready_to_publish' ? '🎯 Ready to Publish' :
                                   item.status === 'published' ? '🚀 Published' :
                                   item.status === 'in_development' ? '⚡ In Development' :
                                   '⏳ Pending'}
                                </span>
                              )}
                              {/* Post Type Indicator */}
                              {item.post_type_name && (
                                <span 
                                  className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: item.post_type_color || '#6366f1' }}
                                >
                                  {item.post_type_name}
                                </span>
                              )}
                            </div>
                            
                            {item.description && (
                              <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {item.assigned_user_name && (
                                <div className="flex items-center space-x-1">
                                  <UserIcon className="h-4 w-4" />
                                  <span>{item.assigned_user_name}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="h-4 w-4" />
                                <span>Created {formatDate(item.created_at)}</span>
                              </div>
                              {item.approved_at && (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>Approved {formatDate(item.approved_at)}</span>
                                </div>
                              )}
                              {item.suggested_date && (
                                <div className="flex items-center space-x-1 text-blue-600">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>
                                    Scheduled {formatDate(item.suggested_date)}
                                    {item.suggested_time && ` at ${item.suggested_time}`}
                                  </span>
                                </div>
                              )}
                              {item.media_attachments && item.media_attachments.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <PaperClipIcon className="h-4 w-4" />
                                  <span>{item.media_attachments.length} attachments</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            {/* Generate Content Icon - Only show for approved concepts */}
                            {(item.status === 'concept_approved' || item.status === 'approved') && (
                              <button 
                                onClick={() => handleGenerateContent(item)}
                                className="p-2 text-purple-500 hover:text-purple-700 transition-colors relative group"
                                title="Generate Content from this approved concept"
                              >
                                <SparklesIcon className="h-4 w-4" />
                                {/* Glowing effect for approved concepts */}
                                <div className="absolute inset-0 rounded-full bg-purple-100 opacity-0 group-hover:opacity-50 transition-opacity"></div>
                              </button>
                            )}
                            {/* Refine Image Prompt - Show if item has an image prompt */}
                            {item.image_prompt && (
                              <button 
                                onClick={() => handleRefinePrompt(item)}
                                className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                                title="Refine Image Prompt"
                              >
                                <SparklesIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditDate(item)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Schedule this content"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditItem(item)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Edit all content details"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                              <Bars3Icon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render Images tab
  const renderImagesTab = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="text-center py-12">
        <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Image Management</h3>
        <p className="text-gray-500 mb-6">Upload, generate, and manage your images with full control over processing options.</p>
        <div className="flex justify-center space-x-4">
          <button className="btn-modern flex items-center space-x-2">
            <CloudArrowUpIcon className="h-5 w-5" />
            <span>Upload Images</span>
          </button>
          <button className="btn-modern flex items-center space-x-2">
            <PhotoIcon className="h-5 w-5" />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render Videos tab
  const renderVideosTab = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="text-center py-12">
        <VideoCameraIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Video Management</h3>
        <p className="text-gray-500 mb-6">Create and organize video content for your marketing campaigns.</p>
        <div className="flex justify-center space-x-4">
          <button className="btn-modern flex items-center space-x-2">
            <CloudArrowUpIcon className="h-5 w-5" />
            <span>Upload Videos</span>
          </button>
          <button className="btn-modern flex items-center space-x-2">
            <VideoCameraIcon className="h-5 w-5" />
            <span>Create Video</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render Upload tab
  const renderUploadTab = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="text-center py-12">
        <CloudArrowUpIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Assets</h3>
        <p className="text-gray-500 mb-6">Upload new assets and media files to your project library.</p>
        <div className="flex justify-center space-x-4">
          <button className="btn-modern flex items-center space-x-2">
            <CloudArrowUpIcon className="h-5 w-5" />
            <span>Upload Files</span>
          </button>
          <button className="btn-modern flex items-center space-x-2">
            <PhotoIcon className="h-5 w-5" />
            <span>Bulk Upload</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render Storage tab
  const renderStorageTab = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="text-center py-12">
        <ServerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Asset Storage</h3>
        <p className="text-gray-500 mb-6">Manage your asset library and storage usage across all projects.</p>
        <div className="flex justify-center space-x-4">
          <button className="btn-modern flex items-center space-x-2">
            <ServerIcon className="h-5 w-5" />
            <span>View Library</span>
          </button>
          <button className="btn-modern flex items-center space-x-2">
            <TagIcon className="h-5 w-5" />
            <span>Organize Assets</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-600">Please select a project to view the content list.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Clean like Calendar View */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Content List</h1>
          <p className="text-lg text-gray-600 mb-4">Manage and organize your content across all stages</p>
          
          {/* Project Badge + Quick Switcher and Generate Report Button */}
          <div className="flex items-center justify-center space-x-4">
            <div className="inline-flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{currentProject.name}</span>
              <select
                className="modern-select ml-3"
                value={currentProject.id}
                onChange={(e) => {
                  const projectId = e.target.value;
                  // Persist via context wrapper which writes to localStorage
                  setSelectedProject(projectId);
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all text-sm"
            >
              📄 Generate Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        {renderTabContent()}

        {/* Add Content Modal - Only show for Ideas tab */}
        {showAddModal && activeTab === 'ideas' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Add New Content</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newContent.title}
                    onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                    className="modern-input w-full"
                    placeholder="Enter content title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newContent.description}
                    onChange={(e) => setNewContent(prev => ({ ...prev, description: e.target.value }))}
                    className="modern-textarea w-full"
                    rows={3}
                    placeholder="Enter content description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content Type
                    </label>
                    <select
                      value={newContent.content_type}
                      onChange={(e) => setNewContent(prev => ({ ...prev, content_type: e.target.value }))}
                      className="modern-select w-full"
                    >
                      <option value="post">Post</option>
                      <option value="video">Video</option>
                      <option value="ad">Ad</option>
                      <option value="blog">Blog</option>
                      <option value="email">Email</option>
                      <option value="story">Story</option>
                      <option value="reel">Reel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={newContent.priority}
                      onChange={(e) => setNewContent(prev => ({ ...prev, priority: e.target.value }))}
                      className="modern-select w-full"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newContent.due_date}
                    onChange={(e) => setNewContent(prev => ({ ...prev, due_date: e.target.value }))}
                    className="modern-input w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateContent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Content
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Edit Content Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editMode === 'date' ? 'Schedule Content' : 'Edit Content'}
                  </h3>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>{editingItem.title}</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    {editingItem.description}
                  </p>
                </div>

                {/* Success/Error Messages */}
                {saveSuccess && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    ✅ Date updated successfully! Calendar will refresh automatically.
                  </div>
                )}
                
                {saveError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    ❌ {saveError}
                  </div>
                )}

                <div className="space-y-4">
                  {editMode === 'date' ? (
                    // Date-only edit mode
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Publication Date *
                        </label>
                        <input
                          type="date"
                          value={editForm.suggested_date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, suggested_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Publication Time (Optional)
                        </label>
                        <input
                          type="time"
                          value={editForm.suggested_time}
                          onChange={(e) => setEditForm(prev => ({ ...prev, suggested_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  ) : (
                    // Full edit mode - placeholder for future implementation
                    <div className="text-center py-8 text-gray-500">
                      <PencilIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Full edit mode coming soon!</p>
                      <p className="text-sm">Use the calendar icon for date scheduling.</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {editMode === 'date' && (
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editForm.suggested_date || isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Schedule</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Refinement Modal */}
        {showRefinementModal && selectedItemForRefinement && (
          <PromptRefinementModal
            isOpen={showRefinementModal}
            onClose={handleRefinementClose}
            originalPrompt={selectedItemForRefinement.image_prompt || ''}
            postId={selectedItemForRefinement.id}
            contentIdeaId={selectedItemForRefinement.id}
            onImageGenerated={handleImageGenerated}
            title="Refine Image Prompt"
            showOriginalImage={!!selectedItemForRefinement.full_visual_url}
            originalImageUrl={selectedItemForRefinement.full_visual_url}
          />
        )}

      </div>
    </div>
  );
};

export default ContentList;