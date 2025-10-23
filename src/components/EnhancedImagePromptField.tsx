import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import ImagePromptField from './ImagePromptField';
import PromptRefinementDialog from './PromptRefinementDialog';
import api from '../services/api';

interface EnhancedImagePromptFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  projectId?: string;
  className?: string;
  showSavedPrompts?: boolean;
  disabled?: boolean;
  postId?: string;
  contentIdeaId?: string;
  showRefinementButton?: boolean;
  onImageGenerated?: (imageUrl: string) => void;
}

const EnhancedImagePromptField: React.FC<EnhancedImagePromptFieldProps> = ({
  value,
  onChange,
  placeholder = "Describe the image you want to generate...",
  label = "Image Prompt",
  projectId,
  className = "",
  showSavedPrompts = true,
  disabled = false,
  postId,
  contentIdeaId,
  showRefinementButton = true,
  onImageGenerated
}) => {
  const { token } = useUser();
  const [showRefinementDialog, setShowRefinementDialog] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Store original prompt when value changes
  useEffect(() => {
    if (value && !originalPrompt) {
      setOriginalPrompt(value);
    }
  }, [value, originalPrompt]);

  const handleRefinementClick = () => {
    if (value) {
      setShowRefinementDialog(true);
    }
  };

  const handlePromptRefined = (refinedPrompt: string) => {
    onChange(refinedPrompt);
    setShowRefinementDialog(false);
  };

  const handleImageGenerated = async (imageUrl: string) => {
    setGeneratedImageUrl(imageUrl);
    setIsGeneratingImage(false);
    
    // Call the parent component's callback if provided
    if (onImageGenerated) {
      onImageGenerated(imageUrl);
    }
    
    // Optionally save the generated image to the asset library
    if (projectId && token) {
      try {
        const response = await fetch(api.getUrl('assets'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            file_name: `AI Generated - ${value.substring(0, 30)}...`,
            storage_path: imageUrl,
            url: imageUrl,
            scope: 'project',
            project_id: projectId,
            metadata: {
              aiGenerated: true,
              prompt: value,
              generatedAt: new Date().toISOString(),
              refinementSession: true
            }
          })
        });

        if (response.ok) {
          console.log('✅ Generated image saved to asset library');
        }
      } catch (error) {
        console.error('Failed to save generated image:', error);
      }
    }
  };

  const handleGenerateImage = async () => {
    if (!value || !token) return;

    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);

    try {
      // Use your existing AI image generation endpoint
      const response = await fetch(api.getUrl('ai/generate-image'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: value,
          projectId: projectId,
          postId: postId,
          contentIdeaId: contentIdeaId
        })
      });

      const result = await response.json();
      
      if (result.success && result.imageUrl) {
        handleImageGenerated(result.imageUrl);
      } else {
        throw new Error(result.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Enhanced Image Prompt Field */}
      <div className="relative">
        <ImagePromptField
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          label={label}
          projectId={projectId}
          className={className}
          showSavedPrompts={showSavedPrompts}
          disabled={disabled}
        />
        
        {/* Refinement Button */}
        {showRefinementButton && value && !disabled && (
          <button
            type="button"
            onClick={handleRefinementClick}
            className="absolute top-0 right-0 mt-8 mr-2 px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
            title="Refine prompt with AI based on feedback"
          >
            🎨 Refine
          </button>
        )}
      </div>

      {/* Action Buttons */}
      {value && !disabled && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={isGeneratingImage}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
          >
            {isGeneratingImage ? '🔄 Generating...' : '🎨 Generate Image'}
          </button>
          
          {showRefinementButton && (
            <button
              type="button"
              onClick={handleRefinementClick}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
            >
              ✨ Refine Prompt
            </button>
          )}
        </div>
      )}

      {/* Generated Image Preview */}
      {generatedImageUrl && (
        <div className="mt-3">
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
                onClick={() => setGeneratedImageUrl(null)}
                className="bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-opacity-70"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refinement Dialog */}
      <PromptRefinementDialog
        isOpen={showRefinementDialog}
        onClose={() => setShowRefinementDialog(false)}
        postId={postId}
        contentIdeaId={contentIdeaId}
        originalPrompt={originalPrompt}
        currentPrompt={value}
        onPromptRefined={handlePromptRefined}
        onImageGenerated={handleImageGenerated}
      />
    </div>
  );
};

export default EnhancedImagePromptField;
