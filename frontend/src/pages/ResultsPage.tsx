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
              <h1 className="text-xl font-semibold text-gray-100">CV Analysis Complete</h1>
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

          {/* Parsed CV Summary */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Your CV has been analyzed!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Personal Information</h3>
                <p className="text-gray-400">{job.parsedData?.personalInfo?.name}</p>
                <p className="text-gray-400">{job.parsedData?.personalInfo?.email}</p>
                <p className="text-gray-400">{job.parsedData?.personalInfo?.phone}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Experience</h3>
                <p className="text-gray-400">{job.parsedData?.experience?.length || 0} positions found</p>
                <h3 className="font-semibold text-gray-300 mb-2 mt-4">Skills</h3>
                <p className="text-gray-400">{job.parsedData?.skills?.technical?.length || 0} technical skills</p>
              </div>
            </div>
          </div>

          {/* Generation Options */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Features Selection Sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold mb-6 text-gray-100">Customize Your CV Generation</h3>
                
                {/* Template Selection */}
                <div className="mb-8">
                  <h4 className="font-semibold mb-4 text-gray-200">Select Template</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => setSelectedTemplate('modern')}
                      className={`p-6 border-2 ${selectedTemplate === 'modern' ? 'border-cyan-500 bg-cyan-900/20 ring-2 ring-cyan-500/30' : 'border-gray-600 bg-gray-700/50'} rounded-lg hover:border-cyan-400 transition-all`}
                    >
                      <div className="text-4xl mb-3">🎨</div>
                      <p className="text-sm font-semibold text-gray-200">Modern</p>
                      <p className="text-xs text-gray-400 mt-1">Clean & contemporary</p>
                    </button>
                    <button 
                      onClick={() => setSelectedTemplate('classic')}
                      className={`p-6 border-2 ${selectedTemplate === 'classic' ? 'border-cyan-500 bg-cyan-900/20 ring-2 ring-cyan-500/30' : 'border-gray-600 bg-gray-700/50'} rounded-lg hover:border-cyan-400 transition-all`}
                    >
                      <div className="text-4xl mb-3">📄</div>
                      <p className="text-sm font-semibold text-gray-200">Classic</p>
                      <p className="text-xs text-gray-400 mt-1">Traditional & professional</p>
                    </button>
                    <button 
                      onClick={() => setSelectedTemplate('creative')}
                      className={`p-6 border-2 ${selectedTemplate === 'creative' ? 'border-cyan-500 bg-cyan-900/20 ring-2 ring-cyan-500/30' : 'border-gray-600 bg-gray-700/50'} rounded-lg hover:border-cyan-400 transition-all`}
                    >
                      <div className="text-4xl mb-3">✨</div>
                      <p className="text-sm font-semibold text-gray-200">Creative</p>
                      <p className="text-xs text-gray-400 mt-1">Bold & unique</p>
                    </button>
                  </div>
                </div>

                {/* Enhancement Features */}
                <div className="mb-8">
                  <h4 className="font-semibold mb-4 text-gray-200">Enhancement Features</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-3 h-4 w-4 text-cyan-500" 
                        checked={selectedFeatures.atsOptimization}
                        onChange={(e) => setSelectedFeatures({...selectedFeatures, atsOptimization: e.target.checked})}
                      />
                      <span className="text-gray-300">ATS Optimization - Ensure your CV passes applicant tracking systems</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-3 h-4 w-4 text-cyan-500" 
                        checked={selectedFeatures.keywordEnhancement}
                        onChange={(e) => setSelectedFeatures({...selectedFeatures, keywordEnhancement: e.target.checked})}
                      />
                      <span className="text-gray-300">Keyword Enhancement - Add industry-specific keywords</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-3 h-4 w-4 text-cyan-500" 
                        checked={selectedFeatures.achievementHighlighting}
                        onChange={(e) => setSelectedFeatures({...selectedFeatures, achievementHighlighting: e.target.checked})}
                      />
                      <span className="text-gray-300">Achievement Highlighting - Emphasize your accomplishments</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-3 h-4 w-4 text-cyan-500" 
                        checked={selectedFeatures.skillsVisualization}
                        onChange={(e) => setSelectedFeatures({...selectedFeatures, skillsVisualization: e.target.checked})}
                      />
                      <span className="text-gray-300">Skills Visualization - Add visual skill ratings</span>
                    </label>
                  </div>
                </div>

                {/* Output Formats */}
                <div className="mb-8">
                  <h4 className="font-semibold mb-4 text-gray-200">Output Formats</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-3 h-4 w-4 text-cyan-500" 
                        checked={selectedFormats.pdf}
                        onChange={(e) => setSelectedFormats({...selectedFormats, pdf: e.target.checked})}
                      />
                      <span className="text-gray-300">PDF - Professional document format</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-3 h-4 w-4 text-cyan-500" 
                        checked={selectedFormats.docx}
                        onChange={(e) => setSelectedFormats({...selectedFormats, docx: e.target.checked})}
                      />
                      <span className="text-gray-300">DOCX - Editable Word document</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-3 h-4 w-4 text-cyan-500" 
                        checked={selectedFormats.html}
                        onChange={(e) => setSelectedFormats({...selectedFormats, html: e.target.checked})}
                      />
                      <span className="text-gray-300">HTML - Web-ready format</span>
                    </label>
                  </div>
                </div>

                {/* AI Generated Features */}
                <div>
                  <h4 className="font-semibold mb-4 text-gray-200">AI Generated Features</h4>
                  <div className="space-y-3">
                    {/* Core AI Features */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">🤖 Core AI Features</h5>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.generatePodcast}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, generatePodcast: e.target.checked})}
                        />
                        <span className="text-gray-300">AI Career Podcast - Embedded audio player with your career story</span>
                      </label>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.personalityInsights}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, personalityInsights: e.target.checked})}
                        />
                        <span className="text-gray-300">AI Personality Insights - Visual personality assessment</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.privacyMode}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, privacyMode: e.target.checked})}
                        />
                        <span className="text-gray-300">Privacy Mode - Smart PII masking for public sharing</span>
                      </label>
                    </div>

                    {/* Interactive Elements */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">✨ Interactive Elements</h5>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.embedQRCode}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, embedQRCode: e.target.checked})}
                        />
                        <span className="text-gray-300">QR Code - Scannable code embedded in CV header</span>
                      </label>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.interactiveTimeline}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, interactiveTimeline: e.target.checked})}
                        />
                        <span className="text-gray-300">Interactive Timeline - Clickable career journey visualization</span>
                      </label>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.contactForm}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, contactForm: e.target.checked})}
                        />
                        <span className="text-gray-300">Contact Form - Built-in form for instant messaging</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.availabilityCalendar}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, availabilityCalendar: e.target.checked})}
                        />
                        <span className="text-gray-300">Availability Calendar - Schedule meetings directly</span>
                      </label>
                    </div>

                    {/* Visual Enhancements */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">📊 Visual Enhancements</h5>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.skillsChart}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, skillsChart: e.target.checked})}
                        />
                        <span className="text-gray-300">Skills Charts - Interactive radar/bar charts for skills</span>
                      </label>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.achievementsShowcase}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, achievementsShowcase: e.target.checked})}
                        />
                        <span className="text-gray-300">Achievements Showcase - Animated accomplishment cards</span>
                      </label>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.languageProficiency}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, languageProficiency: e.target.checked})}
                        />
                        <span className="text-gray-300">Language Proficiency - Visual language skill indicators</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.certificationBadges}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, certificationBadges: e.target.checked})}
                        />
                        <span className="text-gray-300">Certification Badges - Verified credential displays</span>
                      </label>
                    </div>

                    {/* Media & Social */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">🎥 Media & Social</h5>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.videoIntroduction}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, videoIntroduction: e.target.checked})}
                        />
                        <span className="text-gray-300">Video Introduction - Embedded video player section</span>
                      </label>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.portfolioGallery}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, portfolioGallery: e.target.checked})}
                        />
                        <span className="text-gray-300">Portfolio Gallery - Interactive project showcase</span>
                      </label>
                      <label className="flex items-center mb-2">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.testimonialsCarousel}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, testimonialsCarousel: e.target.checked})}
                        />
                        <span className="text-gray-300">Testimonials Carousel - Rotating recommendations</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="mr-3 h-4 w-4 text-cyan-500" 
                          checked={selectedFeatures.socialMediaLinks}
                          onChange={(e) => setSelectedFeatures({...selectedFeatures, socialMediaLinks: e.target.checked})}
                        />
                        <span className="text-gray-300">Social Media Links - Clickable social icons</span>
                      </label>
                    </div>
                  </div>
                </div>

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
                  className="mt-8 w-full bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate with Selected Options'
                  )}
                </button>
              </div>
            </div>

            {/* Quick Generate Card */}
            <div>
              <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-lg shadow-lg p-8 text-center sticky top-8 border border-purple-700/50">
                <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4 text-gray-100">Just Generate it for Me!</h3>
                <p className="text-gray-300 mb-6">
                  Let AI select the best options for you. Includes all enhancements, 
                  professional template, and multiple formats.
                </p>
                <ul className="text-left text-sm text-gray-400 mb-6 space-y-2">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Best template auto-selected
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    All enhancement features
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    PDF, DOCX & HTML formats
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    AI Career Podcast
                  </li>
                </ul>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      // Update job to enable all features
                      await generateCV(jobId!, 'modern', [
                        'ats-optimization',
                        'keyword-enhancement',
                        'achievement-highlighting',
                        'skills-visualization',
                        'generate-podcast',
                        'all-formats'
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
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-8 py-4 rounded-lg font-medium hover:from-purple-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="inline-block w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="inline-block w-5 h-5 mr-2" />
                      Just Generate it for Me
                    </>
                  )}
                </button>
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
                  ? 'bg-cyan-600 text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Enhanced Features
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
                  className="w-full flex items-center justify-between px-4 py-3 bg-cyan-900/30 text-cyan-400 rounded-lg hover:bg-cyan-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-700/50"
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
                  className="w-full flex items-center justify-between px-4 py-3 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed border border-green-700/50"
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
                    className="w-full flex items-center justify-between px-4 py-3 bg-purple-900/30 text-purple-400 rounded-lg hover:bg-purple-900/50 transition border border-purple-700/50"
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