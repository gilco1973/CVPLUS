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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          CV Template
        </h4>
        <span className="text-xs text-gray-500 bg-gray-700/50 px-3 py-1 rounded-full">
          Choose your style
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template.id)}
            className={`p-4 rounded-xl transition-all text-center ${
              selectedTemplate === template.id
                ? 'bg-cyan-600/20 border-2 border-cyan-500/50 ring-2 ring-cyan-500/20'
                : 'bg-gray-700/30 border-2 border-gray-700/30 hover:bg-gray-700/50'
            }`}
          >
            <span className="text-2xl block mb-2">{template.emoji}</span>
            <span className={`block text-sm font-medium transition-colors ${
              selectedTemplate === template.id ? 'text-cyan-300' : 'text-gray-200'
            }`}>
              {template.name}
            </span>
            <span className="block text-xs text-gray-400 mt-1">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};