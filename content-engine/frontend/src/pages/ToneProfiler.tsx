import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

interface ToneProfile {
  tone_id: string;
  name: string;
  description: string;
  system_instruction: string;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  is_public: boolean;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

const ToneProfiler: React.FC = () => {
  const { selectedOrganization, selectedClient, selectedProject } = useUser(); // TODO: Use these for organization/client/project filtering
  const [toneProfiles, setToneProfiles] = useState<ToneProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ToneProfile | null>(null);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_instruction: '',
    is_public: false
  });
  
  // AI Suggestion state
  const [suggestionForm, setSuggestionForm] = useState({
    industry: '',
    style_keywords: '',
    tone_description: ''
  });

  const { token } = useUser();

  // Load tone profiles
  const loadToneProfiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/tone-profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setToneProfiles(response.data.data || []);
    } catch (error) {
      console.error('Failed to load tone profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadToneProfiles();
    }
  }, [token]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.system_instruction) {
      alert('Name and System Instruction are required');
      return;
    }

    try {
      if (editingProfile) {
        // Update existing profile
        await axios.put(
          `http://localhost:5001/api/tone-profiles/${editingProfile.tone_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new profile
        await axios.post(
          'http://localhost:5001/api/tone-profiles',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        system_instruction: '',
        is_public: false
      });
      setEditingProfile(null);
      loadToneProfiles();
    } catch (error) {
      console.error('Failed to save tone profile:', error);
      alert('Failed to save tone profile');
    }
  };

  // Handle edit
  const handleEdit = (profile: ToneProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || '',
      system_instruction: profile.system_instruction,
      is_public: profile.is_public
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle delete
  const handleDelete = async (toneId: string) => {
    if (!window.confirm('Are you sure you want to delete this tone profile?')) return;

    try {
      await axios.delete(`http://localhost:5001/api/tone-profiles/${toneId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadToneProfiles();
    } catch (error: any) {
      console.error('Failed to delete tone profile:', error);
      alert(error.response?.data?.error || 'Failed to delete tone profile');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      description: '',
      system_instruction: '',
      is_public: false
    });
  };

  // Handle AI suggestion
  const handleAISuggestion = async () => {
    try {
      const response = await axios.post(
        'http://localhost:5001/api/tone-profiles/suggest',
        suggestionForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFormData(prev => ({
        ...prev,
        system_instruction: response.data.data.system_instruction
      }));
      
      setShowAISuggestion(false);
      alert('AI suggestion applied! You can edit it as needed.');
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      alert('Failed to get AI suggestion');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2">🎨 Advanced Tone & Style Profiler</h1>
        <p className="text-gray-600">
          Create and manage AI system instructions for consistent brand voice across all generated content.
        </p>
      </div>

      {/* Create/Edit Form */}
      <div className="glass rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">
          {editingProfile ? '✏️ Edit Tone Profile' : '✨ Create New Tone Profile'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Profile Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="modern-input w-full"
                placeholder="e.g., Australian Ocker Rough, Corporate Professional"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                A memorable name to identify this tone profile
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="modern-input w-full"
                placeholder="Brief description of when to use this tone"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                System Instruction * <span className="text-xs text-gray-500">(What the AI will follow)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAISuggestion(!showAISuggestion)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                🤖 AI Suggest
              </button>
            </div>
            
            {showAISuggestion && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <h3 className="font-semibold text-sm text-blue-900">AI Tone Suggestion</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={suggestionForm.industry}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, industry: e.target.value })}
                    className="modern-input text-sm"
                    placeholder="Industry (e.g., Italian Fine Dining)"
                  />
                  <input
                    type="text"
                    value={suggestionForm.style_keywords}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, style_keywords: e.target.value })}
                    className="modern-input text-sm"
                    placeholder="Style keywords (e.g., casual, professional)"
                  />
                  <input
                    type="text"
                    value={suggestionForm.tone_description}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, tone_description: e.target.value })}
                    className="modern-input text-sm"
                    placeholder="Additional context"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAISuggestion}
                  className="btn-modern text-sm"
                >
                  Generate Suggestion
                </button>
              </div>
            )}
            
            <textarea
              value={formData.system_instruction}
              onChange={(e) => setFormData({ ...formData, system_instruction: e.target.value })}
              className="modern-textarea w-full"
              rows={10}
              placeholder="Enter the exact instructions the AI should follow. Be specific about tone, style, vocabulary, formatting, etc.&#10;&#10;Example:&#10;You are a professional content writer with expertise in Italian fine dining. Write in a warm, sophisticated tone that balances elegance with approachability. Use culinary terminology accurately but ensure content is accessible to food enthusiasts of all levels. Focus on storytelling and sensory details."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 <strong>Tip:</strong> This instruction is passed directly to the AI model. Be clear, specific, and include examples of what you want.
            </p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-semibold text-gray-700">
                🌐 Make this profile public (visible to all users in your organization)
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-modern hover-lift">
              {editingProfile ? '💾 Update Profile' : '✨ Create Profile'}
            </button>
            {editingProfile && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tone Profiles List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📚 Your Tone Profiles</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading tone profiles...</p>
          </div>
        ) : toneProfiles.length === 0 ? (
          <div className="text-center py-12 glass rounded-xl">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Tone Profiles Yet</h3>
            <p className="text-gray-500">Create your first tone profile to define consistent brand voice for AI-generated content.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {toneProfiles.map((profile) => (
              <div key={profile.tone_id} className="glass rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                      {profile.is_public && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          🌐 Public
                        </span>
                      )}
                      {!profile.is_active && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-sm text-gray-600 mb-2">{profile.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>📊 Used {profile.usage_count} times</span>
                      {profile.last_used_at && (
                        <span>🕒 Last used: {new Date(profile.last_used_at).toLocaleDateString()}</span>
                      )}
                      {profile.owner_name && (
                        <span>👤 By: {profile.owner_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(profile.tone_id)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">System Instruction:</h4>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(profile.system_instruction);
                        alert('System instruction copied to clipboard!');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                      {profile.system_instruction}
                    </pre>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  Created: {new Date(profile.created_at).toLocaleDateString()} • 
                  Updated: {new Date(profile.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToneProfiler;
