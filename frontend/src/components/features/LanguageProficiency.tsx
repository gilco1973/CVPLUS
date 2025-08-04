import { useState, useEffect } from 'react';
import { 
  Globe, Languages, Award, Plus, Edit2, Trash2, 
  Download, BarChart3, PieChart, Radar, Grid3x3,
  CheckCircle, AlertCircle, Loader2, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface LanguageProficiency {
  language: string;
  level: 'Native' | 'Fluent' | 'Professional' | 'Conversational' | 'Basic';
  score: number;
  certifications?: string[];
  yearsOfExperience?: number;
  contexts?: string[];
  verified?: boolean;
  flag?: string;
}

interface LanguageVisualization {
  proficiencies: LanguageProficiency[];
  visualizations: {
    type: 'circular' | 'bar' | 'radar' | 'flags' | 'matrix';
    data: any;
    config: {
      primaryColor: string;
      accentColor: string;
      showCertifications: boolean;
      showFlags: boolean;
      animateOnLoad: boolean;
    };
  }[];
  insights: {
    totalLanguages: number;
    fluentLanguages: number;
    businessReady: string[];
    certifiedLanguages: string[];
    recommendations: string[];
  };
  metadata: {
    extractedFrom: string[];
    confidence: number;
    lastUpdated: Date;
  };
}

interface LanguageProficiencyProps {
  visualization?: LanguageVisualization;
  onGenerateVisualization: () => Promise<LanguageVisualization>;
  onUpdateLanguage: (languageId: string, updates: Partial<LanguageProficiency>) => Promise<void>;
  onAddLanguage: (language: Partial<LanguageProficiency>) => Promise<void>;
  onRemoveLanguage: (languageId: string) => Promise<void>;
  onGenerateCertificate?: (languageId: string) => Promise<any>;
}

export const LanguageProficiency: React.FC<LanguageProficiencyProps> = ({
  visualization,
  onGenerateVisualization,
  onUpdateLanguage,
  onAddLanguage,
  onRemoveLanguage,
  onGenerateCertificate
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedView, setSelectedView] = useState<'circular' | 'bar' | 'radar' | 'flags' | 'matrix'>('circular');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<string | null>(null);

  const levelColors = {
    'Native': '#10B981',
    'Fluent': '#3B82F6',
    'Professional': '#8B5CF6',
    'Conversational': '#F59E0B',
    'Basic': '#6B7280'
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateVisualization();
      toast.success('Language visualization generated!');
    } catch (error) {
      toast.error('Failed to generate language visualization');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderCircularView = (data: any) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.languages.map((lang: any, index: number) => (
          <motion.div
            key={lang.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <div className="relative w-32 h-32 mx-auto">
              {/* Background circle */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#374151"
                  strokeWidth="12"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={levelColors[lang.level as keyof typeof levelColors]}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(lang.value / 100) * 352} 352`}
                  className="transition-all duration-1000"
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl mb-1">{lang.flag}</span>
                <span className="text-sm font-medium text-gray-300">{lang.value}%</span>
              </div>
              
              {/* Certification badge */}
              {lang.certified && (
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                  <Award className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="text-center mt-3">
              <div className="font-medium text-gray-200">{lang.name}</div>
              <div className="text-sm text-gray-400">{lang.level}</div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderBarView = (data: any) => {
    return (
      <div className="space-y-4">
        {data.labels.map((label: string, index: number) => {
          const value = data.datasets[0].data[index];
          const color = data.datasets[0].backgroundColor[index];
          
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">{label}</span>
                <span className="text-gray-400">{value}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-8 relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 1, delay: index * 0.05 }}
                  className="h-full rounded-full flex items-center justify-end pr-3"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-white text-sm font-medium">
                    {value >= 90 ? 'Native/Fluent' :
                     value >= 70 ? 'Professional' :
                     value >= 50 ? 'Conversational' : 'Basic'}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderFlagsView = (data: any) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.languages.map((lang: any, index: number) => (
          <motion.div
            key={lang.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-all cursor-pointer hover:shadow-lg ${
              lang.certified ? 'border-green-500' : 'border-gray-700'
            }`}
            onClick={() => setEditingLanguage(lang.name)}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{lang.flag}</div>
              <h4 className="font-semibold text-gray-100">{lang.name}</h4>
              <div className={`text-sm font-medium mt-1`} style={{ color: levelColors[lang.level as keyof typeof levelColors] }}>
                {lang.level}
              </div>
              <div className="text-xs text-gray-400 mt-1">{lang.levelText}</div>
              
              {lang.certified && (
                <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  Certified
                </div>
              )}
              
              {lang.certifications && lang.certifications.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {lang.certifications.join(', ')}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderMatrixView = (data: any) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-gray-300">Language</th>
              {data.skills.map((skill: string) => (
                <th key={skill} className="px-4 py-2 text-center text-gray-300">{skill}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.values.map((lang: any, index: number) => (
              <motion.tr
                key={lang.language}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-t border-gray-700"
              >
                <td className="px-4 py-3 font-medium text-gray-200">{lang.language}</td>
                {data.skills.map((skill: string) => {
                  const value = Math.round(lang.skills[skill]);
                  const color = value >= 90 ? '#10B981' :
                               value >= 70 ? '#3B82F6' :
                               value >= 50 ? '#F59E0B' : '#6B7280';
                  
                  return (
                    <td key={skill} className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: color }}
                        >
                          {value}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!visualization) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
        <Languages className="w-16 h-16 text-gray-600 mb-4 animate-pulse-slow" />
        <h3 className="text-xl font-semibold text-gray-100 mb-2">
          Language Proficiency Not Generated
        </h3>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Generate visual representations of your language skills with proficiency levels and certifications.
        </p>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 hover-glow"
        >
          {isGenerating ? (
            <>
              <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
              Generating Visualization...
            </>
          ) : (
            'Generate Language Proficiency'
          )}
        </button>
      </div>
    );
  }

  const currentVisualization = visualization.visualizations.find(v => v.type === selectedView);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <Globe className="w-8 h-8 text-cyan-400 mb-2" />
          <div className="text-2xl font-bold text-gray-100">{visualization.insights.totalLanguages}</div>
          <div className="text-sm text-gray-400">Total Languages</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <Languages className="w-8 h-8 text-green-400 mb-2" />
          <div className="text-2xl font-bold text-gray-100">{visualization.insights.fluentLanguages}</div>
          <div className="text-sm text-gray-400">Fluent Languages</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <Award className="w-8 h-8 text-purple-400 mb-2" />
          <div className="text-2xl font-bold text-gray-100">{visualization.insights.certifiedLanguages.length}</div>
          <div className="text-sm text-gray-400">Certified Languages</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <TrendingUp className="w-8 h-8 text-orange-400 mb-2" />
          <div className="text-2xl font-bold text-gray-100">{Math.round(visualization.metadata.confidence)}%</div>
          <div className="text-sm text-gray-400">Confidence Score</div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedView('circular')}
          className={`px-4 py-2 rounded-lg transition-all ${
            selectedView === 'circular'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <PieChart className="inline w-4 h-4 mr-2" />
          Circular
        </button>
        
        <button
          onClick={() => setSelectedView('bar')}
          className={`px-4 py-2 rounded-lg transition-all ${
            selectedView === 'bar'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <BarChart3 className="inline w-4 h-4 mr-2" />
          Bar Chart
        </button>
        
        <button
          onClick={() => setSelectedView('flags')}
          className={`px-4 py-2 rounded-lg transition-all ${
            selectedView === 'flags'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Globe className="inline w-4 h-4 mr-2" />
          Flag Grid
        </button>
        
        <button
          onClick={() => setSelectedView('matrix')}
          className={`px-4 py-2 rounded-lg transition-all ${
            selectedView === 'matrix'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Grid3x3 className="inline w-4 h-4 mr-2" />
          Skills Matrix
        </button>
        
        <div className="ml-auto">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Language
          </button>
        </div>
      </div>

      {/* Visualization */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {currentVisualization && (
          <>
            {selectedView === 'circular' && renderCircularView(currentVisualization.data)}
            {selectedView === 'bar' && renderBarView(currentVisualization.data)}
            {selectedView === 'flags' && renderFlagsView(currentVisualization.data)}
            {selectedView === 'matrix' && renderMatrixView(currentVisualization.data)}
          </>
        )}
      </div>

      {/* Insights & Recommendations */}
      {visualization.insights.recommendations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {visualization.insights.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-300">
                <span className="text-cyan-400 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Business Ready Languages */}
      {visualization.insights.businessReady.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Business Ready Languages</h3>
          <div className="flex flex-wrap gap-3">
            {visualization.insights.businessReady.map(lang => (
              <span key={lang} className="px-4 py-2 bg-green-900/30 text-green-400 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Language Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-100 mb-4">Add Language</h3>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await onAddLanguage({
                  language: formData.get('language') as string,
                  level: formData.get('level') as any,
                  certifications: formData.get('certifications') 
                    ? [formData.get('certifications') as string] 
                    : []
                });
                setShowAddForm(false);
                toast.success('Language added successfully');
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Language</label>
                    <input
                      name="language"
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                      placeholder="e.g., Spanish"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Proficiency Level</label>
                    <select
                      name="level"
                      required
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Conversational">Conversational</option>
                      <option value="Professional">Professional</option>
                      <option value="Fluent">Fluent</option>
                      <option value="Native">Native</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Certifications (Optional)</label>
                    <input
                      name="certifications"
                      type="text"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                      placeholder="e.g., DELE B2"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Add Language
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};