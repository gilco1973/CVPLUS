import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { URLInput } from '../components/URLInput';
import { useAuth } from '../contexts/AuthContext';
import { uploadCV, createJob } from '../services/cvService';
import { ArrowRight, FileText, Globe, Sparkles } from 'lucide-react';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user, signInAnonymous } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = async (file: File, quickCreate: boolean = false) => {
    try {
      setIsLoading(true);
      
      // Sign in anonymously if not authenticated
      let currentUser = user;
      if (!currentUser) {
        await signInAnonymous();
        currentUser = user;
      }

      // Create job and upload file
      const jobId = await createJob(undefined, quickCreate);
      const fileUrl = await uploadCV(file, jobId);
      
      // Navigate to processing page with quick create flag
      navigate(`/process/${jobId}${quickCreate ? '?quickCreate=true' : ''}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleURLSubmit = async (url: string) => {
    try {
      setIsLoading(true);
      
      // Sign in anonymously if not authenticated
      let currentUser = user;
      if (!currentUser) {
        await signInAnonymous();
        currentUser = user;
      }

      // Create job for URL
      const jobId = await createJob(url);
      
      // Navigate to processing page
      navigate(`/process/${jobId}`);
    } catch (error) {
      console.error('Error processing URL:', error);
      // TODO: Show error toast
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">GetMyCV.ai</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Sign In
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Transform Your CV in One Click
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              AI-Powered Professional CV Creator with Podcast Generation
            </p>

            {/* Upload Options */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-center mb-8">
                <div className="inline-flex rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => setUploadMode('file')}
                    className={`px-4 py-2 rounded-md transition ${
                      uploadMode === 'file'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileText className="inline-block w-4 h-4 mr-2" />
                    Upload File
                  </button>
                  <button
                    onClick={() => setUploadMode('url')}
                    className={`px-4 py-2 rounded-md transition ${
                      uploadMode === 'url'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="inline-block w-4 h-4 mr-2" />
                    Enter URL
                  </button>
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

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="font-semibold mb-2">AI Analysis</h3>
                <p className="text-gray-600 text-sm">Smart parsing with Claude AI</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="font-semibold mb-2">Pro Templates</h3>
                <p className="text-gray-600 text-sm">10+ professional designs</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🎙️</span>
                </div>
                <h3 className="font-semibold mb-2">AI Podcast</h3>
                <p className="text-gray-600 text-sm">Audio summary of achievements</p>
              </div>
              <div className="text-center">
                <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="font-semibold mb-2">Multi-format</h3>
                <p className="text-gray-600 text-sm">PDF, DOCX, HTML export</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 GetMyCV.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};