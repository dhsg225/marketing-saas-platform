import React, { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

interface PromptRefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalPrompt: string;
  postId?: string;
  contentIdeaId?: string;
  onImageGenerated?: (imageUrl: string) => void;
  title?: string;
  showOriginalImage?: boolean;
  originalImageUrl?: string;
}

const PromptRefinementModal: React.FC<PromptRefinementModalProps> = ({
  isOpen,
  onClose,
  originalPrompt,
  postId,
  contentIdeaId,
  onImageGenerated,
  title = "Refine Image Prompt",
  showOriginalImage = false,
  originalImageUrl
}) => {
  const [feedback, setFeedback] = useState('');
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFeedback('');
      setRefinedPrompt('');
      setSessionId(null);
      setConfidence(null);
      setError(null);
      setShowComparison(false);
    }
  }, [isOpen]);

  const handleRefinePrompt = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback to refine the prompt');
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const response = await fetch(api.getUrl('prompt-refinement'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refine',
          originalPrompt,
          feedback: feedback.trim(),
          postId,
          contentIdeaId
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRefinedPrompt(data.refinedPrompt);
        setSessionId(data.sessionId);
        setConfidence(data.confidence);
        setShowComparison(true);
      } else {
        setError(data.error || 'Failed to refine prompt');
      }
    } catch (err) {
      console.error('Refinement error:', err);
      setError('Failed to refine prompt. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!refinedPrompt.trim()) {
      setError('No refined prompt available');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(api.getUrl('ai/generate-image'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: refinedPrompt,
          postId,
          contentIdeaId,
          sessionId
        }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        // Call the callback if provided
        if (onImageGenerated) {
          onImageGenerated(data.imageUrl);
        }
        
        // Close the modal
        onClose();
      } else {
        setError(data.error || 'Failed to generate image');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualEdit = (value: string) => {
    setRefinedPrompt(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Original Prompt Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Original Prompt</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-gray-900 text-sm leading-relaxed">{originalPrompt}</p>
              </div>
              {showOriginalImage && originalImageUrl && (
                <div className="mt-3">
                  <img
                    src={originalImageUrl}
                    alt="Original image"
                    className="w-full max-w-sm rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>

            {/* Feedback Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe what you'd like to change about the image (e.g., 'make the background brighter', 'add more focus on the subject', 'change the style to be more modern')"
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Refine Button */}
            <div className="flex justify-center">
              <button
                onClick={handleRefinePrompt}
                disabled={!feedback.trim() || isRefining}
                className="btn-modern flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefining ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Refining...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    <span>Refine & Generate</span>
                  </>
                )}
              </button>
            </div>

            {/* Comparison Section */}
            {showComparison && refinedPrompt && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Refined Prompt</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Original</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-900 text-sm leading-relaxed">{originalPrompt}</p>
                    </div>
                  </div>

                  {/* Refined */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Refined</h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <textarea
                        value={refinedPrompt}
                        onChange={(e) => handleManualEdit(e.target.value)}
                        className="w-full h-24 text-gray-900 text-sm leading-relaxed bg-transparent border-none resize-none focus:outline-none"
                      />
                    </div>
                    {confidence !== null && (
                      <div className="mt-2 text-xs text-gray-500">
                        AI Confidence: {Math.round(confidence * 100)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleGenerateImage}
                    disabled={!refinedPrompt.trim() || isGenerating}
                    className="btn-modern bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        <span>Generating Image...</span>
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4" />
                        <span>Generate New Image</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptRefinementModal;
