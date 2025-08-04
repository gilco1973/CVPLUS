import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Play, FileText, Home, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { getJob, generateCV } from '../services/cvService';
import type { Job } from '../services/cvService';
import { PIIWarning } from '../components/PIIWarning';
import { PDFService } from '../services/pdfService';
import { DOCXService } from '../services/docxService';
import { FeatureDashboard } from '../components/features/FeatureDashboard';
import toast from 'react-hot-toast';

export const ResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [selectedFeatures, setSelectedFeatures] = useState({
    atsOptimization: true,
    keywordEnhancement: true,
    achievementHighlighting: true,
    skillsVisualization: false,
    generatePodcast: true,
    privacyMode: true,
    embedQRCode: true,
    interactiveTimeline: true,
    skillsChart: true,
    videoIntroduction: false,
    portfolioGallery: false,
    testimonialsCarousel: false,
    contactForm: true,
    socialMediaLinks: true,
    availabilityCalendar: false,
    languageProficiency: true,
    certificationBadges: true,
    personalityInsights: false,
    achievementsShowcase: true,
  });
  const [selectedFormats, setSelectedFormats] = useState({
    pdf: true,
    docx: true,
    html: true,
  });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingDOCX, setGeneratingDOCX] = useState(false);
  const [showEnhancedFeatures, setShowEnhancedFeatures] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) return;
      
      try {
        const jobData = await getJob(jobId);
        setJob(jobData);
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">CV Not Found</h2>
          <p className="text-gray-400 mb-6">The CV you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show template selection for analyzed CVs
  if (job.status === 'analyzed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Background decoration */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 bg-gray-900/50 backdrop-blur-md border-b border-gray-700/50 animate-fade-in-down">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-3 text-gray-300 hover:text-cyan-400 transition-all group"
              >
                <div className="p-2 bg-gray-800/50 rounded-lg group-hover:bg-gray-700/50 transition-colors">
                  <Home className="w-5 h-5" />
                </div>
                <span className="font-medium">Home</span>
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-100">CV Analysis Complete</h1>
                <p className="text-sm text-gray-400 mt-1">Customize your enhanced CV</p>
              </div>
              <div className="w-32"></div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* PII Warning */}
          {job.piiDetection && (
            <PIIWarning
              hasPII={job.piiDetection.hasPII}
              detectedTypes={job.piiDetection.detectedTypes}
              recommendations={job.piiDetection.recommendations}
              onTogglePrivacyMode={() => setPrivacyMode(!privacyMode)}
              privacyModeEnabled={privacyMode}
            />
          )}

          {/* Analysis Summary Card */}
          <div className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-8 border border-cyan-500/20 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-100">Analysis Complete!</h2>
                <p className="text-gray-400 mt-1">We've extracted your information and are ready to enhance your CV</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <h3 className="font-semibold text-gray-200">Profile</h3>
                </div>
                <p className="text-cyan-400 font-medium">{job.parsedData?.personalInfo?.name || 'Name Detected'}</p>
                <p className="text-gray-400 text-sm mt-1">{job.parsedData?.personalInfo?.email || 'Email Detected'}</p>
                <p className="text-gray-400 text-sm">{job.parsedData?.personalInfo?.phone || 'Phone Detected'}</p>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">💼</span>
                  </div>
                  <h3 className="font-semibold text-gray-200">Experience</h3>
                </div>
                <p className="text-purple-400 text-3xl font-bold">{job.parsedData?.experience?.length || 0}</p>
                <p className="text-gray-400 text-sm">Positions found</p>
                <p className="text-gray-500 text-xs mt-2">Ready for enhancement</p>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                  </div>
                  <h3 className="font-semibold text-gray-200">Skills</h3>
                </div>
                <p className="text-green-400 text-3xl font-bold">{job.parsedData?.skills?.technical?.length || 0}</p>
                <p className="text-gray-400 text-sm">Technical skills</p>
                <p className="text-gray-500 text-xs mt-2">AI will optimize these</p>
              </div>
            </div>
          </div>

          {/* Generation Options */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Customization Panel */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden animate-fade-in-left animation-delay-300">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-cyan-600/20 to-purple-600/20 p-6 border-b border-gray-700/50">
                  <h3 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
                    <Wand2 className="w-7 h-7 text-cyan-400" />
                    Customize Your CV Generation
                  </h3>
                  <p className="text-gray-400 mt-1">Select your preferred template and features</p>
                </div>
                
                <div className="p-6 space-y-8">
                
                  {/* Template Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <span className="text-2xl">🎨</span>
                        Choose Your Template
                      </h4>
                      <span className="text-xs text-gray-500 bg-gray-700/50 px-3 py-1 rounded-full">3 options</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <button 
                        onClick={() => setSelectedTemplate('modern')}
                        className={`relative p-6 rounded-xl transition-all transform hover:scale-105 ${selectedTemplate === 'modern' ? 'bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-gray-700/30 border-2 border-gray-600 hover:border-gray-500'}`}
                      >
                        {selectedTemplate === 'modern' && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                        )}
                        <div className="text-4xl mb-3">🎨</div>
                        <p className="text-sm font-bold text-gray-100">Modern</p>
                        <p className="text-xs text-gray-400 mt-1">Clean & contemporary</p>
                        {selectedTemplate === 'modern' && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none"></div>
                        )}
                      </button>
                      <button 
                        onClick={() => setSelectedTemplate('classic')}
                        className={`relative p-6 rounded-xl transition-all transform hover:scale-105 ${selectedTemplate === 'classic' ? 'bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-gray-700/30 border-2 border-gray-600 hover:border-gray-500'}`}
                      >
                        {selectedTemplate === 'classic' && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                        )}
                        <div className="text-4xl mb-3">📄</div>
                        <p className="text-sm font-bold text-gray-100">Classic</p>
                        <p className="text-xs text-gray-400 mt-1">Traditional & professional</p>
                        {selectedTemplate === 'classic' && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none"></div>
                        )}
                      </button>
                      <button 
                        onClick={() => setSelectedTemplate('creative')}
                        className={`relative p-6 rounded-xl transition-all transform hover:scale-105 ${selectedTemplate === 'creative' ? 'bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-gray-700/30 border-2 border-gray-600 hover:border-gray-500'}`}
                      >
                        {selectedTemplate === 'creative' && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                        )}
                        <div className="text-4xl mb-3">✨</div>
                        <p className="text-sm font-bold text-gray-100">Creative</p>
                        <p className="text-xs text-gray-400 mt-1">Bold & unique</p>
                        {selectedTemplate === 'creative' && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none"></div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Enhancement Features */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <span className="text-2xl">⚡</span>
                        Core Enhancements
                      </h4>
                      <span className="text-xs text-gray-500 bg-gray-700/50 px-3 py-1 rounded-full">Essential features</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="flex items-start gap-3 p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mt-1 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFeatures.privacyMode}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, privacyMode: e.target.checked})}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-200 group-hover:text-cyan-400 transition-colors">Privacy Mode</span>
                            {job.piiDetection?.hasPII && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Recommended</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-400">Smart PII masking for safe public sharing</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mt-1 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFeatures.atsOptimization}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, atsOptimization: e.target.checked})}
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-200 group-hover:text-cyan-400 transition-colors">ATS Optimization</span>
                          <span className="block text-sm text-gray-400">Ensure your CV passes applicant tracking systems</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mt-1 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFeatures.keywordEnhancement}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, keywordEnhancement: e.target.checked})}
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-200 group-hover:text-cyan-400 transition-colors">Keyword Enhancement</span>
                          <span className="block text-sm text-gray-400">Add industry-specific keywords automatically</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mt-1 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFeatures.achievementHighlighting}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, achievementHighlighting: e.target.checked})}
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-200 group-hover:text-cyan-400 transition-colors">Achievement Highlighting</span>
                          <span className="block text-sm text-gray-400">Emphasize your accomplishments with impact metrics</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mt-1 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFeatures.skillsVisualization}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, skillsVisualization: e.target.checked})}
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-200 group-hover:text-cyan-400 transition-colors">Skills Visualization</span>
                          <span className="block text-sm text-gray-400">Add visual skill ratings and proficiency bars</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Output Formats */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        Export Formats
                      </h4>
                      <span className="text-xs text-gray-500 bg-gray-700/50 px-3 py-1 rounded-full">Select all that apply</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <label className="flex items-center justify-center p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mr-2 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFormats.pdf}
                          onChange={(e) => setSelectedFormats({...selectedFormats, pdf: e.target.checked})}
                        />
                        <div className="text-center">
                          <span className="text-2xl">📑</span>
                          <span className="block text-sm font-medium text-gray-200 group-hover:text-cyan-400 transition-colors mt-1">PDF</span>
                        </div>
                      </label>
                      <label className="flex items-center justify-center p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mr-2 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFormats.docx}
                          onChange={(e) => setSelectedFormats({...selectedFormats, docx: e.target.checked})}
                        />
                        <div className="text-center">
                          <span className="text-2xl">📝</span>
                          <span className="block text-sm font-medium text-gray-200 group-hover:text-cyan-400 transition-colors mt-1">DOCX</span>
                        </div>
                      </label>
                      <label className="flex items-center justify-center p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mr-2 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                          checked={selectedFormats.html}
                          onChange={(e) => setSelectedFormats({...selectedFormats, html: e.target.checked})}
                        />
                        <div className="text-center">
                          <span className="text-2xl">🌐</span>
                          <span className="block text-sm font-medium text-gray-200 group-hover:text-cyan-400 transition-colors mt-1">HTML</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* AI Generated Features */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        AI-Powered Features
                      </h4>
                      <span className="text-xs text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">Premium features</span>
                    </div>
                    <div className="space-y-6">
                      {/* Core AI Features */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-purple-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                          AI Intelligence
                        </h5>
                        <div className="grid gap-3 ml-3">
                          <label className="flex items-start gap-3 p-3 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-all cursor-pointer group border border-purple-700/30">
                            <input 
                              type="checkbox" 
                              className="mt-1 h-4 w-4 text-purple-500 rounded focus:ring-purple-500" 
                              checked={selectedFeatures.generatePodcast}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, generatePodcast: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="font-medium text-gray-200 group-hover:text-purple-400 transition-colors">🎧 AI Career Podcast</span>
                              <span className="block text-xs text-gray-400 mt-0.5">Auto-generated audio summary of your career</span>
                            </div>
                          </label>
                          <label className="flex items-start gap-3 p-3 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-all cursor-pointer group border border-purple-700/30">
                            <input 
                              type="checkbox" 
                              className="mt-1 h-4 w-4 text-purple-500 rounded focus:ring-purple-500" 
                              checked={selectedFeatures.personalityInsights}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, personalityInsights: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="font-medium text-gray-200 group-hover:text-purple-400 transition-colors">🧠 Personality Insights</span>
                              <span className="block text-xs text-gray-400 mt-0.5">AI-powered work style analysis</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Interactive Elements */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                          Interactive Elements
                        </h5>
                        <div className="grid grid-cols-2 gap-3 ml-3">
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.embedQRCode}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, embedQRCode: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">📦 QR Code</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.interactiveTimeline}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, interactiveTimeline: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">📈 Timeline</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.contactForm}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, contactForm: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">📧 Contact</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.availabilityCalendar}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, availabilityCalendar: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">📅 Calendar</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Visual Enhancements */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-green-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          Visual Enhancements
                        </h5>
                        <div className="grid grid-cols-2 gap-3 ml-3">
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.skillsChart}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, skillsChart: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">📊 Charts</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.achievementsShowcase}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, achievementsShowcase: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">🏆 Awards</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.languageProficiency}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, languageProficiency: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">🌍 Languages</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.certificationBadges}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, certificationBadges: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">🎓 Badges</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Media & Social */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-orange-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                          Media & Social
                        </h5>
                        <div className="grid grid-cols-2 gap-3 ml-3">
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.videoIntroduction}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, videoIntroduction: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">🎥 Video</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.portfolioGallery}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, portfolioGallery: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">🎨 Portfolio</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.testimonialsCarousel}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, testimonialsCarousel: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">💬 Reviews</span>
                            </div>
                          </label>
                          <label className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all cursor-pointer group">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
                              checked={selectedFeatures.socialMediaLinks}
                              onChange={(e) => setSelectedFeatures({...selectedFeatures, socialMediaLinks: e.target.checked})}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-200 group-hover:text-cyan-400">🔗 Socials</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-6 border-t border-gray-700/50">
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const features = [];
                          if (selectedFeatures.atsOptimization) features.push('ats-optimization');
                          if (selectedFeatures.keywordEnhancement) features.push('keyword-enhancement');
                          if (selectedFeatures.achievementHighlighting) features.push('achievement-highlighting');
                          if (selectedFeatures.skillsVisualization) features.push('skills-visualization');
                          if (selectedFeatures.generatePodcast) features.push('generate-podcast');
                          if (selectedFeatures.privacyMode) features.push('privacy-mode');
                          if (selectedFeatures.embedQRCode) features.push('embed-qr-code');
                          if (selectedFeatures.interactiveTimeline) features.push('interactive-timeline');
                          if (selectedFeatures.skillsChart) features.push('skills-chart');
                          if (selectedFeatures.videoIntroduction) features.push('video-introduction');
                          if (selectedFeatures.portfolioGallery) features.push('portfolio-gallery');
                          if (selectedFeatures.testimonialsCarousel) features.push('testimonials-carousel');
                          if (selectedFeatures.contactForm) features.push('contact-form');
                          if (selectedFeatures.socialMediaLinks) features.push('social-media-links');
                          if (selectedFeatures.availabilityCalendar) features.push('availability-calendar');
                          if (selectedFeatures.languageProficiency) features.push('language-proficiency');
                          if (selectedFeatures.certificationBadges) features.push('certification-badges');
                          if (selectedFeatures.personalityInsights) features.push('personality-insights');
                          if (selectedFeatures.achievementsShowcase) features.push('achievements-showcase');
                          
                          // Add format features
                          if (selectedFormats.pdf) features.push('format-pdf');
                          if (selectedFormats.docx) features.push('format-docx');
                          if (selectedFormats.html) features.push('format-html');
                          
                          await generateCV(jobId!, selectedTemplate, features);
                          toast.success('Generating your CV with selected options!');
                          navigate(`/process/${jobId}`);
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error('Failed to generate CV');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                          Generating Your Enhanced CV...
                        </>
                      ) : (
                        <>
                          <Wand2 className="inline-block w-5 h-5 mr-2" />
                          Generate with Selected Options
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Generate Card */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden sticky top-24 border border-purple-500/30 animate-fade-in-right animation-delay-400 hover-glow">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 p-6 text-center border-b border-purple-500/20">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-10 h-10 text-purple-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-100">Quick Magic ✨</h3>
                  <p className="text-purple-200 mt-2 text-sm">
                    Let AI handle everything for you
                  </p>
                </div>
                
                {/* Card Body */}
                <div className="p-6">
                  <p className="text-gray-300 mb-6 text-center">
                    Skip the customization and get a professional CV with all the bells and whistles.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-purple-900/20 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-sm">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Best Template Selected</p>
                        <p className="text-xs text-gray-400">Modern design optimized for ATS</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-purple-900/20 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-sm">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">All AI Features</p>
                        <p className="text-xs text-gray-400">Podcast, insights, chat & more</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-purple-900/20 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-sm">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Every Format</p>
                        <p className="text-xs text-gray-400">PDF, DOCX, HTML & public link</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-purple-900/20 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-sm">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">Interactive Elements</p>
                        <p className="text-xs text-gray-400">Timeline, QR code, contact form</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await generateCV(jobId!, 'modern', [
                          'ats-optimization',
                          'keyword-enhancement',
                          'achievement-highlighting',
                          'skills-visualization',
                          'generate-podcast',
                          'personality-insights',
                          'public-profile',
                          'rag-chat',
                          'video-introduction',
                          'all-formats',
                          'privacy-mode',
                          'embed-qr-code',
                          'interactive-timeline',
                          'skills-chart',
                          'contact-form',
                          'social-media-links',
                          'language-proficiency',
                          'certification-badges',
                          'achievements-showcase'
                        ]);
                        toast.success('Generating your enhanced CV with all features!');
                        navigate(`/process/${jobId}`);
                      } catch (error) {
                        console.error('Error:', error);
                        toast.error('Failed to generate CV');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                        Working the Magic...
                      </>
                    ) : (
                      <>
                        <Sparkles className="inline-block w-5 h-5 mr-2" />
                        Generate Everything Now
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-xs text-gray-500 mt-3">
                    Ready in ~30 seconds
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (job.status !== 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">Processing...</h2>
          <p className="text-gray-400 mb-6">Your CV is still being processed.</p>
          <button
            onClick={() => navigate(`/process/${jobId}`)}
            className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition"
          >
            View Progress
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-300 hover:text-gray-100"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-100">Your Enhanced CV is Ready!</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* PII Warning */}
        {job.piiDetection && (
          <PIIWarning
            hasPII={job.piiDetection.hasPII}
            detectedTypes={job.piiDetection.detectedTypes}
            recommendations={job.piiDetection.recommendations}
            onTogglePrivacyMode={() => setPrivacyMode(!privacyMode)}
            privacyModeEnabled={privacyMode}
          />
        )}

        {/* Quick Create Success Banner */}
        {job.quickCreate && (
          <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div>
                <h4 className="font-semibold text-purple-300">
                  Quick Create Mode Activated!
                </h4>
                <p className="text-sm text-purple-400">
                  All enhancements have been automatically applied and your CV is being generated in all available formats.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Activation Banner */}
        {!showEnhancedFeatures && (
          <div className="mb-8 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-300">
                    🎉 Your CV is ready! Now unlock AI-powered features
                  </h3>
                  <p className="text-sm text-purple-400 mt-1">
                    Transform your CV with ATS optimization, personality insights, public profiles, and more
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEnhancedFeatures(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                Explore AI Features
              </button>
            </div>
          </div>
        )}

        {/* Toggle between Results and Enhanced Features */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setShowEnhancedFeatures(false)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                !showEnhancedFeatures 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              CV Results
            </button>
            <button
              onClick={() => setShowEnhancedFeatures(true)}
              className={`px-6 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                showEnhancedFeatures 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Features
            </button>
          </div>
        </div>

        {/* Conditional rendering based on toggle */}
        {showEnhancedFeatures ? (
          <FeatureDashboard 
            job={job} 
            onJobUpdate={(updatedJob) => setJob(updatedJob)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CV Preview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-100">CV Preview</h2>
                {job.generatedCV?.htmlUrl && (
                  <a 
                    href={job.generatedCV.htmlUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                  >
                    Open in New Tab →
                  </a>
                )}
              </div>
              <div className="p-8">
                {job.generatedCV?.html ? (
                  <div className="aspect-[8.5/11] bg-white rounded-lg border overflow-auto">
                    <iframe 
                      srcDoc={job.generatedCV.html}
                      className="w-full h-full"
                      title="CV Preview"
                    />
                  </div>
                ) : (
                  <div className="aspect-[8.5/11] bg-gray-700 rounded-lg flex items-center justify-center">
                    <p className="text-gray-400">Generating CV preview...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Download Options */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-100">Download Your CV</h3>
              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    if (job.generatedCV?.html) {
                      try {
                        setGeneratingPDF(true);
                        toast.loading('Generating PDF...');
                        const pdfBlob = await PDFService.generatePDFFromHTML(
                          job.generatedCV.html,
                          `${job.parsedData?.personalInfo?.name || 'cv'}.pdf`
                        );
                        PDFService.downloadPDF(pdfBlob, `${job.parsedData?.personalInfo?.name || 'cv'}.pdf`);
                        toast.dismiss();
                        toast.success('PDF downloaded successfully!');
                      } catch (error) {
                        console.error('Error generating PDF:', error);
                        toast.dismiss();
                        toast.error('Failed to generate PDF');
                      } finally {
                        setGeneratingPDF(false);
                      }
                    }
                  }}
                  disabled={generatingPDF || !job.generatedCV?.html}
                  className="w-full flex items-center justify-between px-4 py-3 bg-cyan-900/30 text-cyan-400 rounded-lg hover:bg-cyan-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-700/50 hover-lift"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {generatingPDF ? 'Generating PDF...' : 'PDF Format'}
                  </span>
                  {generatingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
                
                <button 
                  onClick={async () => {
                    if (job) {
                      try {
                        setGeneratingDOCX(true);
                        toast.loading('Generating DOCX...');
                        const docxBlob = await DOCXService.generateDOCXFromJob(job);
                        DOCXService.downloadDOCX(docxBlob, `${job.parsedData?.personalInfo?.name || 'cv'}.docx`);
                        toast.dismiss();
                        toast.success('DOCX downloaded successfully!');
                      } catch (error) {
                        console.error('Error generating DOCX:', error);
                        toast.dismiss();
                        toast.error('Failed to generate DOCX');
                      } finally {
                        setGeneratingDOCX(false);
                      }
                    }
                  }}
                  disabled={generatingDOCX || !job.parsedData}
                  className="w-full flex items-center justify-between px-4 py-3 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed border border-green-700/50 hover-lift"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {generatingDOCX ? 'Generating DOCX...' : 'DOCX Format'}
                  </span>
                  {generatingDOCX ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
                
                {job.generatedCV?.htmlUrl && (
                  <a 
                    href={job.generatedCV.htmlUrl}
                    download="cv.html"
                    className="w-full flex items-center justify-between px-4 py-3 bg-purple-900/30 text-purple-400 rounded-lg hover:bg-purple-900/50 transition border border-purple-700/50 hover-lift"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      HTML Format
                    </span>
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Podcast Player */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-100">AI Career Podcast</h3>
              {job.generatedCV?.features?.includes('generate-podcast') ? (
                <>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Play className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-sm text-gray-300">Podcast generation coming soon!</p>
                        <p className="text-xs text-gray-400 mt-1">AI-generated audio summary of your career</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  <p>Podcast not included in this generation.</p>
                  <p className="text-xs mt-1 text-gray-500">Regenerate with podcast option enabled.</p>
                </div>
              )}
            </div>

            {/* Share Options */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-100">Share Your CV</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (job.generatedCV?.htmlUrl) {
                      navigator.clipboard.writeText(job.generatedCV.htmlUrl);
                      toast.success('Link copied to clipboard!');
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Copy Shareable Link
                </button>
                <button 
                  onClick={() => {
                    if (job.generatedCV?.htmlUrl) {
                      // Generate QR code URL using qr-server.com API
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(job.generatedCV.htmlUrl)}`;
                      window.open(qrUrl, '_blank');
                    }
                  }}
                  className="w-full px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Generate QR Code
                </button>
              </div>
            </div>

            {/* Create Another */}
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
            >
              Create Another CV
            </button>
          </div>
        </div>
        )}
      </main>
    </div>
  );
};