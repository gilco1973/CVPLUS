import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateCV } from '../services/cvService';
import { CVServiceCore } from '../services/cv/CVServiceCore';
import { Loader2, Clock } from 'lucide-react';
import { designSystem } from '../config/designSystem';
import toast from 'react-hot-toast';

const templates = [
  {
    id: 'modern',
    name: 'Modern Professional',
    description: 'Clean and contemporary design perfect for tech roles',
    preview: '🎨'
  },
  {
    id: 'classic',
    name: 'Classic Executive',
    description: 'Traditional format ideal for senior positions',
    preview: '📄'
  },
  {
    id: 'creative',
    name: 'Creative Designer',
    description: 'Unique layout for creative professionals',
    preview: '🎭'
  }
];

export const TemplatesPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [asyncMode, setAsyncMode] = useState(CVServiceCore.isAsyncCVGenerationEnabled());

  const handleGenerateCV = async () => {
    if (!jobId) return;

    // Default features for TemplatesPage (enhanced CV with ATS optimization)
    const defaultFeatures = ['ats-optimization', 'keyword-enhancement', 'achievement-highlighting'];

    try {
      if (asyncMode) {
        // Async mode: initiate CV generation and navigate immediately
        console.log('🚀 [ASYNC MODE] Initiating CV generation...');
        setIsInitializing(true);
        
        const initResponse = await CVServiceCore.initiateCVGeneration({
          jobId,
          templateId: selectedTemplate,
          features: defaultFeatures
        });
        
        // Store initialization response for FinalResultsPage
        try {
          const generationConfig = {
            jobId,
            templateId: selectedTemplate,
            features: defaultFeatures,
            asyncMode: true,
            initResponse,
            timestamp: new Date().toISOString()
          };
          sessionStorage.setItem(`generation-config-${jobId}`, JSON.stringify(generationConfig));
          console.log('💾 [ASYNC] Stored generation config:', generationConfig);
        } catch (storageError) {
          console.warn('Failed to store generation config:', storageError);
        }
        
        toast.success('CV generation initiated! Redirecting to progress...');
        
        // Navigate immediately to show real-time progress
        navigate(`/final-results/${jobId}`);
        
      } else {
        // Sync mode: wait for completion then navigate (original behavior)
        console.log('🔄 [SYNC MODE] Generating CV synchronously...');
        setIsGenerating(true);
        
        await generateCV(jobId, selectedTemplate, defaultFeatures);
        toast.success('CV generated successfully!');
        navigate(`/final-results/${jobId}`);
      }
    } catch (error: unknown) {
      console.error('Error in CV generation:', error);
      
      // Show appropriate error message based on mode
      if (asyncMode) {
        toast.error('Failed to initialize CV generation. Please try again.');
      } else {
        toast.error('Failed to generate CV. Please try again.');
      }
    } finally {
      setIsInitializing(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your CV Template</h1>
          <p className="text-lg text-gray-600">Select a professional template that best suits your style</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`${designSystem.components.card.base} ${designSystem.components.card.variants.interactive} ${designSystem.components.card.padding.md} cursor-pointer transition-all ${
                selectedTemplate === template.id
                  ? 'ring-2 ring-blue-600 transform scale-105'
                  : 'hover:shadow-xl'
              }`}
            >
              <div className="text-6xl mb-4 text-center">{template.preview}</div>
              <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
              <p className="text-gray-600">{template.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleGenerateCV}
            disabled={isGenerating || isInitializing}
            className={`${designSystem.components.button.base} ${designSystem.components.button.variants.primary.default} ${designSystem.components.button.sizes.lg} font-medium transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isInitializing ? (
              <>
                <Clock className="inline-block w-5 h-5 mr-2 animate-pulse" />
                Initializing CV Generation...
              </>
            ) : isGenerating ? (
              <>
                <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                Generating Your CV...
              </>
            ) : (
              `Generate My Enhanced CV${asyncMode ? ' (Fast Track)' : ''}`
            )}
          </button>
          
          {/* Mode Indicator */}
          {asyncMode && (
            <div className="text-center mt-3">
              <p className="text-sm text-gray-400">
                ⚡ Fast Track Mode: Real-time progress tracking enabled
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};