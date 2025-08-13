import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface SectionEditorProps {
  section: string;
  data: any;
  onSave: (section: string, newValue: any) => void;
  onCancel: () => void;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  data,
  onSave,
  onCancel
}) => {
  const [editingData, setEditingData] = useState(data);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditingData(data);
    setHasChanges(false);
  }, [data]);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(editingData) !== JSON.stringify(data));
  }, [editingData, data]);

  // Keyboard shortcuts for editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave(section, editingData);
      }
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingData, onSave, onCancel, section]);

  const handleInputChange = (field: string, value: any) => {
    setEditingData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };


  const handleArrayAdd = (arrayPath: string) => {
    const pathArray = arrayPath.split('.');
    setEditingData((prev: any) => {
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        if (!current[pathArray[i]]) current[pathArray[i]] = [];
        current = current[pathArray[i]];
      }
      
      const arrayKey = pathArray[pathArray.length - 1];
      if (!current[arrayKey]) current[arrayKey] = [];
      
      if (section === 'experience') {
        current[arrayKey].push({
          position: '',
          company: '',
          duration: '',
          description: '',
          achievements: []
        });
      } else if (section === 'education') {
        current[arrayKey].push({
          degree: '',
          institution: '',
          year: ''
        });
      } else if (arrayKey === 'achievements') {
        current[arrayKey].push('');
      } else {
        current[arrayKey].push('');
      }
      
      return newData;
    });
  };

  const handleArrayRemove = (arrayPath: string, index: number) => {
    const pathArray = arrayPath.split('.');
    setEditingData((prev: any) => {
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        current = current[pathArray[i]];
      }
      
      const arrayKey = pathArray[pathArray.length - 1];
      current[arrayKey].splice(index, 1);
      
      return newData;
    });
  };

  const handleArrayItemChange = (arrayPath: string, index: number, field: string | null, value: any) => {
    const pathArray = arrayPath.split('.');
    setEditingData((prev: any) => {
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        current = current[pathArray[i]];
      }
      
      const arrayKey = pathArray[pathArray.length - 1];
      if (field) {
        current[arrayKey][index][field] = value;
      } else {
        current[arrayKey][index] = value;
      }
      
      return newData;
    });
  };

  const renderPersonalInfoEditor = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
        <input
          type="text"
          value={editingData?.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={editingData?.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
        <input
          type="tel"
          value={editingData?.phone || ''}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
        <input
          type="text"
          value={editingData?.location || ''}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
    </div>
  );

  const renderSummaryEditor = () => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">Professional Summary</label>
      <textarea
        value={editingData || ''}
        onChange={(e) => setEditingData(e.target.value)}
        rows={6}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-vertical"
        placeholder="Write a compelling professional summary..."
      />
    </div>
  );

  const renderExperienceEditor = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-200">Experience Entries</h4>
        <button
          onClick={() => handleArrayAdd('experience')}
          className="flex items-center gap-2 px-3 py-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Position
        </button>
      </div>
      
      {(editingData || []).map((exp: any, index: number) => (
        <div key={index} className="border border-gray-600 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-200">Position {index + 1}</h5>
            <button
              onClick={() => handleArrayRemove('experience', index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Position Title</label>
              <input
                type="text"
                value={exp.position || ''}
                onChange={(e) => handleArrayItemChange('experience', index, 'position', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
              <input
                type="text"
                value={exp.company || ''}
                onChange={(e) => handleArrayItemChange('experience', index, 'company', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Duration</label>
            <input
              type="text"
              value={exp.duration || ''}
              onChange={(e) => handleArrayItemChange('experience', index, 'duration', e.target.value)}
              placeholder="e.g., Jan 2020 - Present"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={exp.description || ''}
              onChange={(e) => handleArrayItemChange('experience', index, 'description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-vertical"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Achievements</label>
              <button
                onClick={() => {
                  if (!exp.achievements) exp.achievements = [];
                  handleArrayItemChange('experience', index, 'achievements', [...exp.achievements, '']);
                }}
                className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {(exp.achievements || []).map((achievement: string, achIndex: number) => (
              <div key={achIndex} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={achievement}
                  onChange={(e) => {
                    const newAchievements = [...(exp.achievements || [])];
                    newAchievements[achIndex] = e.target.value;
                    handleArrayItemChange('experience', index, 'achievements', newAchievements);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Describe an achievement..."
                />
                <button
                  onClick={() => {
                    const newAchievements = [...(exp.achievements || [])];
                    newAchievements.splice(achIndex, 1);
                    handleArrayItemChange('experience', index, 'achievements', newAchievements);
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderEducationEditor = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-200">Education Entries</h4>
        <button
          onClick={() => handleArrayAdd('education')}
          className="flex items-center gap-2 px-3 py-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Education
        </button>
      </div>
      
      {(editingData || []).map((edu: any, index: number) => (
        <div key={index} className="border border-gray-600 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-gray-200">Education {index + 1}</h5>
            <button
              onClick={() => handleArrayRemove('education', index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Degree</label>
            <input
              type="text"
              value={edu.degree || ''}
              onChange={(e) => handleArrayItemChange('education', index, 'degree', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Institution</label>
            <input
              type="text"
              value={edu.institution || ''}
              onChange={(e) => handleArrayItemChange('education', index, 'institution', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
            <input
              type="text"
              value={edu.year || ''}
              onChange={(e) => handleArrayItemChange('education', index, 'year', e.target.value)}
              placeholder="e.g., 2020 or 2018-2022"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderSkillsEditor = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-300">Technical Skills</label>
          <button
            onClick={() => handleArrayAdd('technical')}
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {(editingData?.technical || []).map((skill: string, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={skill}
              onChange={(e) => handleArrayItemChange('technical', index, null, e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              onClick={() => handleArrayRemove('technical', index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-300">Soft Skills</label>
          <button
            onClick={() => handleArrayAdd('soft')}
            className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {(editingData?.soft || []).map((skill: string, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={skill}
              onChange={(e) => handleArrayItemChange('soft', index, null, e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              onClick={() => handleArrayRemove('soft', index)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEditor = () => {
    switch (section) {
      case 'personalInfo':
        return renderPersonalInfoEditor();
      case 'summary':
        return renderSummaryEditor();
      case 'experience':
        return renderExperienceEditor();
      case 'education':
        return renderEducationEditor();
      case 'skills':
        return renderSkillsEditor();
      default:
        return <div className="text-gray-400">No editor available for this section.</div>;
    }
  };

  return (
    <div className="space-y-6">
      {renderEditor()}
      
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={() => onSave(section, editingData)}
          disabled={!hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            hasChanges 
              ? 'bg-cyan-600 text-white hover:bg-cyan-700' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {hasChanges ? 'Save Changes' : 'No Changes'}
        </button>
      </div>
    </div>
  );
};