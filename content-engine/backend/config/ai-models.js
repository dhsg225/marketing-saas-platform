// [2025-10-18] - AI Model Configuration
// Centralized configuration for all AI models used in the system

const AI_MODELS = {
  // Document Processing Models
  DOCUMENT_ANALYSIS: {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 4000,
    description: "Fast document structure analysis",
    use_case: "First pass of document processing"
  },
  
  DOCUMENT_EXTRACTION: {
    model: "claude-3-5-haiku-20241022", 
    max_tokens: 8000,
    description: "High-speed content extraction from documents",
    use_case: "Second pass - extract all content items from CSV/Excel/PDF"
  },
  
  // Content Generation Models
  CONTENT_GENERATION: {
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 8000,
    description: "Creative content generation and ideation",
    use_case: "AI content idea generation, creative writing"
  },
  
  // General Purpose Models
  GENERAL_ANALYSIS: {
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    description: "General analysis and reasoning tasks",
    use_case: "Dashboard analysis, user queries, complex reasoning"
  },
  
  // Fast Processing Models
  QUICK_TASKS: {
    model: "claude-3-5-haiku-20241022",
    max_tokens: 2000,
    description: "Fast, lightweight processing",
    use_case: "Quick responses, simple analysis, bulk operations"
  }
};

// Model Performance Characteristics
const MODEL_INFO = {
  "claude-3-5-haiku-20241022": {
    name: "Claude 3.5 Haiku",
    speed: "Very Fast",
    cost: "Low",
    intelligence: "High",
    best_for: ["Bulk processing", "CSV/Excel parsing", "Fast extraction", "High-volume tasks"],
    token_limit: 200000,
    output_limit: 32000
  },
  
  "claude-3-5-sonnet-20241022": {
    name: "Claude 3.5 Sonnet", 
    speed: "Medium",
    cost: "Medium",
    intelligence: "Very High",
    best_for: ["Creative writing", "Complex analysis", "Reasoning", "Production tasks"],
    token_limit: 200000,
    output_limit: 32000
  },
  
  "claude-3-opus-20240229": {
    name: "Claude 3 Opus",
    speed: "Slow", 
    cost: "High",
    intelligence: "Highest",
    best_for: ["Complex reasoning", "Nuanced analysis", "Research", "Critical thinking"],
    token_limit: 200000,
    output_limit: 32000
  }
};

// Helper function to get model config
function getModelConfig(taskType) {
  return AI_MODELS[taskType] || AI_MODELS.GENERAL_ANALYSIS;
}

// Helper function to get model info
function getModelInfo(modelId) {
  return MODEL_INFO[modelId] || null;
}

// Helper function to list all available models
function getAllModels() {
  return Object.keys(MODEL_INFO);
}

// Helper function to get models by use case
function getModelsByUseCase(useCase) {
  return Object.entries(MODEL_INFO)
    .filter(([_, info]) => info.best_for.includes(useCase))
    .map(([id, info]) => ({ id, ...info }));
}

module.exports = {
  AI_MODELS,
  MODEL_INFO,
  getModelConfig,
  getModelInfo,
  getAllModels,
  getModelsByUseCase
};
