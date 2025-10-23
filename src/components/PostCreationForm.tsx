// [2025-10-19] - Example Post Creation Form with Image Prompt Integration
import api from '../services/api';
// Demonstrates how to use the ImagePromptField component in post creation

import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import EnhancedImagePromptField from './EnhancedImagePromptField';
import axios from 'axios';

interface PostCreationFormProps {
  onPostCreated?: (post: any) => void;
  onClose?: () => void;
}

const PostCreationForm: React.FC<PostCreationFormProps> = ({
  onPostCreated,
  onClose
}) => {
  const { selectedProject, projects, token } = useUser();
  
  // Get the current project object from the selected project ID
  const currentProject = projects.find(p => p.id === selectedProject);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: 'instagram',
    post_type_id: '',
    priority: 'medium',
    full_content: '',
    full_visual_url: '',
    full_visual_alt_text: '',
    image_prompt: '',
    tags: [],
    hashtags: [],
    mentions: [],
    scheduled_date: '',
    scheduled_time: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        api.getUrl('posts/create/all-at-once'),
        {
          ...formData,
          project_id: currentProject.id
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        onPostCreated?.(response.data.data);
        // Reset form
        setFormData({
          title: '',
          description: '',
          platform: 'instagram',
          post_type_id: '',
          priority: 'medium',
          full_content: '',
          full_visual_url: '',
          full_visual_alt_text: '',
          image_prompt: '',
          tags: [],
          hashtags: [],
          mentions: [],
          scheduled_date: '',
          scheduled_time: ''
        });
        onClose?.();
      }
    } catch (error: any) {
      console.error('Failed to create post:', error);
      setError(error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Please select a project to create posts.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={formData.platform}
              onChange={(e) => handleInputChange('platform', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
              <option value="linkedin">LinkedIn</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <textarea
            value={formData.full_content}
            onChange={(e) => handleInputChange('full_content', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your post content here..."
          />
        </div>

        {/* Enhanced Image Prompt Field with AI Refinement */}
        <EnhancedImagePromptField
          value={formData.image_prompt}
          onChange={(value) => handleInputChange('image_prompt', value)}
          label="🎨 AI Image Generation Prompt"
          placeholder="Describe the image you want to generate for this post..."
          projectId={currentProject.id}
          showSavedPrompts={true}
          showRefinementButton={true}
          onImageGenerated={(imageUrl: string) => {
            setFormData(prev => ({
              ...prev,
              full_visual_url: imageUrl,
              full_visual_alt_text: `AI generated image for: ${formData.title || 'Untitled Post'}`
            }));
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visual URL
            </label>
            <input
              type="url"
              value={formData.full_visual_url}
              onChange={(e) => handleInputChange('full_visual_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Text
            </label>
            <input
              type="text"
              value={formData.full_visual_alt_text}
              onChange={(e) => handleInputChange('full_visual_alt_text', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the image for accessibility"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date
            </label>
            <input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Time
            </label>
            <input
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex space-x-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostCreationForm;
