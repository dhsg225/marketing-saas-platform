import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import EnhancedImagePromptField from './EnhancedImagePromptField';
import axios from 'axios';
import api from '../services/api';

interface PostCreationFormWithRefinementProps {
  onPostCreated?: (post: any) => void;
  onClose?: () => void;
}

const PostCreationFormWithRefinement: React.FC<PostCreationFormWithRefinementProps> = ({
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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageGenerated = (imageUrl: string) => {
    setGeneratedImageUrl(imageUrl);
    setFormData(prev => ({
      ...prev,
      full_visual_url: imageUrl,
      full_visual_alt_text: `AI generated image for: ${formData.title || 'Untitled Post'}`
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        api.getUrl('posts'),
        {
          ...formData,
          project_id: currentProject.id,
          // Include the generated image if available
          ...(generatedImageUrl && {
            full_visual_url: generatedImageUrl,
            full_visual_alt_text: `AI generated image for: ${formData.title}`
          })
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log('✅ Post created successfully:', response.data.data);
        if (onPostCreated) {
          onPostCreated(response.data.data);
        }
        if (onClose) {
          onClose();
        }
      } else {
        setError(response.data.error || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('❌ Post creation error:', error);
      setError(error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        ✨ Create Post with AI Image Refinement
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Post Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter post title..."
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
            </select>
          </div>
        </div>

        {/* Content */}
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

        {/* Enhanced Image Prompt Field with Refinement */}
        <EnhancedImagePromptField
          value={formData.image_prompt}
          onChange={(value) => handleInputChange('image_prompt', value)}
          label="🎨 AI Image Generation Prompt"
          placeholder="Describe the image you want to generate for this post..."
          projectId={currentProject?.id}
          showSavedPrompts={true}
          showRefinementButton={true}
          onImageGenerated={handleImageGenerated}
        />

        {/* Generated Image Preview */}
        {generatedImageUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🖼️ Generated Image Preview
            </label>
            <div className="relative">
              <img
                src={generatedImageUrl}
                alt="Generated image"
                className="w-full max-w-md h-48 object-cover rounded-lg border"
              />
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedImageUrl(null);
                    setFormData(prev => ({
                      ...prev,
                      full_visual_url: '',
                      full_visual_alt_text: ''
                    }));
                  }}
                  className="bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-opacity-70"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scheduling */}
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>

      {/* Feature Benefits */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">✨ AI-Powered Image Refinement Benefits</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Maintain Original Vision:</strong> Keep the original prompt while iterating based on feedback</li>
          <li>• <strong>Client Feedback Loop:</strong> Structured way to incorporate client suggestions</li>
          <li>• <strong>AI Prompt Engineering:</strong> AI suggests improved prompts that address feedback</li>
          <li>• <strong>Side-by-Side Comparison:</strong> See original vs refined prompts before generating</li>
          <li>• <strong>Iteration History:</strong> Track all prompt versions and their effectiveness</li>
          <li>• <strong>One-Click Generation:</strong> Generate images directly from refined prompts</li>
        </ul>
      </div>
    </div>
  );
};

export default PostCreationFormWithRefinement;
