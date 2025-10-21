import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';
import MediaPicker from '../components/MediaPicker';

interface LateProfile {
  _id: string;
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

interface SocialAccount {
  _id: string;
  profileId: string;
  platform: string;
  username: string;
  displayName: string;
  profilePicture: string;
  isActive: boolean;
  tokenExpiresAt: string;
  permissions: string[];
}

interface UsageStats {
  planName: string;
  billingPeriod: string;
  limits: {
    uploads: number;
    profiles: number;
  };
  usage: {
    uploads: number;
    profiles: number;
    lastReset: string;
  };
  canUpload: boolean;
  canCreateProfile: boolean;
}

const Publish: React.FC = () => {
  const { token } = useUser();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'connections'>('create');
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  
  // Data states
  const [profiles, setProfiles] = useState<LateProfile[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  
  // Form states
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
    color: '#4ade80'
  });
  
  const [newPost, setNewPost] = useState({
    content: '',
    platforms: [] as string[],
    publishNow: false,
    scheduledFor: '',
    timezone: 'UTC',
    mediaUrls: [] as string[]
  });
  
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Load initial data
  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [connectionResult] = await Promise.all([
        testConnection(),
        loadProfiles(),
        loadAccounts(),
        loadUsageStats()
      ]);
      
      setConnectionStatus(connectionResult ? 'connected' : 'failed');
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setConnectionStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (): Promise<boolean> => {
    try {
      const response = await axios.get('http://localhost:5001/api/social/test', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  const loadProfiles = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/social/profiles', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setProfiles(response.data.data?.profiles || []);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadAccounts = async (profileId?: string) => {
    try {
      const url = profileId ? 
        `http://localhost:5001/api/social/accounts?profileId=${profileId}` : 
        'http://localhost:5001/api/social/accounts';
      
      const response = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAccounts(response.data.data?.accounts || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/social/usage', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setUsageStats(response.data.data);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const createProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfile.name.trim()) return;

    try {
      await axios.post('http://localhost:5001/api/social/profiles', newProfile, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setNewProfile({ name: '', description: '', color: '#4ade80' });
      loadProfiles();
      loadUsageStats();
    } catch (error: any) {
      console.error('Failed to create profile:', error);
      alert('Failed to create profile: ' + (error.response?.data?.error || error.message));
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.content.trim() || newPost.platforms.length === 0) {
      alert('Please provide content and select at least one platform');
      return;
    }

    try {
      const postData = {
        content: newPost.content,
        platforms: newPost.platforms.map(accountId => {
          const account = accounts.find(acc => acc._id === accountId);
          return {
            platform: account?.platform,
            accountId: accountId
          };
        }),
        publishNow: newPost.publishNow,
        ...(newPost.scheduledFor && !newPost.publishNow && {
          scheduledFor: newPost.scheduledFor,
          timezone: newPost.timezone
        })
      };

      await axios.post('http://localhost:5001/api/social/posts', postData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert('Post created successfully!');
      setNewPost({
        content: '',
        platforms: [],
        publishNow: false,
        scheduledFor: '',
        timezone: 'UTC',
        mediaUrls: []
      });
      loadUsageStats();
    } catch (error: any) {
      console.error('Failed to create post:', error);
      alert('Failed to create post: ' + (error.response?.data?.error || error.message));
    }
  };

  const togglePlatform = (accountId: string) => {
    setNewPost(prev => ({
      ...prev,
      platforms: prev.platforms.includes(accountId)
        ? prev.platforms.filter(id => id !== accountId)
        : [...prev.platforms, accountId]
    }));
  };

  const handleSelectMedia = (mediaUrl: string) => {
    setNewPost(prev => ({
      ...prev,
      mediaUrls: [...prev.mediaUrls, mediaUrl]
    }));
  };

  const removeMedia = (index: number) => {
    setNewPost(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading publishing tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            📱 Publish Content
          </h1>
          <p className="text-gray-600 text-lg">
            Create and schedule your social media posts
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-xl border-b border-gray-200">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              ✍️ Create Post
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'connections'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🔗 Connections & Setup
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl shadow-xl p-6">
          {activeTab === 'create' && (
            <div className="space-y-6">
              {/* Create Post Form */}
              <form onSubmit={createPost} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    📝 Post Content
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
                    rows={6}
                    placeholder="What would you like to share with your audience?"
                    required
                  />
                  <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
                    <span>{newPost.content.length} characters</span>
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      🖼️ Add Media
                    </button>
                  </div>
                </div>

                {/* Media Preview */}
                {newPost.mediaUrls.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      📎 Attached Media ({newPost.mediaUrls.length})
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {newPost.mediaUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {accounts.length > 0 ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      🎯 Select Platforms
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {accounts.map((account) => (
                        <label 
                          key={account._id} 
                          className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                            newPost.platforms.includes(account._id)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newPost.platforms.includes(account._id)}
                            onChange={() => togglePlatform(account._id)}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {account.platform.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{account.displayName}</div>
                              <div className="text-sm text-gray-600">@{account.username}</div>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-gray-500 capitalize px-2 py-1 bg-gray-100 rounded">
                            {account.platform}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h3 className="font-semibold text-yellow-900 mb-1">No Social Accounts Connected</h3>
                        <p className="text-yellow-800 text-sm mb-3">
                          You need to connect your social media accounts before you can publish posts.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('connections')}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                        >
                          Go to Connections & Setup →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={newPost.publishNow}
                        onChange={(e) => setNewPost({ ...newPost, publishNow: e.target.checked, scheduledFor: '' })}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">🚀 Publish Immediately</div>
                        <div className="text-xs text-gray-600">Post will go live right away</div>
                      </div>
                    </label>
                  </div>
                  
                  {!newPost.publishNow && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⏰ Schedule For
                      </label>
                      <input
                        type="datetime-local"
                        value={newPost.scheduledFor}
                        onChange={(e) => setNewPost({ ...newPost, scheduledFor: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!newPost.content.trim() || newPost.platforms.length === 0}
                  className="w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-lg font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {newPost.publishNow ? '🚀 Publish Now' : '📅 Schedule Post'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-8">
              {/* Connection Status */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Late API Connection
                    </h2>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-500' : 
                        connectionStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-gray-700 font-medium">
                        {connectionStatus === 'connected' ? '✅ Connected' : 
                         connectionStatus === 'failed' ? '❌ Connection Failed' : '⏳ Testing...'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={loadInitialData}
                    className="px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300 shadow-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Usage Stats */}
              {usageStats && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    📊 Usage Statistics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium mb-1">Plan</div>
                      <div className="text-3xl font-bold text-blue-900 mb-1">{usageStats.planName}</div>
                      <div className="text-xs text-blue-600 capitalize">{usageStats.billingPeriod}</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                      <div className="text-sm text-green-600 font-medium mb-1">Posts Used</div>
                      <div className="text-3xl font-bold text-green-900 mb-1">
                        {usageStats.usage.uploads}/{usageStats.limits.uploads === -1 ? '∞' : usageStats.limits.uploads}
                      </div>
                      <div className="text-xs text-green-600">
                        {usageStats.canUpload ? '✅ Can post' : '❌ Limit reached'}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium mb-1">Profiles</div>
                      <div className="text-3xl font-bold text-purple-900 mb-1">
                        {usageStats.usage.profiles}/{usageStats.limits.profiles}
                      </div>
                      <div className="text-xs text-purple-600">
                        {usageStats.canCreateProfile ? '✅ Can create' : '❌ Limit reached'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profiles Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  📋 Late Profiles
                </h2>
                
                {/* Create Profile Form */}
                <form onSubmit={createProfile} className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Name</label>
                      <input
                        type="text"
                        value={newProfile.name}
                        onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., Personal Brand"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <input
                        type="text"
                        value={newProfile.description}
                        onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Brief description"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full px-4 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                      >
                        ➕ Create Profile
                      </button>
                    </div>
                  </div>
                </form>

                {/* Profiles List */}
                <div className="space-y-3">
                  {profiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg mb-2">📋 No profiles yet</p>
                      <p className="text-sm">Create your first profile to get started</p>
                    </div>
                  ) : (
                    profiles.map((profile) => (
                      <div key={profile._id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: profile.color }}
                          ></div>
                          <div>
                            <h3 className="font-medium text-gray-900">{profile.name}</h3>
                            <p className="text-sm text-gray-600">{profile.description}</p>
                          </div>
                          {profile.isDefault && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => loadAccounts(profile._id)}
                          className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          View Accounts
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Social Accounts */}
              {accounts.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🔗 Connected Social Accounts
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((account) => (
                      <div key={account._id} className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {account.platform.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{account.displayName}</h3>
                            <p className="text-sm text-gray-600">@{account.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500 capitalize font-medium">{account.platform}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelectMedia={handleSelectMedia}
      />
    </div>
  );
};

export default Publish;

