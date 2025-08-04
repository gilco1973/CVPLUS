import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateCV } from '../services/cvService';
import { Loader2 } from 'lucide-react';
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

  const handleGenerateCV = async () => {
    if (!jobId) return;

    try {
      setIsGenerating(true);
      await generateCV(jobId, selectedTemplate, ['enhanced', 'ats-optimized']);
      toast.success('CV generated successfully!');
      navigate(`/results/${jobId}`);
    } catch (error) {
      console.error('Error generating CV:', error);
      toast.error('Failed to generate CV. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
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
              className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all ${
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
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isGenerating ? (
              <>
                <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                Generating Your CV...
              </>
            ) : (
              'Generate My Enhanced CV'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};