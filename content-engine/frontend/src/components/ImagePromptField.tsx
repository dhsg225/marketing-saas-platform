// [2025-10-19] - Reusable Image Prompt Field Component
// Provides image prompt input with saved prompt reuse functionality

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../contexts/UserContext';

interface ImagePromptFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  projectId?: string;
  className?: string;
  showSavedPrompts?: boolean;
  disabled?: boolean;
}

interface SavedPrompt {
  id: string;
  sourceType: 'post' | 'content_idea';
  sourceId: string;
  title: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
}

const ImagePromptField: React.FC<ImagePromptFieldProps> = ({
  value,
  onChange,
  placeholder = "Describe the image you want to generate...",
  label = "Image Prompt",
  projectId,
  className = "",
  showSavedPrompts = true,
  disabled = false
}) => {
  const { token } = useUser();
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showSavedPromptsDropdown, setShowSavedPromptsDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load saved prompts when component mounts or projectId changes
  useEffect(() => {
    if (showSavedPrompts && projectId && token) {
      loadSavedPrompts();
    }
  }, [projectId, token, showSavedPrompts]);

  const loadSavedPrompts = async () => {
    if (!projectId || !token) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5001/api/posts/image-prompts/${projectId}?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSavedPrompts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load saved prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavedPromptSelect = (prompt: SavedPrompt) => {
    onChange(prompt.prompt);
    setShowSavedPromptsDropdown(false);
  };

  const toggleSavedPrompts = () => {
    setShowSavedPromptsDropdown(!showSavedPromptsDropdown);
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {showSavedPrompts && savedPrompts.length > 0 && (
          <button
            type="button"
            onClick={toggleSavedPrompts}
            disabled={disabled}
            className="absolute top-2 right-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📋 Saved ({savedPrompts.length})
          </button>
        )}
      </div>

      {/* Saved Prompts Dropdown */}
      {showSavedPromptsDropdown && savedPrompts.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
            Saved Image Prompts
          </div>
          {savedPrompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => handleSavedPromptSelect(prompt)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-900 truncate">
                {prompt.title}
              </div>
              <div className="text-xs text-gray-500 truncate mt-1">
                {prompt.prompt}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {prompt.sourceType === 'post' ? '📝 Post' : '💡 Idea'} • {new Date(prompt.updatedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="mt-1 text-xs text-gray-500">
        Describe the visual elements, style, mood, and composition for AI image generation.
        {showSavedPrompts && savedPrompts.length > 0 && (
          <span className="ml-1">Click "Saved" to reuse previous prompts.</span>
        )}
      </p>
    </div>
  );
};

export default ImagePromptField;
