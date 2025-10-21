import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';

interface PostSection {
  id?: string;
  section_type: 'tease_hook' | 'body_content' | 'cta' | 'signature_block';
  section_order: number;
  content: string;
  visual_url?: string;
  visual_alt_text?: string;
  ai_generated?: boolean;
  ai_model?: string;
  ai_prompt?: string;
  ai_confidence?: number;
  is_locked?: boolean;
  is_approved?: boolean;
  word_count?: number;
  character_count?: number;
}

interface Post {
  id?: string;
  project_id: string;
  title: string;
  description?: string;
  creation_mode: 'all_at_once' | 'by_parts';
  platform?: string;
  post_type_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'cancelled';
  full_content?: string;
  full_visual_url?: string;
  full_visual_alt_text?: string;
  sections?: PostSection[];
  tags?: string[];
  hashtags?: string[];
  mentions?: string[];
  scheduled_date?: string;
  scheduled_time?: string;
}

const PostCreator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProject, projects, token } = useUser();
  const currentProject = projects.find(p => p.id === selectedProject);

  // Mode selection
  const [creationMode, setCreationMode] = useState<'all_at_once' | 'by_parts' | null>(null);
  
  // Post data
  const [post, setPost] = useState<Post>({
    project_id: selectedProject || '',
    title: '',
    description: '',
    creation_mode: 'all_at_once',
    priority: 'medium',
    status: 'draft',
    tags: [],
    hashtags: [],
    mentions: []
  });

  // By-Parts mode sections
  const [sections, setSections] = useState<PostSection[]>([
    {
      section_type: 'tease_hook',
      section_order: 1,
      content: '',
      is_locked: false,
      is_approved: false
    },
    {
      section_type: 'body_content',
      section_order: 2,
      content: '',
      is_locked: false,
      is_approved: false
    },
    {
      section_type: 'cta',
      section_order: 3,
      content: '',
      is_locked: false,
      is_approved: false
    },
    {
      section_type: 'signature_block',
      section_order: 4,
      content: '',
      is_locked: true, // Signature blocks are locked by default
      is_approved: false
    }
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<number>(0);

  // Load signature blocks for the project
  const [signatureBlocks, setSignatureBlocks] = useState<any[]>([]);

  useEffect(() => {
    if (selectedProject) {
      loadSignatureBlocks();
    }
  }, [selectedProject]);

  const loadSignatureBlocks = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/playbook/signature-blocks/${selectedProject}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setSignatureBlocks(response.data.data || []);
    } catch (error) {
      console.error('Failed to load signature blocks:', error);
    }
  };

  const handleModeSelection = (mode: 'all_at_once' | 'by_parts') => {
    setCreationMode(mode);
    setPost(prev => ({ ...prev, creation_mode: mode }));
  };

  const handlePostChange = (field: keyof Post, value: any) => {
    setPost(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (index: number, field: keyof PostSection, value: any) => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, [field]: value } : section
    ));
  };

  const generateAIContent = async (sectionIndex: number) => {
    const section = sections[sectionIndex];
    if (!section || section.is_locked) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5001/api/posts/${post.id}/sections/${section.id}/generate`,
        {
          prompt: `Generate ${section.section_type.replace('_', ' ')} content for: ${post.title}`,
          ai_model: 'claude',
          section_type: section.section_type
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      handleSectionChange(sectionIndex, 'content', response.data.data.content);
      handleSectionChange(sectionIndex, 'ai_generated', true);
      handleSectionChange(sectionIndex, 'ai_model', 'claude');
    } catch (error) {
      console.error('Failed to generate AI content:', error);
      setError('Failed to generate AI content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!post.title.trim()) {
      setError('Please enter a post title');
      return;
    }

    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = post.creation_mode === 'all_at_once' 
        ? '/api/posts/create/all-at-once'
        : '/api/posts/create/by-parts';

      const payload = post.creation_mode === 'all_at_once' 
        ? { ...post, project_id: selectedProject }
        : { ...post, project_id: selectedProject, sections };

      const response = await axios.post(
        `http://localhost:5001${endpoint}`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setSuccess('Post created successfully!');
      setTimeout(() => {
        navigate('/playbook-manager');
      }, 2000);

    } catch (error: any) {
      console.error('Failed to create post:', error);
      setError(error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const getSectionTitle = (type: string) => {
    switch (type) {
      case 'tease_hook': return 'Tease / Hook';
      case 'body_content': return 'Body / Main Content';
      case 'cta': return 'Call to Action';
      case 'signature_block': return 'Signature Block';
      default: return type;
    }
  };

  const getSectionDescription = (type: string) => {
    switch (type) {
      case 'tease_hook': return 'Grab attention and create curiosity';
      case 'body_content': return 'Main message and value proposition';
      case 'cta': return 'Clear action for the audience';
      case 'signature_block': return 'Contact information and branding';
      default: return '';
    }
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Project Selected</h2>
          <p className="text-gray-600 mb-6">Please select a project to create posts</p>
          <button
            onClick={() => navigate('/playbook-manager')}
            className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all"
          >
            Go to Project Manager
          </button>
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (!creationMode) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold gradient-text mb-4">Create New Post</h1>
            <p className="text-xl text-gray-600 mb-6">Choose your creation mode</p>
            <div className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-gray-700 font-medium">{currentProject?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* All-at-Once Mode */}
            <div 
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-200"
              onClick={() => handleModeSelection('all_at_once')}
            >
              <div className="text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">All-at-Once Mode</h3>
                <p className="text-gray-600 mb-6">
                  Generate the entire post in one go — including text, visuals, and metadata. 
                  Perfect for quick content creation with AI assistance.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Full post generation
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    AI-powered content
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Quick and efficient
                  </div>
                </div>
              </div>
            </div>

            {/* By-Parts Mode */}
            <div 
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-purple-200"
              onClick={() => handleModeSelection('by_parts')}
            >
              <div className="text-center">
                <div className="text-6xl mb-6">🎯</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">By-Parts Mode</h3>
                <p className="text-gray-600 mb-6">
                  Build your post step-by-step using predefined locked sections. 
                  Full control over each component with AI assistance per section.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Step-by-step creation
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    Locked sections
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    AI per section
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            {creationMode === 'all_at_once' ? 'All-at-Once Post Creation' : 'By-Parts Post Creation'}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {creationMode === 'all_at_once' 
              ? 'Generate your complete post with AI assistance'
              : 'Build your post section by section with full control'
            }
          </p>
          <div className="flex justify-center items-center space-x-4">
            <div className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-gray-700 font-medium">{currentProject?.name}</span>
            </div>
            <button
              onClick={() => setCreationMode(null)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Change Mode
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Post Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Post Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={post.title}
                    onChange={(e) => handlePostChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter post title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={post.description || ''}
                    onChange={(e) => handlePostChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Brief description of the post"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <select
                    value={post.platform || ''}
                    onChange={(e) => handlePostChange('platform', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Platform</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={post.priority}
                    onChange={(e) => handlePostChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={post.scheduled_date || ''}
                    onChange={(e) => handlePostChange('scheduled_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Time
                  </label>
                  <input
                    type="time"
                    value={post.scheduled_time || ''}
                    onChange={(e) => handlePostChange('scheduled_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Content Creation */}
          <div className="lg:col-span-2">
            {creationMode === 'all_at_once' ? (
              /* All-at-Once Mode */
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Post Content</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Content *
                    </label>
                    <textarea
                      value={post.full_content || ''}
                      onChange={(e) => handlePostChange('full_content', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={8}
                      placeholder="Write your complete post content here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visual URL
                    </label>
                    <input
                      type="url"
                      value={post.full_visual_url || ''}
                      onChange={(e) => handlePostChange('full_visual_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visual Alt Text
                    </label>
                    <input
                      type="text"
                      value={post.full_visual_alt_text || ''}
                      onChange={(e) => handlePostChange('full_visual_alt_text', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe the image for accessibility"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* By-Parts Mode */
              <div className="space-y-6">
                {/* Section Navigation */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Post Sections</h3>
                  <div className="flex space-x-2">
                    {sections.map((section, index) => (
                      <button
                        key={section.section_type}
                        onClick={() => setActiveSection(index)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          activeSection === index
                            ? 'bg-gradient-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getSectionTitle(section.section_type)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Section Editor */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {getSectionTitle(sections[activeSection]?.section_type)}
                      </h3>
                      <p className="text-gray-600">
                        {getSectionDescription(sections[activeSection]?.section_type)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {sections[activeSection]?.is_locked && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          🔒 Locked
                        </span>
                      )}
                      {sections[activeSection]?.ai_generated && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          🤖 AI Generated
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content {sections[activeSection]?.is_locked && '(Locked)'}
                      </label>
                      <textarea
                        value={sections[activeSection]?.content || ''}
                        onChange={(e) => handleSectionChange(activeSection, 'content', e.target.value)}
                        disabled={sections[activeSection]?.is_locked}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        rows={6}
                        placeholder={`Enter ${getSectionTitle(sections[activeSection]?.section_type).toLowerCase()} content...`}
                      />
                    </div>

                    {!sections[activeSection]?.is_locked && (
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {sections[activeSection]?.content?.split(' ').length || 0} words, {' '}
                          {sections[activeSection]?.content?.length || 0} characters
                        </div>
                        <button
                          onClick={() => generateAIContent(activeSection)}
                          disabled={loading}
                          className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          {loading ? 'Generating...' : '🤖 Generate with AI'}
                        </button>
                      </div>
                    )}

                    {/* Signature Block Selection */}
                    {sections[activeSection]?.section_type === 'signature_block' && signatureBlocks.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Signature Block
                        </label>
                        <select
                          onChange={(e) => {
                            const selectedBlock = signatureBlocks.find(b => b.id === e.target.value);
                            if (selectedBlock) {
                              handleSectionChange(activeSection, 'content', selectedBlock.content);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Choose a signature block</option>
                          {signatureBlocks.map(block => (
                            <option key={block.id} value={block.id}>
                              {block.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => navigate('/playbook-manager')}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !post.title.trim()}
                className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCreator;
