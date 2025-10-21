// [October 15, 2025] - Secured Social Posting with Multi-Tenant Project Scoping
// Purpose: Ensure users can only access social accounts for their own projects

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

interface Project {
  id: string;
  name: string;
  organization_id: string;
}

interface SocialConnection {
  id: string;
  late_profile_id: string;
  late_profile_name: string;
  late_account_id: string;
  platform: string;
  account_name: string;
  account_handle: string;
  account_type: string;
  profile_image_url: string;
  is_active: boolean;
  connection_status: string;
  last_synced_at: string;
  created_at: string;
}

interface LateProfile {
  _id: string;
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

interface SocialPost {
  _id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledFor?: string;
  publishedAt?: string;
}

const SocialPosting: React.FC = () => {
  const { token } = useUser();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'connections' | 'posts' | 'create'>('connections');
  
  // Project selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // Social connections
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<LateProfile[]>([]);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  
  // Posts
  const [posts, setPosts] = useState<SocialPost[]>([]);
  
  // New connection form
  const [newConnection, setNewConnection] = useState({
    lateProfileId: '',
    lateProfileName: '',
    platform: 'facebook',
    accountName: '',
    accountHandle: ''
  });
  
  // New post form
  const [newPost, setNewPost] = useState({
    content: '',
    platforms: [] as string[],
    scheduledFor: '',
    isDraft: false
  });

  // Load projects on mount
  useEffect(() => {
    if (token) {
      loadProjects();
    }
  }, [token]);

  // Load data when project is selected
  useEffect(() => {
    if (selectedProject && token) {
      loadProjectData();
    }
  }, [selectedProject, token]);

  const loadProjects = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/playbook/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.data.length > 0) {
        setProjects(response.data.data);
        setSelectedProject(response.data.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadProjectData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadConnections(),
        loadPosts()
      ]);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await axios.get(
        `http://localhost:5001/api/social/connections/${selectedProject}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setConnections(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const loadPosts = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await axios.get(
        `http://localhost:5001/api/social/posts/${selectedProject}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPosts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const loadAvailableLateProfiles = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/social/profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAvailableProfiles(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load Late profiles:', error);
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    
    try {
      const response = await axios.post(
        'http://localhost:5001/api/social/connections',
        {
          projectId: selectedProject,
          lateProfileId: newConnection.lateProfileId,
          lateProfileName: newConnection.lateProfileName,
          platform: newConnection.platform,
          accountName: newConnection.accountName,
          accountHandle: newConnection.accountHandle
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('Social account connected successfully!');
        setShowConnectionModal(false);
        setNewConnection({
          lateProfileId: '',
          lateProfileName: '',
          platform: 'facebook',
          accountName: '',
          accountHandle: ''
        });
        loadConnections();
      }
    } catch (error: any) {
      console.error('Failed to create connection:', error);
      alert(error.response?.data?.error || 'Failed to connect social account');
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to remove this connection?')) return;
    
    try {
      const response = await axios.delete(
        `http://localhost:5001/api/social/connections/${connectionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('Connection removed successfully');
        loadConnections();
      }
    } catch (error: any) {
      console.error('Failed to remove connection:', error);
      alert(error.response?.data?.error || 'Failed to remove connection');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    
    if (newPost.platforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }
    
    try {
      const response = await axios.post(
        `http://localhost:5001/api/social/posts/${selectedProject}`,
        {
          content: newPost.content,
          platforms: newPost.platforms,
          scheduledFor: newPost.scheduledFor || undefined,
          isDraft: newPost.isDraft
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('Post created successfully!');
        setNewPost({
          content: '',
          platforms: [],
          scheduledFor: '',
          isDraft: false
        });
        loadPosts();
        setActiveTab('posts');
      }
    } catch (error: any) {
      console.error('Failed to create post:', error);
      alert(error.response?.data?.error || 'Failed to create post');
    }
  };

  const togglePlatform = (platform: string) => {
    setNewPost(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      facebook: '📘',
      instagram: '📷',
      twitter: '🐦',
      linkedin: '💼',
      tiktok: '🎵',
      youtube: '📺'
    };
    return icons[platform.toLowerCase()] || '📱';
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      revoked: 'bg-gray-100 text-gray-800',
      error: 'bg-yellow-100 text-yellow-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  if (!token) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Please log in to access social posting features.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">📱 Social Media Management</h1>
          <p className="text-gray-600">Connect your social accounts and manage posts (secured by project)</p>
        </div>

        {/* Project Selection */}
        <div className="glass rounded-xl p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🎯 Select Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">-- Select a project --</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {selectedProject && (
            <p className="mt-2 text-sm text-gray-500">
              🔒 You can only see social accounts connected to this project
            </p>
          )}
        </div>

        {selectedProject ? (
          <>
            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setActiveTab('connections')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === 'connections'
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                    : 'glass text-gray-700 hover:bg-gray-50'
                }`}
              >
                🔗 Connections
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === 'posts'
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                    : 'glass text-gray-700 hover:bg-gray-50'
                }`}
              >
                📝 Posts
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                    : 'glass text-gray-700 hover:bg-gray-50'
                }`}
              >
                ➕ Create Post
              </button>
            </div>

            {/* Connections Tab */}
            {activeTab === 'connections' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Connected Accounts</h2>
                  <button
                    onClick={() => {
                      setShowConnectionModal(true);
                      loadAvailableLateProfiles();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    ➕ Connect Account
                  </button>
                </div>

                {connections.length === 0 ? (
                  <div className="glass rounded-xl p-12 text-center">
                    <p className="text-2xl mb-4">📱</p>
                    <p className="text-gray-600 mb-4">No social accounts connected to this project yet.</p>
                    <button
                      onClick={() => setShowConnectionModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Connect Your First Account
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connections.map((conn) => (
                      <div key={conn.id} className="glass rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-3xl">{getPlatformIcon(conn.platform)}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900">{conn.account_name || 'Unnamed Account'}</h3>
                              <p className="text-sm text-gray-500">{conn.account_handle || conn.platform}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(conn.connection_status)}`}>
                            {conn.connection_status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p>Profile: {conn.late_profile_name || conn.late_profile_id}</p>
                          <p>Platform: {conn.platform}</p>
                          {conn.last_synced_at && (
                            <p className="text-xs">Last synced: {new Date(conn.last_synced_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleRemoveConnection(conn.id)}
                          className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-all"
                        >
                          🗑️ Remove Connection
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Social Posts</h2>
                
                {posts.length === 0 ? (
                  <div className="glass rounded-xl p-12 text-center">
                    <p className="text-2xl mb-4">📝</p>
                    <p className="text-gray-600 mb-4">No posts yet for this project.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Create Your First Post
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post._id} className="glass rounded-xl p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {post.platforms.map(platform => (
                              <span key={platform} className="text-xl">
                                {getPlatformIcon(platform)}
                              </span>
                            ))}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {post.status}
                          </span>
                        </div>
                        <p className="text-gray-800 mb-3">{post.content}</p>
                        <div className="text-sm text-gray-500">
                          {post.scheduledFor && <p>Scheduled: {new Date(post.scheduledFor).toLocaleString()}</p>}
                          {post.publishedAt && <p>Published: {new Date(post.publishedAt).toLocaleString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Post Tab */}
            {activeTab === 'create' && (
              <div className="glass rounded-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h2>
                
                {connections.length === 0 ? (
                  <div className="text-center p-8">
                    <p className="text-gray-600 mb-4">You need to connect at least one social account first.</p>
                    <button
                      onClick={() => setActiveTab('connections')}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Go to Connections
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreatePost} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Post Content
                      </label>
                      <textarea
                        value={newPost.content}
                        onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="What do you want to share?"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Platforms
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'].map(platform => (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => togglePlatform(platform)}
                            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                              newPost.platforms.includes(platform)
                                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white'
                                : 'glass text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>{getPlatformIcon(platform)}</span>
                            <span className="capitalize">{platform}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Schedule (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={newPost.scheduledFor}
                        onChange={(e) => setNewPost({ ...newPost, scheduledFor: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDraft"
                        checked={newPost.isDraft}
                        onChange={(e) => setNewPost({ ...newPost, isDraft: e.target.checked })}
                        className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="isDraft" className="text-sm font-semibold text-gray-700">
                        Save as draft
                      </label>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                      >
                        📤 {newPost.isDraft ? 'Save Draft' : 'Create Post'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-2xl mb-4">🎯</p>
            <p className="text-gray-600">Please select a project to manage social media accounts.</p>
          </div>
        )}

        {/* Connection Modal */}
        {showConnectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Connect Social Account</h3>
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateConnection} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Late Profile ID
                  </label>
                  <input
                    type="text"
                    value={newConnection.lateProfileId}
                    onChange={(e) => setNewConnection({ ...newConnection, lateProfileId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="prof_abc123"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Get this from your Late.dev dashboard</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={newConnection.lateProfileName}
                    onChange={(e) => setNewConnection({ ...newConnection, lateProfileName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="My Business Profile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Platform
                  </label>
                  <select
                    value={newConnection.platform}
                    onChange={(e) => setNewConnection({ ...newConnection, platform: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={newConnection.accountName}
                    onChange={(e) => setNewConnection({ ...newConnection, accountName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="My Business Page"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Handle
                  </label>
                  <input
                    type="text"
                    value={newConnection.accountHandle}
                    onChange={(e) => setNewConnection({ ...newConnection, accountHandle: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="@mybusiness"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConnectionModal(false)}
                    className="flex-1 px-6 py-3 glass rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Connect
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialPosting;
