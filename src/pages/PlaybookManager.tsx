import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import AssetLibrary from '../components/AssetLibrary';
import ReferenceDocuments from '../components/ReferenceDocuments';
import ManualDistribution from '../components/ManualDistribution';
import ClientCollaboration from '../components/ClientCollaboration';
import api from '../services/api';

interface ContentIdea {
  id: string;
  project_id: string;
  post_type_id: string;
  title: string;
  description?: string;
  topic_keywords?: string[];
  suggested_date?: string;
  suggested_time?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  generated_content_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  post_type_name?: string;
  post_type_purpose?: string;
  post_type_tone?: string;
  post_type_color?: string;
  created_by_name?: string;
  approved_by_name?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  industry: string;
  status: string;
}

interface Hashtag {
  id: string;
  hashtag: string;
  is_favorite: boolean;
  usage_count: number;
}

interface ContentRecipe {
  id: string;
  name: string;
  description: string;
  purpose: string;
  target_audience: string;
  required_asset_type: string;
  tone: string;
  suggested_frequency: string;
  ai_instructions: string;
  color?: string;
}

interface ContentStrategy {
  strategy_id: string;
  project_id: string;
  strategy_name: string;
  strategy_description: string;
  post_type_mix_targets: Record<string, number>;
  status: 'draft' | 'active' | 'archived' | 'review';
  tone_id?: string;
  created_at: string;
  updated_at: string;
}

interface ChannelTemplate {
  id: string;
  channel: string;
  template_name: string;
  formatting_rules: any;
  example_output: string;
  is_default: boolean;
}

interface SignatureBlock {
  id: string;
  project_id: string;
  name: string;
  type: 'contact' | 'disclaimer' | 'social' | 'cta' | 'custom';
  content: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PlaybookManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'projects' | 'hashtags' | 'recipes' | 'ideas' | 'strategy' | 'templates' | 'signatures' | 'documents' | 'distribution' | 'collaboration'>('projects');
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [recipes, setRecipes] = useState<ContentRecipe[]>([]);
  const [templates, setTemplates] = useState<ChannelTemplate[]>([]);
  const [signatureBlocks, setSignatureBlocks] = useState<SignatureBlock[]>([]);
  const [contentStrategies, setContentStrategies] = useState<ContentStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // User context (for selected client and project)
  const { selectedClient, selectedOrganization, selectedProject, setSelectedProject, projects, token } = useUser();

  // Form states
  const [newProject, setNewProject] = useState({
    client_id: '',
    organization_id: '',
    name: '',
    description: '',
    industry: 'restaurant'
  });

  const [newHashtag, setNewHashtag] = useState({
    hashtag: '',
    is_favorite: false
  });

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    purpose: '',
    target_audience: '',
    required_asset_type: 'text',
    tone: 'professional',
    suggested_frequency: 'weekly',
    ai_instructions: '',
    color: '#6366f1'
  });

  // Content Ideas state
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [selectedContentIdeas, setSelectedContentIdeas] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'priority' | 'status' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, filterStatus, filterPriority]);

  // Auto-clear success and error messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const resetFilters = () => {
    setSearchTerm('');
    setSortBy('created_at');
    setSortOrder('desc');
    setFilterStatus('all');
    setFilterPriority('all');
    setCurrentPage(1);
  };
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    topic_keywords: [] as string[],
    suggested_date: '',
    suggested_time: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    post_type_id: '',
    notes: ''
  });
  const [keywordInput, setKeywordInput] = useState('');
  
  // Signature Blocks state
  const [newSignatureBlock, setNewSignatureBlock] = useState({
    name: '',
    type: 'contact' as 'contact' | 'disclaimer' | 'social' | 'cta' | 'custom',
    content: '',
    is_default: false
  });

  const [newContentStrategy, setNewContentStrategy] = useState({
    strategy_name: '',
    strategy_description: '',
    post_type_mix_targets: {} as Record<string, number>,
    status: 'draft' as 'draft' | 'active' | 'archived' | 'review'
  });
  
  // AI Bulk Generation state
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);
  const [bulkGenerationSettings, setBulkGenerationSettings] = useState({
    post_type_id: '',
    count: 15,
    focus_areas: [] as string[],
    seasonal_themes: [] as string[],
    target_audience_insights: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Post Type editing state
  const [editingRecipe, setEditingRecipe] = useState<ContentRecipe | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState({
    date: '',
    time: ''
  });

  const [newTemplate, setNewTemplate] = useState({
    channel: 'facebook',
    template_name: '',
    formatting_rules: {},
    example_output: '',
    is_default: false
  });

  useEffect(() => {
    // Update defaults from context
    setNewProject((p) => ({
      ...p,
      client_id: selectedClient || '',
      organization_id: selectedOrganization || ''
    }));
  }, [selectedClient, selectedOrganization, token]);

  // Load selected project from localStorage on mount
  useEffect(() => {
    const savedProject = localStorage.getItem('selectedProject');
    if (savedProject && savedProject !== selectedProject) {
      setSelectedProject(savedProject);
      console.log('PlaybookManager: Loaded project from localStorage:', savedProject);
    }
  }, []);


  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, activeTab]);


  const loadProjectData = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      const [hashtagsRes, recipesRes, templatesRes, ideasRes, signaturesRes, strategiesRes] = await Promise.all([
        axios.get(api.getUrl(`playbook/hashtags/${selectedProject}`)),
        axios.get(api.getUrl(`playbook/recipes/${selectedProject}`)),
        axios.get(api.getUrl(`playbook/templates/${selectedProject}`)),
        axios.get(api.getUrl(`content-ideas/project/${selectedProject}?limit=1000`), {
          headers: api.getHeaders(token)
        }),
        axios.get(api.getUrl(`playbook/signature-blocks/${selectedProject}`)),
        axios.get(api.getUrl(`content-strategies/${selectedProject}`), {
          headers: api.getHeaders(token)
        }).catch(() => ({ data: { success: true, data: [] } }))
      ]);

      setHashtags(hashtagsRes.data.data);
      setRecipes(recipesRes.data.data);
      setTemplates(templatesRes.data.data);
      setContentIdeas(ideasRes.data.data || []);
      setSignatureBlocks(signaturesRes.data.data || []);
      setContentStrategies(strategiesRes.data.data || []);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedClient || !selectedOrganization) return;
      await axios.post(
        api.getUrl('/clients/projects'),
        {
          client_id: selectedClient,
          organization_id: selectedOrganization,
          name: newProject.name,
          description: newProject.description,
          industry: newProject.industry,
          project_type: 'campaign'
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setNewProject({ ...newProject, name: '', description: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleAddHashtag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await axios.post(api.getUrl('/playbook/hashtags'), {
        project_id: selectedProject,
        ...newHashtag
      });
      setNewHashtag({ hashtag: '', is_favorite: false });
      loadProjectData();
    } catch (error) {
      console.error('Failed to add hashtag:', error);
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      if (editingRecipe) {
        // Update existing recipe
        await axios.put(api.getUrl(`/playbook/recipes/${editingRecipe.id}`), {
          ...newRecipe
        });
        setEditingRecipe(null);
      } else {
        // Create new recipe
      await axios.post(api.getUrl('/playbook/recipes'), {
        project_id: selectedProject,
        ...newRecipe
      });
      }
      
      setNewRecipe({
        name: '',
        description: '',
        purpose: '',
        target_audience: '',
        required_asset_type: 'text',
        tone: 'professional',
        suggested_frequency: 'weekly',
        ai_instructions: '',
        color: '#6366f1'
      });
      loadProjectData();
    } catch (error) {
      console.error('Failed to save recipe:', error);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await axios.post(api.getUrl('/playbook/templates'), {
        project_id: selectedProject,
        ...newTemplate
      });
      setNewTemplate({
        channel: 'facebook',
        template_name: '',
        formatting_rules: {},
        example_output: '',
        is_default: false
      });
      loadProjectData();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleCreateSignatureBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await axios.post(api.getUrl('/playbook/signature-blocks'), {
        project_id: selectedProject,
        ...newSignatureBlock
      });
      setNewSignatureBlock({
        name: '',
        type: 'contact',
        content: '',
        is_default: false
      });
      loadProjectData();
    } catch (error) {
      console.error('Failed to create signature block:', error);
    }
  };

  const handleEditSignatureBlock = (block: SignatureBlock) => {
    setNewSignatureBlock({
      name: block.name,
      type: block.type,
      content: block.content,
      is_default: block.is_default
    });
    // TODO: Implement edit mode
  };

  const handleDeleteSignatureBlock = async (blockId: string) => {
    if (!window.confirm('Are you sure you want to delete this signature block?')) return;

    try {
      await axios.delete(api.getUrl(`playbook/signature-blocks/${blockId}`));
      loadProjectData();
    } catch (error) {
      console.error('Failed to delete signature block:', error);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await axios.post(api.getUrl('/content-ideas'), {
        project_id: selectedProject,
        ...newIdea
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setNewIdea({
        title: '',
        description: '',
        topic_keywords: [],
        suggested_date: '',
        suggested_time: '',
        priority: 'medium',
        post_type_id: '',
        notes: ''
      });
      setKeywordInput('');
      loadProjectData();
    } catch (error) {
      console.error('Failed to create content idea:', error);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !newIdea.topic_keywords.includes(keywordInput.trim())) {
      setNewIdea({
        ...newIdea,
        topic_keywords: [...newIdea.topic_keywords, keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setNewIdea({
      ...newIdea,
      topic_keywords: newIdea.topic_keywords.filter(k => k !== keyword)
    });
  };

  // AI Bulk Generation functions
  const handleBulkGeneration = async () => {
    if (!selectedProject || !bulkGenerationSettings.post_type_id) return;

    setIsGenerating(true);
    try {
      const response = await axios.post(api.getUrl('/content-ideas/generate-bulk'), {
        project_id: selectedProject,
        ...bulkGenerationSettings
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        // Refresh the ideas list
        loadProjectData();
        setShowBulkGenerator(false);
        // Reset form
        setBulkGenerationSettings({
          post_type_id: '',
          count: 15,
          focus_areas: [],
          seasonal_themes: [],
          target_audience_insights: ''
        });
      }
    } catch (error) {
      console.error('Failed to generate bulk ideas:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const addFocusArea = (area: string) => {
    if (area && !bulkGenerationSettings.focus_areas.includes(area)) {
      setBulkGenerationSettings(prev => ({
        ...prev,
        focus_areas: [...prev.focus_areas, area]
      }));
    }
  };

  const removeFocusArea = (area: string) => {
    setBulkGenerationSettings(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.filter(a => a !== area)
    }));
  };

  const addSeasonalTheme = (theme: string) => {
    if (theme && !bulkGenerationSettings.seasonal_themes.includes(theme)) {
      setBulkGenerationSettings(prev => ({
        ...prev,
        seasonal_themes: [...prev.seasonal_themes, theme]
      }));
    }
  };

  const removeSeasonalTheme = (theme: string) => {
    setBulkGenerationSettings(prev => ({
      ...prev,
      seasonal_themes: prev.seasonal_themes.filter(t => t !== theme)
    }));
  };

  // Post Type management functions
  const handleEditRecipe = (recipe: ContentRecipe) => {
    setEditingRecipe(recipe);
    setNewRecipe({
      name: recipe.name,
      description: recipe.description,
      purpose: recipe.purpose,
      target_audience: recipe.target_audience,
      required_asset_type: recipe.required_asset_type,
      tone: recipe.tone,
      suggested_frequency: recipe.suggested_frequency,
      ai_instructions: recipe.ai_instructions,
      color: recipe.color || '#6366f1'
    });
  };

  const handleDuplicateRecipe = (recipe: ContentRecipe) => {
    setNewRecipe({
      name: `${recipe.name} (Copy)`,
      description: recipe.description,
      purpose: recipe.purpose,
      target_audience: recipe.target_audience,
      required_asset_type: recipe.required_asset_type,
      tone: recipe.tone,
      suggested_frequency: recipe.suggested_frequency,
      ai_instructions: recipe.ai_instructions,
      color: recipe.color || '#6366f1'
    });
  };

  const handleCreateContentStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const response = await axios.post(api.getUrl(`/content-strategies`), {
        project_id: selectedProject,
        ...newContentStrategy
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        setContentStrategies(prev => [...prev, response.data.data]);
        setNewContentStrategy({
          strategy_name: '',
          strategy_description: '',
          post_type_mix_targets: {},
          status: 'draft'
        });
        alert('Content strategy created successfully!');
      }
    } catch (error) {
      console.error('Failed to create content strategy:', error);
      alert('Failed to create content strategy');
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!window.confirm('Are you sure you want to delete this Post Type? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(api.getUrl(`playbook/recipes/${recipeId}`));
      loadProjectData();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipe(null);
    setNewRecipe({
      name: '',
      description: '',
      purpose: '',
      target_audience: '',
      required_asset_type: 'text',
      tone: 'professional',
      suggested_frequency: 'weekly',
      ai_instructions: '',
      color: '#6366f1'
    });
  };

  // Delete functions for content ideas
  const handleDeleteContentIdea = async (ideaId: string) => {
    if (!window.confirm('Are you sure you want to delete this content idea?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await axios.delete(api.getUrl(`/content-ideas/${ideaId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Remove from local state
        setContentIdeas(prev => prev.filter(idea => idea.id !== ideaId));
        // Remove from selected items if it was selected
        setSelectedContentIdeas(prev => {
          const newSet = new Set(prev);
          newSet.delete(ideaId);
          return newSet;
        });
        console.log('Content idea deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete content idea:', error);
      alert('Failed to delete content idea. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteContentIdeas = async () => {
    if (selectedContentIdeas.size === 0) {
      alert('Please select content ideas to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedContentIdeas.size} content idea(s)?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const deletePromises = Array.from(selectedContentIdeas).map(ideaId =>
        axios.delete(api.getUrl(`/content-ideas/${ideaId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );

      await Promise.all(deletePromises);

      // Remove from local state
      setContentIdeas(prev => prev.filter(idea => !selectedContentIdeas.has(idea.id)));
      setSelectedContentIdeas(new Set());
      console.log(`${selectedContentIdeas.size} content ideas deleted successfully`);
    } catch (error) {
      console.error('Failed to delete content ideas:', error);
      alert('Failed to delete some content ideas. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveContentIdea = async (ideaId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(api.getUrl(`/content-ideas/${ideaId}/approve`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the idea status in state
      setContentIdeas(prev => prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, status: 'approved', approved_by: 'current-user', approved_at: new Date().toISOString() }
          : idea
      ));
      
      setSuccess('Content idea approved successfully!');
    } catch (error) {
      console.error('Error approving content idea:', error);
      setError('Failed to approve content idea');
    }
  };

  const handleBulkApproveContentIdeas = async () => {
    if (selectedContentIdeas.size === 0) {
      alert('Please select content ideas to approve.');
      return;
    }

    if (!window.confirm(`Are you sure you want to approve ${selectedContentIdeas.size} content idea(s)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const approvePromises = Array.from(selectedContentIdeas).map(id => 
        axios.put(api.getUrl(`/content-ideas/${id}/approve`), {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(approvePromises);
      
      // Update the ideas status in state
      setContentIdeas(prev => prev.map(idea => 
        selectedContentIdeas.has(idea.id)
          ? { ...idea, status: 'approved', approved_by: 'current-user', approved_at: new Date().toISOString() }
          : idea
      ));
      
      setSelectedContentIdeas(new Set());
      setSuccess(`Successfully approved ${selectedContentIdeas.size} content idea(s)!`);
    } catch (error) {
      console.error('Error approving content ideas:', error);
      setError('Failed to approve content ideas');
    }
  };

  const handleSelectContentIdea = (ideaId: string) => {
    setSelectedContentIdeas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  // Generate content from content idea
  const handleGenerateContent = (idea: ContentIdea) => {
    // Navigate to Content Generator with pre-filled data
    const params = new URLSearchParams({
      title: idea.title,
      description: idea.description || '',
      topic: idea.topic_keywords?.join(', ') || '',
      postType: idea.post_type_name || '',
      priority: idea.priority,
      suggestedDate: idea.suggested_date || '',
      suggestedTime: idea.suggested_time || ''
    });
    
    navigate(`/generate?${params.toString()}`);
  };

  // Filter and sort content ideas
  const getFilteredAndSortedIdeas = () => {
    let filtered = contentIdeas.filter(idea => {
      // Search filter
      if (searchTerm && !idea.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !idea.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filterStatus !== 'all' && idea.status !== filterStatus) {
        return false;
      }
      
      // Priority filter
      if (filterPriority !== 'all' && idea.priority !== filterPriority) {
        return false;
      }
      
      return true;
    });
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.suggested_date || a.created_at);
          bValue = new Date(b.suggested_date || b.created_at);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };

  const handleSelectAllContentIdeas = () => {
    const filteredIdeas = getFilteredAndSortedIdeas();
    const currentPageIdeas = filteredIdeas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const currentPageIds = currentPageIdeas.map(idea => idea.id);
    const allCurrentPageSelected = currentPageIds.every((id: string) => selectedContentIdeas.has(id));
    
    if (allCurrentPageSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedContentIdeas);
      currentPageIds.forEach(id => newSelected.delete(id));
      setSelectedContentIdeas(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedContentIdeas);
      currentPageIds.forEach(id => newSelected.add(id));
      setSelectedContentIdeas(newSelected);
    }
  };

  const tabs = [
    { id: 'projects', name: '📁 Projects', icon: '📁' },
    { id: 'hashtags', name: '# Hashtags', icon: '#' },
    { id: 'recipes', name: '🧩 Post Types', icon: '🧩' },
    { id: 'ideas', name: '💡 Content Ideas', icon: '💡' },
    { id: 'strategy', name: '🎯 Content Strategy', icon: '🎯' },
    { id: 'templates', name: '🎨 Templates', icon: '🎨' },
    { id: 'signatures', name: '✍️ Signature Blocks', icon: '✍️' },
    { id: 'documents', name: '📄 Reference Documents', icon: '📄' },
    { id: 'distribution', name: '📢 Manual Distribution', icon: '📢' },
    { id: 'collaboration', name: '🤝 Client Collaboration', icon: '🤝' }
  ];

  return (
    <div className="space-y-8">
      {/* Clean Header - Like Content List */}
      <div className="text-center">
        <h1 className="text-5xl font-bold gradient-text text-shadow mb-4">Content Playbook Manager</h1>
        <p className="text-xl text-gray-600 mb-6">Standardize and strategize your content across all projects</p>
        
        {/* Project Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            <span className="text-gray-700 font-medium">
              {projects.find(p => p.id === selectedProject)?.name || 'No Project Selected'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="modern-card hover-lift">
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 text-center ${
                  activeTab === tab.id
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-lg">{tab.icon}</span>
                  <span className="text-sm">{tab.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold gradient-text">Create New Project</h3>
              <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="modern-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Industry</label>
                  <select
                    value={newProject.industry}
                    onChange={(e) => setNewProject({ ...newProject, industry: e.target.value })}
                    className="modern-select w-full"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="property">Property</option>
                    <option value="agency">Agency</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="modern-textarea w-full"
                    rows={3}
                  />
                </div>
                <button type="submit" className="btn-modern hover-lift">
                  ✨ Create Project
                </button>
              </form>
            </div>
          )}

          {activeTab === 'hashtags' && selectedProject && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold gradient-text">Manage Hashtags</h3>
              
              {/* Add Hashtag Form */}
              <form onSubmit={handleAddHashtag} className="glass rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Hashtag</label>
                    <input
                      type="text"
                      value={newHashtag.hashtag}
                      onChange={(e) => setNewHashtag({ ...newHashtag, hashtag: e.target.value })}
                      className="modern-input w-full"
                      placeholder="#YourHashtag"
                      required
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newHashtag.is_favorite}
                        onChange={(e) => setNewHashtag({ ...newHashtag, is_favorite: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-semibold text-gray-700">Favorite (Brand)</span>
                    </label>
                  </div>
                  <div>
                    <button type="submit" className="btn-modern w-full hover-lift">
                      ➕ Add Hashtag
                    </button>
                  </div>
                </div>
              </form>

              {/* Hashtag List */}
              <div className="space-y-4">
                {hashtags.map((hashtag) => (
                  <div key={hashtag.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        hashtag.is_favorite 
                          ? 'bg-gradient-primary text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {hashtag.hashtag}
                      </span>
                      {hashtag.is_favorite && <span className="text-yellow-500">⭐</span>}
                      <span className="text-sm text-gray-500">Used {hashtag.usage_count} times</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'recipes' && selectedProject && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold gradient-text">Post Types</h3>
              
              {/* Quick-add presets */}
              <div className="glass rounded-xl p-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {[
                    {name:'Weekly Special', tone:'friendly', freq:'weekly'},
                    {name:'Ingredient Spotlight', tone:'informative', freq:'weekly'},
                    {name:'Customer Testimonial', tone:'professional', freq:'weekly'},
                    {name:'Event Announcement', tone:'persuasive', freq:'monthly'},
                  ].map((p)=> (
                    <button key={p.name} className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-sm"
                      onClick={()=>setNewRecipe(r=>({...r, name:p.name, tone:p.tone, suggested_frequency:p.freq}))}>
                      + {p.name}
                    </button>
                  ))}
                  <span className="ml-auto"></span>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-full bg-gradient-primary text-white text-sm"
                    onClick={async()=>{
                      try{
                        setLoading(true);
                        const res = await axios.post(api.getUrl('/playbook/post-types/suggest'), {
                          industry: newProject.industry,
                          goals: '', audience: '', current_mix: ''
                        });
                        const suggestions = res.data.data || [];
                        if (suggestions.length){
                          // Pre-fill first suggestion; user can adjust and submit
                          const s = suggestions[0];
                          setNewRecipe(r=>({
                            ...r,
                            name: s.name || r.name,
                            description: s.purpose || r.description,
                            required_asset_type: s.required_asset_type || r.required_asset_type,
                            tone: s.tone || r.tone,
                            suggested_frequency: s.suggested_frequency || r.suggested_frequency
                          }));
                        }
                      }catch(e){ console.error('AI suggest error', e); }
                      finally{ setLoading(false); }
                    }}
                  >
                    🤖 Get AI Suggestions
                  </button>
                </div>
              </div>

              {/* Add/Edit Post Type Form */}
              <form onSubmit={handleCreateRecipe} className="glass rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Post Type Name</label>
                    <input
                      type="text"
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                      className="modern-input w-full"
                      placeholder="e.g., Ingredient Spotlight, Weekly Special, Open House"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tone</label>
                    <select
                      value={newRecipe.tone}
                      onChange={(e) => setNewRecipe({ ...newRecipe, tone: e.target.value })}
                      className="modern-select w-full"
                    >
                      <option value="friendly">Friendly</option>
                      <option value="professional">Professional</option>
                      <option value="persuasive">Persuasive</option>
                      <option value="informative">Informative</option>
                      <option value="witty">Witty</option>
                      <option value="luxurious">Luxurious</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Purpose</label>
                    <div className="space-x-2">
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={async(e)=>{
                          e.preventDefault();
                          e.stopPropagation();
                        try{
                          setLoading(true);
                          const res = await axios.post(api.getUrl('/playbook/post-types/purpose'), {
                            industry: newProject.industry,
                            name: newRecipe.name,
                            context: newRecipe.ai_instructions || ''
                          });
                          const p = res.data?.data?.purpose;
                          if (p) setNewRecipe(r=>({ ...r, purpose: p }));
                          }catch(e){ console.error('AI purpose error', e);} finally{ setLoading(false);} }
                        }>
                        🤖 Suggest
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={async (e)=>{
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Clean button clicked, current purpose:', newRecipe.purpose);
                          
                          const currentText = newRecipe.purpose || '';
                          console.log('Original text:', currentText);
                          
                          // Step 1: Try algorithmic cleaning first (fast and free)
                          let cleaned = currentText
                            .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
                            .trim()                         // Remove leading/trailing spaces
                            .replace(/\s*([,.;:!?])\s*/g, '$1 ');  // Fix punctuation spacing
                          
                          // Capitalize first letter
                          if (cleaned.length > 0) {
                            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                          }
                          
                          // Capitalize after sentences
                          cleaned = cleaned.replace(/([.!?])\s*([a-z])/g, (match, punc, letter) => punc + ' ' + letter.toUpperCase());
                          
                          // Ensure it ends with a period if it doesn't end with punctuation
                          const algorithmicResult = cleaned.match(/[.!?]$/) ? cleaned : cleaned + '.';
                          console.log('Algorithmic cleaning result:', algorithmicResult);
                          
                          // Step 2: Check if algorithmic cleaning made significant improvements
                          const originalWords = currentText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
                          const cleanedWords = algorithmicResult.toLowerCase().split(/\s+/).filter(w => w.length > 0);
                          
                          // Calculate improvement score (basic metrics)
                          const hasSpacingIssues = currentText.includes('  ') || currentText.includes('\n');
                          const hasCapitalizationIssues = currentText !== currentText.charAt(0).toUpperCase() + currentText.slice(1);
                          const hasPunctuationIssues = !currentText.match(/[.!?]$/);
                          const hasTypoIndicators = /(.)\1{2,}/.test(currentText) || /\b\w{1,2}\b.*\b\w{1,2}\b/.test(currentText);
                          
                          const improvementScore = (hasSpacingIssues ? 1 : 0) + 
                                                 (hasCapitalizationIssues ? 1 : 0) + 
                                                 (hasPunctuationIssues ? 1 : 0) + 
                                                 (hasTypoIndicators ? 2 : 0);
                          
                          console.log('Improvement score:', improvementScore, '(0-5 scale)');
                          
                          // Step 3: If algorithmic cleaning didn't help much, try AI
                          if (improvementScore < 2 || currentText === algorithmicResult) {
                            console.log('Algorithmic cleaning insufficient, trying AI...');
                            setLoading(true);
                            
                            try {
                              const response = await fetch(api.getUrl('/playbook/post-types/purpose'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  purpose: currentText,
                                  action: 'clean_and_improve'
                                })
                              });
                              
                              const json = await response.json();
                              if (json.success && json.data) {
                                console.log('AI cleaning result:', json.data);
                                setNewRecipe(r => ({ ...r, purpose: json.data }));
                              } else {
                                console.log('AI cleaning failed, using algorithmic result');
                                setNewRecipe(r => ({ ...r, purpose: algorithmicResult }));
                              }
                            } catch (error) {
                              console.error('AI cleaning error:', error);
                              console.log('Falling back to algorithmic result');
                              setNewRecipe(r => ({ ...r, purpose: algorithmicResult }));
                            } finally {
                              setLoading(false);
                            }
                          } else {
                            console.log('Algorithmic cleaning sufficient, using result');
                            setNewRecipe(r => ({ ...r, purpose: algorithmicResult }));
                          }
                        }}
                      >
                        🧹 Clean
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={newRecipe.purpose}
                    onChange={(e) => setNewRecipe({ ...newRecipe, purpose: e.target.value })}
                    className="modern-textarea w-full"
                    rows={2}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">AI Instructions</label>
                  <div className="relative">
                  <textarea
                    value={newRecipe.ai_instructions}
                    onChange={(e) => setNewRecipe({ ...newRecipe, ai_instructions: e.target.value })}
                      className="modern-textarea w-full pr-20"
                    rows={3}
                    placeholder="Specific instructions for the AI when generating this type of content..."
                    required
                  />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        onClick={() => {
                          // Suggest AI instructions based on post type
                          const suggestions = {
                            'Weekly Special': 'Create engaging social media posts that highlight weekly specials. Include appetizing descriptions, pricing, and call-to-action. Use food-focused language that makes customers hungry.',
                            'Ingredient Spotlight': 'Write educational content about featured ingredients. Include origin, nutritional benefits, and cooking tips. Make it informative yet accessible.',
                            'Customer Testimonial': 'Craft authentic testimonials that build trust. Include specific details about customer experience, highlight key benefits, and maintain conversational tone.',
                            'Event Announcement': 'Create compelling event announcements with clear details, excitement, and urgency. Include date, time, location, and what makes this event special.'
                          };
                          const suggestion = suggestions[newRecipe.name as keyof typeof suggestions] || 'Create compelling content that aligns with the brand voice and engages the target audience.';
                          setNewRecipe({ ...newRecipe, ai_instructions: suggestion });
                        }}
                      >
                        Suggest
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        onClick={() => setNewRecipe({ ...newRecipe, ai_instructions: '' })}
                      >
                        Clean
                      </button>
                    </div>
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🎨 Color</label>
                  <div className="space-y-3">
                    {/* Predefined Color Collections */}
                    <div>
                      <div className="text-xs text-gray-600 mb-2">Quick Select:</div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Brand', colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'] },
                          { name: 'Nature', colors: ['#10b981', '#059669', '#047857', '#065f46'] },
                          { name: 'Warm', colors: ['#f97316', '#ea580c', '#dc2626', '#b91c1c'] },
                          { name: 'Cool', colors: ['#06b6d4', '#0891b2', '#0284c7', '#2563eb'] },
                          { name: 'Neutral', colors: ['#6b7280', '#4b5563', '#374151', '#1f2937'] }
                        ].map((collection, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">{collection.name}:</span>
                            <div className="flex gap-1">
                              {collection.colors.map((color, colorIdx) => (
                                <button
                                  key={colorIdx}
                                  type="button"
                                  onClick={() => setNewRecipe({ ...newRecipe, color })}
                                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                                    newRecipe.color === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-300'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Custom Color Input */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-600">Custom:</label>
                      <input
                        type="color"
                        value={newRecipe.color}
                        onChange={(e) => setNewRecipe({ ...newRecipe, color: e.target.value })}
                        className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newRecipe.color}
                        onChange={(e) => setNewRecipe({ ...newRecipe, color: e.target.value })}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#6366f1"
                      />
                      <div 
                        className="w-12 h-8 rounded border border-gray-300 flex items-center justify-center text-white text-xs font-semibold shadow-sm"
                        style={{ backgroundColor: newRecipe.color }}
                        title="Preview"
                      >
                        {newRecipe.color}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                <button type="submit" className="btn-modern hover-lift">
                    {editingRecipe ? '💾 Update Post Type' : '🧩 Create Post Type'}
                </button>
                  {editingRecipe && (
                    <button 
                      type="button" 
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Post Types List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">📋 Existing Post Types ({recipes.length})</h4>
                  {recipes.length > 0 && (
                    <span className="text-sm text-gray-500">Click on a post type to view details</span>
                  )}
                </div>
                
                {recipes.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <div className="text-6xl mb-4">🧩</div>
                    <h5 className="text-xl font-semibold text-gray-900 mb-2">No Post Types Yet</h5>
                    <p className="text-gray-600 mb-4">
                      Create your first post type using the form above or use the quick-add buttons for common types.
                    </p>
                    <div className="text-sm text-gray-500">
                      💡 <strong>Tip:</strong> Post types help standardize your content strategy across all channels
                    </div>
                  </div>
                ) : (
                  recipes.map((recipe) => (
                    <div 
                      key={recipe.id} 
                      className="rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-200"
                      style={{ 
                        backgroundColor: recipe.color || '#6366f1',
                        color: 'white'
                      }}
                    >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-white">{recipe.name}</h4>
                        </div>
                          <p className="text-sm text-white/90 mb-3">{recipe.purpose}</p>
                          <div className="flex flex-wrap gap-4 mb-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                              Tone: {recipe.tone}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                              Frequency: {recipe.suggested_frequency}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                              Assets: {recipe.required_asset_type}
                            </span>
                        </div>
                          {recipe.description && (
                            <p className="text-sm text-white/80 mb-3">{recipe.description}</p>
                          )}
                          {recipe.ai_instructions && (
                            <div className="mt-3 p-3 bg-white/10 rounded-lg border border-white/20">
                              <span className="text-sm font-medium text-white">AI Instructions:</span>
                              <p className="text-sm text-white/90 mt-1">{recipe.ai_instructions}</p>
                            </div>
                          )}
                        <div className="mt-3 text-sm text-white/80">
                            <span className="font-medium">🎨 Channel Templates:</span> Configure in the Templates tab; these will be applied when generating for this Post Type.
                        </div>
                        <div className="mt-3">
                          <button 
                            onClick={() => setShowDatePicker(true)}
                            className="inline-flex items-center px-3 py-1 text-xs bg-white/20 text-white rounded hover:bg-white/30 transition-colors border border-white/30"
                          >
                            📅 Schedule
                          </button>
                        </div>
                    </div>
                        <div className="ml-4 flex flex-col gap-2">
                          <button 
                            onClick={() => handleEditRecipe(recipe)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDuplicateRecipe(recipe)}
                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Duplicate
                          </button>
                          <button 
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                  </div>
                  </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'ideas' && selectedProject && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold gradient-text">💡 Content Ideas Library</h3>
              <p className="text-gray-600">Create and manage content ideas linked to your Post Types. Schedule them on your calendar and approve them for content generation.</p>
              
              {/* Add Content Idea Form */}
              <form onSubmit={handleCreateIdea} className="glass rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Idea Title</label>
                    <input
                      type="text"
                      value={newIdea.title}
                      onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                      className="modern-input w-full"
                      placeholder="e.g., Weekly Lunch Special Promotion"
                      required
                    />
                        </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">🧩 Post Type</label>
                    <select
                      value={newIdea.post_type_id}
                      onChange={(e) => setNewIdea({ ...newIdea, post_type_id: e.target.value })}
                      className="modern-select w-full"
                      required
                    >
                      <option value="">Select a Post Type...</option>
                      {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          🎨 {recipe.name}
                        </option>
                      ))}
                    </select>
                        </div>
                      </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📋 Description</label>
                  <textarea
                    value={newIdea.description}
                    onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                    className="modern-textarea w-full"
                    rows={3}
                    placeholder="Describe what this content idea is about..."
                  />
                    </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Suggested Date</label>
                    <input
                      type="date"
                      value={newIdea.suggested_date}
                      onChange={(e) => setNewIdea({ ...newIdea, suggested_date: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">⏰ Suggested Time</label>
                    <input
                      type="time"
                      value={newIdea.suggested_time}
                      onChange={(e) => setNewIdea({ ...newIdea, suggested_time: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">⚡ Priority</label>
                    <select
                      value={newIdea.priority}
                      onChange={(e) => setNewIdea({ ...newIdea, priority: e.target.value as any })}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🏷️ Topic Keywords</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      className="modern-input flex-1"
                      placeholder="Add keywords related to this idea..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <button
                      type="button"
                      onClick={addKeyword}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newIdea.topic_keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Notes</label>
                  <textarea
                    value={newIdea.notes}
                    onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })}
                    className="modern-textarea w-full"
                    rows={2}
                    placeholder="Internal notes about this idea..."
                  />
                </div>

                <button type="submit" className="btn-modern hover-lift">
                  💡 Create Content Idea
                </button>
              </form>

              {/* Success/Error Messages */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Content Ideas List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">📋 Content Ideas ({getFilteredAndSortedIdeas().length})</h4>
                  <div className="flex gap-2">
                    {getFilteredAndSortedIdeas().length > 0 && (
                      <>
                        <button
                          onClick={handleSelectAllContentIdeas}
                          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          {(() => {
                            const filteredIdeas = getFilteredAndSortedIdeas();
                            const currentPageIdeas = filteredIdeas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                            const currentPageIds = currentPageIdeas.map(idea => idea.id);
                            const allCurrentPageSelected = currentPageIds.every((id: string) => selectedContentIdeas.has(id));
                            return allCurrentPageSelected ? 'Deselect Page' : 'Select Page';
                          })()}
                        </button>
                        {selectedContentIdeas.size > 0 && (
                          <>
                            <button
                              onClick={handleBulkApproveContentIdeas}
                              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              📝 Approve {selectedContentIdeas.size}
                            </button>
                            <button
                              onClick={handleBulkDeleteContentIdeas}
                              disabled={isDeleting}
                              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                            >
                              {isDeleting ? 'Deleting...' : `Delete ${selectedContentIdeas.size}`}
                            </button>
                          </>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setShowBulkGenerator(true)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                    >
                      🤖 AI Generate Ideas
                    </button>
                  </div>
                </div>

                {/* Filter and Sort Controls */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Search</label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search ideas..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📊 Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="created_at">Date Created</option>
                        <option value="date">Suggested Date</option>
                        <option value="title">Title</option>
                        <option value="priority">Priority</option>
                        <option value="status">Status</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">🔄 Order</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📋 Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="approved">Approved</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700">🎯 Priority:</label>
                      <div className="flex space-x-2">
                        {['all', 'urgent', 'high', 'medium', 'low'].map(priority => (
                          <button
                            key={priority}
                            onClick={() => setFilterPriority(priority)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              filterPriority === priority
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Reset Filters Button */}
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                    >
                      🔄 Reset Filters
                    </button>
                  </div>
                </div>
                
                {getFilteredAndSortedIdeas().length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <div className="text-6xl mb-4">💡</div>
                    <h5 className="text-xl font-semibold text-gray-900 mb-2">
                      {contentIdeas.length === 0 ? 'No Content Ideas Yet' : 'No Ideas Match Your Filters'}
                    </h5>
                    <p className="text-gray-600 mb-4">
                      {contentIdeas.length === 0 
                        ? 'Create your first content idea using the form above to start planning your content calendar.'
                        : 'Try adjusting your search terms or filters to find more content ideas.'
                      }
                    </p>
                    <div className="text-sm text-gray-500">
                      💡 <strong>Tip:</strong> Content ideas help you plan and schedule your content strategy
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Pagination Info - Always show if more than itemsPerPage */}
                    {getFilteredAndSortedIdeas().length > itemsPerPage && (
                      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredAndSortedIdeas().length)} of {getFilteredAndSortedIdeas().length} ideas
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ← Previous
                          </button>
                          <span className="px-3 py-1 text-sm bg-blue-500 text-white rounded">
                            {currentPage} of {Math.ceil(getFilteredAndSortedIdeas().length / itemsPerPage)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(getFilteredAndSortedIdeas().length / itemsPerPage), prev + 1))}
                            disabled={currentPage >= Math.ceil(getFilteredAndSortedIdeas().length / itemsPerPage)}
                            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Two-Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {getFilteredAndSortedIdeas()
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((idea) => (
                      <div 
                        key={idea.id} 
                        className="rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-200 relative"
                        style={{ 
                          backgroundColor: idea.post_type_color || '#6366f1',
                          color: 'white'
                        }}
                      >
                        {/* Approval Status Color Bar */}
                        {idea.status === 'approved' && (
                          <div className="absolute top-0 left-0 right-0 h-2 bg-green-400 rounded-t-xl"></div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedContentIdeas.has(idea.id)}
                              onChange={() => handleSelectContentIdea(idea.id)}
                              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-white">{idea.title}</h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-white/30 ${
                                idea.priority === 'urgent' ? 'bg-red-500/20 text-white' :
                                idea.priority === 'high' ? 'bg-orange-500/20 text-white' :
                                idea.priority === 'medium' ? 'bg-yellow-500/20 text-white' :
                                'bg-green-500/20 text-white'
                              }`}>
                                {idea.priority}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-white/30 ${
                                idea.status === 'approved' ? 'bg-green-500/20 text-white' :
                                idea.status === 'scheduled' ? 'bg-blue-500/20 text-white' :
                                idea.status === 'draft' ? 'bg-gray-500/20 text-white' :
                                'bg-purple-500/20 text-white'
                              }`}>
                                {idea.status}
                              </span>
                            </div>
                            
                            <div className="text-sm text-white/80 mb-3">
                              <strong>Post Type:</strong> {idea.post_type_name}
                            </div>
                            
                            {idea.description && (
                              <p className="text-sm text-white/90 mb-3">{idea.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {idea.topic_keywords?.map((keyword) => (
                                <span
                                  key={keyword}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white/20 text-white border border-white/30"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                            
                            <div className="text-sm text-white/80">
                              {idea.suggested_date && (
                                <span><strong>📅 Date:</strong> {new Date(idea.suggested_date).toLocaleDateString()}</span>
                              )}
                              {idea.suggested_time && (
                                <span className="ml-4"><strong>⏰ Time:</strong> {idea.suggested_time}</span>
                              )}
                            </div>
                          </div>
                          </div>
                          
                          <div className="ml-4 flex flex-col gap-2">
                            {idea.status === 'draft' && (
                              <button 
                                onClick={() => handleApproveContentIdea(idea.id)}
                                className="px-3 py-1 text-xs bg-blue-500/20 text-white rounded hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                              >
                                📝 Approve
                              </button>
                            )}
                            {idea.status === 'approved' && (
                              <div className="px-3 py-1 text-xs bg-green-500/30 text-white rounded border border-green-500/50 text-center">
                                ✅ Approved
                              </div>
                            )}
                            <button 
                              onClick={() => handleGenerateContent(idea)}
                              className="px-3 py-1 text-xs bg-white/20 text-white rounded hover:bg-white/30 transition-colors border border-white/30"
                            >
                              Generate
                            </button>
                            <button className="px-3 py-1 text-xs bg-white/20 text-white rounded hover:bg-white/30 transition-colors border border-white/30">
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteContentIdea(idea.id)}
                              disabled={isDeleting}
                              className="px-3 py-1 text-xs bg-red-500/20 text-white rounded hover:bg-red-500/30 transition-colors border border-red-500/30 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'templates' && selectedProject && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold gradient-text">Channel Templates</h3>
              
              {/* Add Template Form */}
              <form onSubmit={handleCreateTemplate} className="glass rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Channel</label>
                    <select
                      value={newTemplate.channel}
                      onChange={(e) => setNewTemplate({ ...newTemplate, channel: e.target.value })}
                      className="modern-select w-full"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Template Name</label>
                    <input
                      type="text"
                      value={newTemplate.template_name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, template_name: e.target.value })}
                      className="modern-input w-full"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Example Output</label>
                  <textarea
                    value={newTemplate.example_output}
                    onChange={(e) => setNewTemplate({ ...newTemplate, example_output: e.target.value })}
                    className="modern-textarea w-full"
                    rows={4}
                    placeholder="Show how content should be formatted for this channel..."
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newTemplate.is_default}
                      onChange={(e) => setNewTemplate({ ...newTemplate, is_default: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-semibold text-gray-700">Default Template</span>
                  </label>
                </div>

                <button type="submit" className="btn-modern hover-lift">
                  🎨 Create Template
                </button>
              </form>

              {/* Template List */}
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="glass rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{template.template_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">Channel: {template.channel}</p>
                        {template.is_default && (
                          <span className="inline-block px-2 py-1 bg-gradient-primary text-white text-xs rounded-full mt-2">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedProject && activeTab !== 'projects' && (
            <div className="text-center py-16">
              <div className="text-8xl mb-6 float">🎯</div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Select a Project First</h3>
              <p className="mt-2 text-gray-600">
                Choose a project from above to manage its playbook settings.
              </p>
              {/* Debug info */}
              <div className="mt-4 text-xs text-gray-400">
                Debug: selectedProject = {selectedProject || 'null'}, activeTab = {activeTab}
              </div>
            </div>
          )}
        </div>
      </div>
      {showLibrary && (
        <AssetLibrary projectId={selectedProject || undefined} onClose={()=>setShowLibrary(false)} />
      )}

      {/* AI Bulk Generation Modal */}
      {showBulkGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">🤖 AI Content Idea Generator</h2>
              <button
                onClick={() => setShowBulkGenerator(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🧩 Post Type</label>
                <select
                  value={bulkGenerationSettings.post_type_id}
                  onChange={(e) => setBulkGenerationSettings({ ...bulkGenerationSettings, post_type_id: e.target.value })}
                  className="modern-select w-full"
                  required
                >
                  <option value="">Select a Post Type...</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      🎨 {recipe.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🔢 Number of Ideas</label>
                <select
                  value={bulkGenerationSettings.count}
                  onChange={(e) => setBulkGenerationSettings({ ...bulkGenerationSettings, count: parseInt(e.target.value) })}
                  className="modern-select w-full"
                >
                  <option value={5}>5 ideas</option>
                  <option value={10}>10 ideas</option>
                  <option value={15}>15 ideas</option>
                  <option value={20}>20 ideas</option>
                  <option value={30}>30 ideas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">👥 Target Audience Insights (Optional)</label>
                <textarea
                  value={bulkGenerationSettings.target_audience_insights}
                  onChange={(e) => setBulkGenerationSettings({ ...bulkGenerationSettings, target_audience_insights: e.target.value })}
                  className="modern-textarea w-full"
                  rows={3}
                  placeholder="Describe your target audience, their interests, pain points, or preferences to help generate more relevant ideas..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowBulkGenerator(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkGeneration}
                  disabled={!bulkGenerationSettings.post_type_id || isGenerating}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      🤖 Generate {bulkGenerationSettings.count} Ideas
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date/Time Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">📅 Schedule Post Type</h2>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Date</label>
                <input
                  type="date"
                  value={selectedDateTime.date}
                  onChange={(e) => setSelectedDateTime({ ...selectedDateTime, date: e.target.value })}
                  className="modern-input w-full"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🕐 Time</label>
                <input
                  type="time"
                  value={selectedDateTime.time}
                  onChange={(e) => setSelectedDateTime({ ...selectedDateTime, time: e.target.value })}
                  className="modern-input w-full"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 What happens when you schedule?</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Creates content ideas based on this Post Type</li>
                  <li>• Schedules them for the selected date and time</li>
                  <li>• Adds them to your content calendar</li>
                  <li>• Sets up automated content generation workflow</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement scheduling logic
                  console.log('Scheduling for:', selectedDateTime);
                  setShowDatePicker(false);
                  setSelectedDateTime({ date: '', time: '' });
                }}
                disabled={!selectedDateTime.date || !selectedDateTime.time}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📅 Schedule Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Strategy Tab */}
      {activeTab === 'strategy' && selectedProject && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold gradient-text">Content Strategy</h3>
          <p className="text-gray-600">Define your content mix targets and overall strategy for this project.</p>
          
          {/* Existing Strategies */}
          {contentStrategies.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Existing Strategies</h4>
              {contentStrategies.map((strategy) => (
                <div key={strategy.strategy_id} className="glass rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900">{strategy.strategy_name}</h5>
                      <p className="text-gray-600">{strategy.strategy_description}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        strategy.status === 'active' ? 'bg-green-100 text-green-800' :
                        strategy.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {strategy.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Post Type Mix Targets */}
                  <div className="space-y-2">
                    <h6 className="font-medium text-gray-700">Content Mix Targets:</h6>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(strategy.post_type_mix_targets).map(([postType, percentage]) => (
                        <div key={postType} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {postType.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm font-bold text-blue-600">{percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">🎯</div>
              <h4 className="text-xl font-semibold text-gray-600 mb-2">No Content Strategy Yet</h4>
              <p className="text-gray-500 mb-6">Create your first content strategy to define your content mix targets.</p>
            </div>
          )}

          {/* Create Strategy Form */}
          <div className="glass rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Create New Strategy</h4>
            <form onSubmit={handleCreateContentStrategy} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Strategy Name</label>
                  <input
                    type="text"
                    value={newContentStrategy.strategy_name}
                    onChange={(e) => setNewContentStrategy(prev => ({ ...prev, strategy_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Restaurant Growth Strategy"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={newContentStrategy.status}
                    onChange={(e) => setNewContentStrategy(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="review">Review</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Strategy Description</label>
                <textarea
                  value={newContentStrategy.strategy_description}
                  onChange={(e) => setNewContentStrategy(prev => ({ ...prev, strategy_description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe your content strategy goals and approach..."
                />
              </div>

              {/* Post Type Mix Targets */}
              {recipes.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Content Mix Targets (%)</label>
                  <div className="space-y-3">
                    {recipes.map((recipe) => (
                      <div key={recipe.id} className="flex items-center space-x-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 capitalize">
                            {recipe.name}
                          </label>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={newContentStrategy.post_type_mix_targets[recipe.name.toLowerCase().replace(/\s+/g, '_')] || 0}
                            onChange={(e) => {
                              const postTypeKey = recipe.name.toLowerCase().replace(/\s+/g, '_');
                              setNewContentStrategy(prev => ({
                                ...prev,
                                post_type_mix_targets: {
                                  ...prev.post_type_mix_targets,
                                  [postTypeKey]: parseInt(e.target.value) || 0
                                }
                              }));
                            }}
                            className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="0"
                          />
                        </div>
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Total: {Object.values(newContentStrategy.post_type_mix_targets).reduce((sum, val) => sum + (val || 0), 0)}%
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Create Strategy
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Signature Blocks Tab */}
      {activeTab === 'signatures' && selectedProject && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold gradient-text">Signature Blocks</h3>
          <p className="text-gray-600">Create standardized contact information, disclaimers, and call-to-actions for your content.</p>
          
          {/* Add Signature Block Form */}
          <form onSubmit={handleCreateSignatureBlock} className="glass rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Block Name</label>
                <input
                  type="text"
                  value={newSignatureBlock.name}
                  onChange={(e) => setNewSignatureBlock({ ...newSignatureBlock, name: e.target.value })}
                  className="modern-input w-full"
                  placeholder="e.g., Contact Info, Legal Disclaimer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Block Type</label>
                <select
                  value={newSignatureBlock.type}
                  onChange={(e) => setNewSignatureBlock({ ...newSignatureBlock, type: e.target.value as any })}
                  className="modern-select w-full"
                >
                  <option value="contact">📞 Contact Information</option>
                  <option value="disclaimer">⚖️ Legal Disclaimer</option>
                  <option value="social">🔗 Social Media Links</option>
                  <option value="cta">📢 Call to Action</option>
                  <option value="custom">🎨 Custom Block</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
              <textarea
                value={newSignatureBlock.content}
                onChange={(e) => setNewSignatureBlock({ ...newSignatureBlock, content: e.target.value })}
                className="modern-textarea w-full"
                rows={6}
                placeholder="Enter your signature block content here..."
                required
              />
              <div className="mt-2 text-sm text-gray-500">
                💡 <strong>Tips:</strong> Use line breaks for formatting. Include placeholders like [PHONE], [EMAIL] for dynamic content.
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSignatureBlock.is_default}
                  onChange={(e) => setNewSignatureBlock({ ...newSignatureBlock, is_default: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-semibold text-gray-700">Set as Default Block</span>
              </label>
            </div>

            <button type="submit" className="btn-modern hover-lift">
              ✍️ Create Signature Block
            </button>
          </form>

          {/* Signature Blocks List */}
          <div className="space-y-4">
            {signatureBlocks.map((block) => (
              <div key={block.id} className="glass rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {block.name}
                      {block.is_default && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Default</span>}
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">{block.type} Block</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSignatureBlock(block)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSignatureBlock(block.id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{block.content}</pre>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  Created: {new Date(block.created_at).toLocaleDateString()}
                  {block.updated_at !== block.created_at && (
                    <> • Updated: {new Date(block.updated_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            ))}
            
            {signatureBlocks.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✍️</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Signature Blocks Yet</h3>
                <p className="text-gray-500">Create your first signature block to standardize your content branding.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reference Documents Tab */}
      {activeTab === 'documents' && selectedProject && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold gradient-text">📄 Reference Documents</h3>
          <p className="text-gray-600">Manage business documents, menus, brand guidelines, and other reference materials for your project.</p>
          
          <ReferenceDocuments />
        </div>
      )}

      {/* Manual Distribution Tab */}
      {activeTab === 'distribution' && selectedProject && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold gradient-text">📢 Manual Distribution</h3>
          <p className="text-gray-600">Manage manual sharing workflows to Facebook Groups, LinkedIn Groups, and other platforms that don't allow automated posting.</p>
          
          <ManualDistribution />
        </div>
      )}

      {/* Client Collaboration Tab */}
      {activeTab === 'collaboration' && selectedProject && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold gradient-text">🤝 Client Collaboration</h3>
          <p className="text-gray-600">Manage client access, approval workflows, feedback systems, and collaboration tools for seamless client engagement.</p>
          
          <ClientCollaboration />
        </div>
      )}
    </div>
  );
};

export default PlaybookManager;
