/**
 * Template Selection Component
 */

interface TemplateSelectionProps {
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
}

export const TemplateSelection = ({ selectedTemplate, setSelectedTemplate }: TemplateSelectionProps) => {
  const templates = [
    { id: 'modern', name: 'Modern', emoji: '🎨', description: 'Clean and contemporary design' },
    { id: 'classic', name: 'Classic', emoji: '📄', description: 'Traditional professional layout' },
    { id: 'creative', name: 'Creative', emoji: '✨', description: 'Eye-catching and unique design' },
  ];

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          <span className="text-2xl">🎯</span>
          CV Template
        </h3>
        <p className="text-sm text-gray-400">
          Choose your preferred template style
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template.id)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              selectedTemplate === template.id
                ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                : 'border-gray-600 hover:border-gray-500 text-gray-300 bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{template.emoji}</span>
              <div>
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-gray-400">{template.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};