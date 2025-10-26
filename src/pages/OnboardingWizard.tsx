// Onboarding Wizard - Self-Service B2B Onboarding Flow
// [Oct 24, 2025] - 6-step wizard for new user onboarding
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';
import api from '../services/api';

interface OnboardingData {
  // Step 2: Business Info
  industry: string;
  companySize: string;
  useCase: string;
  
  // Step 3: Client Setup
  clientName: string;
  clientIndustry: string;
  isSelfClient: boolean;
  
  // Step 4: Project Setup
  projectName: string;
  contentTypes: string[];
  
  // Step 5: Brand Setup
  brandColors: string[];
  logoUrl?: string;
  toneWords: string[];
  
  // Step 6: Sample Content
  samplePrompt: string;
  sampleContentId?: string;
}

const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, selectedOrganization, setSelectedClient, setSelectedProject } = useUser();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    industry: '',
    companySize: '',
    useCase: '',
    clientName: '',
    clientIndustry: '',
    isSelfClient: true,
    projectName: '',
    contentTypes: [],
    brandColors: [],
    toneWords: [],
    samplePrompt: ''
  });

  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [createdClient, setCreatedClient] = useState<any>(null);
  const [createdProject, setCreatedProject] = useState<any>(null);

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    // If user has already completed onboarding, redirect to dashboard
    if (user?.onboarding_completed) {
      navigate('/');
    }
  }, [user, navigate]);

  const updateOnboardingStep = (formData: any) => {
    setOnboardingData(prev => ({ ...prev, ...formData }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const skipOnboarding = async () => {
    if (window.confirm('Are you sure you want to skip onboarding? You can always set this up later in Settings.')) {
      try {
        // Mark onboarding as completed (skipped)
        await axios.post(api.getUrl('auth/complete-onboarding'), {
          userId: user?.id,
          skipped: true
        });
        
        navigate('/');
      } catch (error) {
        console.error('Failed to skip onboarding:', error);
      }
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    
    try {
      // Mark onboarding as completed
      await axios.post(api.getUrl('auth/complete-onboarding'), {
        userId: user?.id,
        data: onboardingData
      });
      
      console.log('✅ Onboarding completed!');
      
      // Set the created client and project in context
      if (createdClient) {
        setSelectedClient(createdClient.id);
      }
      if (createdProject) {
        setSelectedProject(createdProject.id);
      }
      
      // Redirect to dashboard
      navigate('/');
    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
      setError('Failed to save onboarding data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Welcome to Cognito! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Let's get you set up in just a few minutes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <button
              onClick={skipOnboarding}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip for now
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2">
            {[1, 2, 3, 4, 5, 6].map(step => (
              <div
                key={step}
                className={`text-xs ${
                  step <= currentStep ? 'text-purple-600 font-medium' : 'text-gray-400'
                }`}
              >
                {step === 1 && 'Welcome'}
                {step === 2 && 'Business'}
                {step === 3 && 'Client'}
                {step === 4 && 'Project'}
                {step === 5 && 'Brand'}
                {step === 6 && 'Generate'}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <WelcomeStep 
              onNext={nextStep}
              companyName={user?.company_name || ''}
            />
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <BusinessInfoStep
              data={onboardingData}
              onUpdate={updateOnboardingStep}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {/* Step 3: Client Setup */}
          {currentStep === 3 && (
            <ClientSetupStep
              data={onboardingData}
              onUpdate={updateOnboardingStep}
              onNext={nextStep}
              onBack={prevStep}
              onClientCreated={setCreatedClient}
              organizationId={selectedOrganization}
            />
          )}

          {/* Step 4: Project Setup */}
          {currentStep === 4 && (
            <ProjectSetupStep
              data={onboardingData}
              onUpdate={updateOnboardingStep}
              onNext={nextStep}
              onBack={prevStep}
              onProjectCreated={setCreatedProject}
              clientId={createdClient?.id}
            />
          )}

          {/* Step 5: Brand Setup */}
          {currentStep === 5 && (
            <BrandSetupStep
              data={onboardingData}
              onUpdate={updateOnboardingStep}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {/* Step 6: Sample Content Generation */}
          {currentStep === 6 && (
            <SampleContentStep
              data={onboardingData}
              onUpdate={updateOnboardingStep}
              onBack={prevStep}
              onComplete={completeOnboarding}
              onContentGenerated={setGeneratedContent}
              projectId={createdProject?.id}
              loading={loading}
            />
          )}

        </div>

      </div>
    </div>
  );
};

// ============================================================================
// Individual Step Components
// ============================================================================

// Step 1: Welcome
const WelcomeStep: React.FC<{ onNext: () => void; companyName: string }> = ({ onNext, companyName }) => {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">👋</div>
      <h2 className="text-3xl font-bold text-gray-900">
        Welcome to Cognito!
      </h2>
      <p className="text-lg text-gray-600">
        Hi {companyName}! We're thrilled to have you here.
      </p>
      
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 text-left">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🚀 What you'll accomplish in the next 5 minutes:
        </h3>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start">
            <span className="text-purple-600 mr-2">✓</span>
            Tell us about your business
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 mr-2">✓</span>
            Set up your first client and project
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 mr-2">✓</span>
            Define your brand voice and style
          </li>
          <li className="flex items-start">
            <span className="text-purple-600 mr-2">✓</span>
            <strong>Generate your first AI-powered content!</strong> 🎨
          </li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Pro tip:</strong> This setup ensures AI generates content perfectly tailored to your brand.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg text-lg"
      >
        Let's Get Started →
      </button>

      <p className="text-xs text-gray-500">
        ⏱️ Takes about 5 minutes • You can skip and complete later
      </p>
    </div>
  );
};

// Step 2: Business Info
const BusinessInfoStep: React.FC<{
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ data, onUpdate, onNext, onBack }) => {
  const [formData, setFormData] = useState({
    industry: data.industry,
    companySize: data.companySize,
    useCase: data.useCase
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🏢</div>
        <h2 className="text-2xl font-bold text-gray-900">
          Tell Us About Your Business
        </h2>
        <p className="text-gray-600 mt-2">
          This helps us personalize your experience and suggest relevant content
        </p>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What industry are you in? *
        </label>
        <select
          value={formData.industry}
          onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
          className="modern-input w-full"
          required
        >
          <option value="">Select an industry...</option>
          <option value="restaurant">🍽️ Restaurant / Food Service</option>
          <option value="retail">🛍️ Retail / E-commerce</option>
          <option value="professional_services">💼 Professional Services</option>
          <option value="agency">🎨 Marketing Agency</option>
          <option value="hospitality">🏨 Hospitality / Hotels</option>
          <option value="healthcare">🏥 Healthcare</option>
          <option value="real_estate">🏠 Real Estate</option>
          <option value="fitness">💪 Fitness / Wellness</option>
          <option value="beauty">💅 Beauty / Salon</option>
          <option value="other">📦 Other</option>
        </select>
      </div>

      {/* Company Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How many people will use Cognito? *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'solo', label: 'Just me', icon: '👤' },
            { value: 'small', label: '2-5 people', icon: '👥' },
            { value: 'medium', label: '6-20 people', icon: '👨‍👩‍👧‍👦' },
            { value: 'large', label: '20+ people', icon: '🏢' }
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, companySize: option.value }))}
              className={`p-4 border-2 rounded-lg transition-all ${
                formData.companySize === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="text-sm font-medium text-gray-900">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Use Case */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What will you use Cognito for? *
        </label>
        <div className="space-y-2">
          {[
            { value: 'social_media', label: 'Social media content' },
            { value: 'blog', label: 'Blog posts and articles' },
            { value: 'email', label: 'Email campaigns' },
            { value: 'ads', label: 'Advertising content' },
            { value: 'all', label: 'All of the above' }
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.useCase === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <input
                type="radio"
                name="useCase"
                value={option.value}
                checked={formData.useCase === option.value}
                onChange={(e) => setFormData(prev => ({ ...prev, useCase: e.target.value }))}
                className="w-4 h-4 text-purple-600"
                required
              />
              <span className="ml-3 text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={!formData.industry || !formData.companySize || !formData.useCase}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </form>
  );
};

// Step 3: Client Setup (Placeholder - to be implemented)
const ClientSetupStep: React.FC<any> = ({ data, onUpdate, onNext, onBack }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">👥</div>
        <h2 className="text-2xl font-bold text-gray-900">Client Setup</h2>
        <p className="text-gray-600 mt-2">Coming soon...</p>
      </div>
      <div className="flex justify-between pt-6">
        <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg">← Back</button>
        <button onClick={onNext} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg">Continue →</button>
      </div>
    </div>
  );
};

// Step 4: Project Setup (Placeholder - to be implemented)
const ProjectSetupStep: React.FC<any> = ({ data, onUpdate, onNext, onBack }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">📁</div>
        <h2 className="text-2xl font-bold text-gray-900">Project Setup</h2>
        <p className="text-gray-600 mt-2">Coming soon...</p>
      </div>
      <div className="flex justify-between pt-6">
        <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg">← Back</button>
        <button onClick={onNext} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg">Continue →</button>
      </div>
    </div>
  );
};

// Step 5: Brand Setup (Placeholder - to be implemented)
const BrandSetupStep: React.FC<any> = ({ data, onUpdate, onNext, onBack }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🎨</div>
        <h2 className="text-2xl font-bold text-gray-900">Brand Setup</h2>
        <p className="text-gray-600 mt-2">Coming soon...</p>
      </div>
      <div className="flex justify-between pt-6">
        <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg">← Back</button>
        <button onClick={onNext} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg">Continue →</button>
      </div>
    </div>
  );
};

// Step 6: Sample Content (Placeholder - to be implemented)
const SampleContentStep: React.FC<any> = ({ data, onUpdate, onBack, onComplete, loading }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">✨</div>
        <h2 className="text-2xl font-bold text-gray-900">Generate Sample Content</h2>
        <p className="text-gray-600 mt-2">Coming soon...</p>
      </div>
      <div className="flex justify-between pt-6">
        <button onClick={onBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg">← Back</button>
        <button onClick={onComplete} disabled={loading} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg">
          {loading ? 'Completing...' : 'Complete Setup →'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingWizard;

