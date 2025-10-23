import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import axios from 'axios';

interface PromptRefinementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  contentIdeaId?: string;
  originalPrompt: string;
  currentPrompt: string;
  onPromptRefined: (refinedPrompt: string) => void;
  onImageGenerated?: (imageUrl: string) => void;
}

interface RefinementSession {
  sessionId: string;
  originalPrompt: string;
  currentPrompt: string;
  status: string;
}

interface PromptIteration {
  id: string;
  iterationNumber: number;
  promptText: string;
  iterationType: string;
  aiConfidence?: number;
  createdAt: string;
}

interface Feedback {
  id: string;
  feedbackType: string;
  feedbackText: string;
  aiSuggestedPrompt?: string;
  isApproved: boolean;
  createdAt: string;
}

const PromptRefinementDialog: React.FC<PromptRefinementDialogProps> = ({
  isOpen,
  onClose,
  postId,
  contentIdeaId,
  originalPrompt,
  currentPrompt,
  onPromptRefined,
  onImageGenerated
}) => {
  const { token } = useUser();
  const [session, setSession] = useState<RefinementSession | null>(null);
  const [iterations, setIterations] = useState<PromptIteration[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [clientFeedback, setClientFeedback] = useState('');
  const [manualEdit, setManualEdit] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedIteration, setSelectedIteration] = useState<PromptIteration | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize session when dialog opens
  useEffect(() => {
    if (isOpen && !session) {
      initializeSession();
    }
  }, [isOpen]);

  const initializeSession = async () => {
    try {
      const response = await axios.post(
        api.getUrl('prompt-refinement'),
        {
          postId,
          contentIdeaId,
          originalPrompt,
          userId: token // Assuming token contains user ID
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSession(response.data.data);
        loadSessionDetails(response.data.data.sessionId);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setError('Failed to initialize refinement session');
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const response = await axios.get(
        api.getUrl(`prompt-refinement?sessionId=${sessionId}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const data = response.data.data;
        setIterations(data.iterations || []);
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Failed to load session details:', error);
    }
  };

  const handleRefinePrompt = async () => {
    if (!session || (!clientFeedback && !manualEdit)) return;

    setIsRefining(true);
    setError(null);

    try {
      const response = await axios.put(
        api.getUrl('prompt-refinement'),
        {
          sessionId: session.sessionId,
          feedback: clientFeedback || null,
          manualEdit: manualEdit || null,
          userId: token
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const data = response.data.data;
        
        // Update local state
        setSession(prev => prev ? {
          ...prev,
          currentPrompt: data.refinedPrompt
        } : null);

        // Add to iterations
        const newIteration: PromptIteration = {
          id: data.iterationId,
          iterationNumber: data.iterationNumber,
          promptText: data.refinedPrompt,
          iterationType: data.isManualEdit ? 'manual_edit' : 'ai_refined',
          aiConfidence: data.aiConfidence,
          createdAt: new Date().toISOString()
        };
        
        setIterations(prev => [...prev, newIteration]);
        setSelectedIteration(newIteration);
        setShowComparison(true);

        // Clear inputs
        setClientFeedback('');
        setManualEdit('');

        // Notify parent component
        onPromptRefined(data.refinedPrompt);
      }
    } catch (error) {
      console.error('Failed to refine prompt:', error);
      setError('Failed to refine prompt. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateImage = async (iteration: PromptIteration) => {
    if (!session) return;

    setIsGenerating(true);
    setError(null);

    try {
      // This would integrate with your existing image generation system
      // For now, we'll simulate the process
      const response = await axios.post(
        api.getUrl('ai/generate-image'),
        {
          prompt: iteration.promptText,
          sessionId: session.sessionId,
          iterationId: iteration.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && onImageGenerated) {
        onImageGenerated(response.data.imageUrl);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveIteration = (iteration: PromptIteration) => {
    setSelectedIteration(iteration);
    onPromptRefined(iteration.promptText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            🎨 AI Prompt Refinement
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Feedback & Refinement */}
            <div className="space-y-6">
              {/* Original vs Current Prompt */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">📝 Prompt History</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Original Prompt:</label>
                    <p className="text-sm text-gray-800 bg-white p-2 rounded border">
                      {originalPrompt}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Prompt:</label>
                    <p className="text-sm text-gray-800 bg-white p-2 rounded border">
                      {session?.currentPrompt || currentPrompt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💬 Client Feedback
                </label>
                <textarea
                  value={clientFeedback}
                  onChange={(e) => setClientFeedback(e.target.value)}
                  placeholder="e.g., 'make the background brighter' or 'add more focus on the subject'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Manual Edit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ✏️ Manual Edit (Optional)
                </label>
                <textarea
                  value={manualEdit}
                  onChange={(e) => setManualEdit(e.target.value)}
                  placeholder="Or manually edit the prompt directly..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Refine Button */}
              <button
                onClick={handleRefinePrompt}
                disabled={isRefining || (!clientFeedback && !manualEdit)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isRefining ? '🔄 Refining...' : '✨ Refine Prompt with AI'}
              </button>
            </div>

            {/* Right Column - Iterations & Comparison */}
            <div className="space-y-6">
              {/* Iterations List */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">🔄 Iterations ({iterations.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {iterations.map((iteration) => (
                    <div
                      key={iteration.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedIteration?.id === iteration.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedIteration(iteration)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          #{iteration.iterationNumber} - {iteration.iterationType.replace('_', ' ')}
                        </span>
                        {iteration.aiConfidence && (
                          <span className="text-xs text-gray-500">
                            Confidence: {Math.round(iteration.aiConfidence * 100)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {iteration.promptText}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveIteration(iteration);
                          }}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateImage(iteration);
                          }}
                          disabled={isGenerating}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:bg-gray-100"
                        >
                          {isGenerating ? '🔄' : '🎨'} Generate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              {showComparison && selectedIteration && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">🔍 Comparison</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Previous:</label>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border mt-1">
                        {iterations.length > 1 ? iterations[iterations.length - 2]?.promptText : originalPrompt}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Refined:</label>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border mt-1">
                        {selectedIteration.promptText}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedIteration) {
                onPromptRefined(selectedIteration.promptText);
              }
              onClose();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            ✅ Apply Refined Prompt
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptRefinementDialog;
