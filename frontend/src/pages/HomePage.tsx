import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { URLInput } from '../components/URLInput';
import { SignInDialog } from '../components/SignInDialog';
import { UserMenu } from '../components/UserMenu';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { uploadCV, createJob } from '../services/cvService';
import { FileText, Globe, Sparkles, Menu } from 'lucide-react';
import toast from 'react-hot-toast';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user, signInAnonymous, signInWithGoogle, error, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'file' | 'url', data: any } | null>(null);
  const [userInstructions, setUserInstructions] = useState<string>('');

  const handleFileUpload = async (file: File, quickCreate: boolean = false) => {
    try {
      setIsLoading(true);
      
      // Sign in anonymously if not authenticated
      const currentUser = user;
      if (!currentUser) {
        try {
          clearError(); // Clear any previous auth errors
          await signInAnonymous();
          // Wait a bit for the auth state to update
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (authError: any) {
          // If anonymous sign-in fails, show user-friendly error and sign-in dialog
          setIsLoading(false);
          setPendingAction({ type: 'file', data: { file, quickCreate } });
          setShowSignInDialog(true);
          toast.error(authError.message || 'Authentication required. Please sign in to continue.');
          return;
        }
      }

      // Create job and upload file
      const jobId = await createJob(undefined, quickCreate, userInstructions);
      await uploadCV(file, jobId);
      
      // Navigate to processing page with quick create flag
      navigate(`/process/${jobId}${quickCreate ? '?quickCreate=true' : ''}`);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload CV. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleURLSubmit = async (url: string) => {
    try {
      setIsLoading(true);
      
      // Sign in anonymously if not authenticated
      const currentUser = user;
      if (!currentUser) {
        await signInAnonymous();
        // Wait a bit for the auth state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create job for URL
      const jobId = await createJob(url, false, userInstructions);
      
      // Navigate to processing page
      navigate(`/process/${jobId}`);
    } catch (error: any) {
      console.error('Error processing URL:', error);
      toast.error(error.message || 'Failed to process URL. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCreate = () => {
    if (selectedFile) {
      handleFileUpload(selectedFile, true);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    handleFileUpload(file);
  };

  const handleSignInSuccess = () => {
    setShowSignInDialog(false);
    // Retry the pending action after successful sign-in
    if (pendingAction) {
      if (pendingAction.type === 'file') {
        handleFileUpload(pendingAction.data.file, pendingAction.data.quickCreate);
      }
      setPendingAction(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="small" variant="white" />
            
            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-700">
              <Menu className="w-6 h-6 text-gray-300" />
            </button>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-blue-400 font-medium">Home</a>
              <a href="/features" className="text-gray-300 hover:text-blue-400 font-medium transition-colors">Features</a>
              <a href="/about" className="text-gray-300 hover:text-blue-400 font-medium transition-colors">About</a>
              {user ? (
                <UserMenu variant="white" />
              ) : (
                <button 
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                      toast.success('Signed in successfully!');
                    } catch (error) {
                      toast.error('Failed to sign in');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm"
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-screen filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-100 mb-6 leading-tight animate-fade-in-up">
              From Paper to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-400">Powerful</span>
            </h1>
            <p className="text-3xl md:text-4xl font-light text-gray-300 mb-8 animate-fade-in-up animation-delay-200">
              Your CV, Reinvented
            </p>
            
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto animate-fade-in-up animation-delay-300">
              Transform your traditional CV into an interactive masterpiece with AI-powered features, stunning templates, and one-click magic
            </p>
            
            <div className="flex justify-center mb-12 animate-fade-in-up animation-delay-400">
              <button 
                onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 hover-glow"
              >
                Get Started Free
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">10,000+</div>
                <div className="text-sm text-gray-400">CVs Transformed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">4.9/5</div>
                <div className="text-sm text-gray-400">User Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">30 sec</div>
                <div className="text-sm text-gray-400">Average Time</div>
              </div>
            </div>

            {/* Upload Options */}
            <div id="upload-section" className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700 animate-fade-in-up animation-delay-600">
              <h2 className="text-2xl font-bold text-gray-100 mb-6">Start Your Transformation</h2>
              
              {/* Display auth errors */}
              {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                    <button
                      onClick={clearError}
                      className="text-red-400 hover:text-red-200 ml-4 p-1"
                      aria-label="Clear error"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-6">
                  <label className="text-sm font-medium text-gray-300">Upload Method:</label>
                  <div className="inline-flex rounded-lg bg-gray-700 p-1">
                    <div
                      onClick={() => setUploadMode('file')}
                      className={`px-4 py-2 rounded-md cursor-pointer transition ${
                        uploadMode === 'file'
                          ? 'bg-gray-900 text-blue-400 shadow-sm font-medium'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <FileText className="inline-block w-4 h-4 mr-2" />
                      File Upload
                    </div>
                    <div
                      onClick={() => setUploadMode('url')}
                      className={`px-4 py-2 rounded-md cursor-pointer transition ${
                        uploadMode === 'url'
                          ? 'bg-gray-900 text-blue-400 shadow-sm font-medium'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Globe className="inline-block w-4 h-4 mr-2" />
                      URL Import
                    </div>
                  </div>
                </div>
              </div>

              {uploadMode === 'file' ? (
                <FileUpload 
                  onFileSelect={handleFileSelect} 
                  isLoading={isLoading}
                />
              ) : (
                <URLInput 
                  onSubmit={handleURLSubmit}
                  isLoading={isLoading}
                />
              )}

              {/* User Instructions Input */}
              <div className="mt-6">
                <label htmlFor="userInstructions" className="block text-left text-sm font-medium text-gray-300 mb-2">
                  Special Instructions (Optional)
                </label>
                <div className="relative">
                  <textarea
                    id="userInstructions"
                    value={userInstructions}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setUserInstructions(e.target.value);
                      }
                    }}
                    placeholder="E.g., 'Focus on my leadership experience', 'Highlight Python skills', 'Make it suitable for tech startups', 'Emphasize remote work experience'..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-gray-400"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                    {userInstructions.length}/500
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Provide specific instructions to customize how AI analyzes and enhances your CV
                </p>
              </div>

              {/* Quick Create Button */}
              {selectedFile && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      File selected: {selectedFile.name}
                    </span>
                    <button
                      onClick={handleQuickCreate}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Sparkles className="inline-block w-4 h-4 mr-2" />
                      Just Create My CV
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Automatically applies all enhancements and generates all formats
                  </p>
                </div>
              )}
            </div>

          </div>
        </section>


        {/* Original Features Section */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-100 mb-4">
              Core Features
            </h2>
            <p className="text-xl text-gray-400 text-center mb-16 max-w-3xl mx-auto">
              Professional CV generation with smart enhancements
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 stagger-animation">
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all hover-lift hover-glow">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 w-16 h-16 mb-4 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-100">AI-Powered Analysis</h3>
                <p className="text-gray-400">Claude AI intelligently parses and enhances your CV content for maximum impact</p>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-4 w-16 h-16 mb-4 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-100">Stunning Templates</h3>
                <p className="text-gray-400">Professional designs that make your experience shine through</p>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-4 w-16 h-16 mb-4 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-100">Interactive Elements</h3>
                <p className="text-gray-400">QR codes, timelines, charts, and more to make your CV memorable</p>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-4 w-16 h-16 mb-4 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-100">Multiple Formats</h3>
                <p className="text-gray-400">Export to PDF, DOCX, or share online with a single click</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-100 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400 text-center mb-16 max-w-3xl mx-auto">
              Transform your CV in three simple steps
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="mb-6">
                  <img 
                    src="/images/upload-cv-illustration.svg" 
                    alt="Upload Your CV" 
                    className="w-full h-48 object-contain mx-auto"
                  />
                </div>
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-900 font-bold text-lg">1</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-100">Upload Your CV</h3>
                <p className="text-gray-400">
                  Simply upload your existing CV or paste a URL. We support PDF, DOCX, and online profiles.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="text-center">
                <div className="mb-6">
                  <img 
                    src="/images/ai-enhancement-illustration.svg" 
                    alt="AI Enhancement" 
                    className="w-full h-48 object-contain mx-auto"
                  />
                </div>
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-900 font-bold text-lg">2</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-100">AI Enhancement</h3>
                <p className="text-gray-400">
                  Our AI analyzes and enhances your content, optimizing for ATS and adding interactive features.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="text-center">
                <div className="mb-6">
                  <img 
                    src="/images/download-share-illustration.svg" 
                    alt="Download & Share" 
                    className="w-full h-48 object-contain mx-auto"
                  />
                </div>
                <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-900 font-bold text-lg">3</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-100">Download & Share</h3>
                <p className="text-gray-400">
                  Export your enhanced CV as PDF, DOCX, or share online with a unique link.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 CVPlus. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Sign In Dialog */}
      <SignInDialog 
        isOpen={showSignInDialog}
        onClose={() => setShowSignInDialog(false)}
        onSuccess={handleSignInSuccess}
      />
    </div>
  );
};