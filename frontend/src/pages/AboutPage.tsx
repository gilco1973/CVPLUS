import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { 
  Code2, 
  Brain, 
  Heart, 
  Globe, 
  Github, 
  ExternalLink,
  Sparkles,
  Home,
  Lightbulb,
  Users,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AboutPage = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="small" />
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-gray-300 hover:text-cyan-400 font-medium transition-colors">Home</a>
              <a href="/features" className="text-gray-300 hover:text-cyan-400 font-medium transition-colors">Features</a>
              <a href="/about" className="text-cyan-400 font-medium">About</a>
              {user ? (
                <UserMenu />
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
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm"
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-6">
            About CVPlus
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            An open-source project dedicated to transforming how professionals present themselves
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Creator Section */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                <Code2 className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-100">Created by Gil Klainert</h2>
            </div>
            
            <div className="space-y-4 text-gray-300">
              <p className="text-lg leading-relaxed">
                Hi! I'm Gil Klainert, a Software Engineering Leader and AI Expert passionate about leveraging 
                technology to solve real-world problems. I created CVPlus as an open-source gift to 
                the community, believing that everyone deserves access to powerful tools that can help 
                them advance their careers.
              </p>
              
              <p className="text-lg leading-relaxed">
                This project combines my expertise in AI, web development, and user experience design 
                to create something that makes a real difference in people's professional lives.
              </p>

              <div className="flex items-center gap-4 mt-6">
                <a 
                  href="https://klainert.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Visit Klainert.com
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a 
                  href="https://github.com/gilco1973/cvplus" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Github className="w-4 h-4" />
                  View on GitHub
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Mission Section */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                <Heart className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-100">Our Mission</h2>
            </div>
            
            <p className="text-lg text-gray-300 leading-relaxed">
              CVPlus was born from a simple belief: your professional story deserves to be told 
              in the most compelling way possible. We're here to democratize access to AI-powered 
              career tools, making them free and accessible to everyone, regardless of their 
              background or financial situation.
            </p>
          </div>

          {/* Values Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                  <BookOpen className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">Open Source</h3>
                  <p className="text-gray-400">
                    Released under the MIT License, CVPlus is free to use, modify, and distribute. 
                    We believe in the power of community-driven development.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">AI-Powered</h3>
                  <p className="text-gray-400">
                    Leveraging Claude AI's advanced capabilities to understand, analyze, and enhance 
                    your professional profile with intelligent insights.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">Innovation First</h3>
                  <p className="text-gray-400">
                    Constantly pushing boundaries with features like AI career podcasts, interactive 
                    timelines, and dynamic QR codes that bring CVs to life.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">Community Driven</h3>
                  <p className="text-gray-400">
                    Built for the community, by the community. We welcome contributions, feedback, 
                    and ideas from users worldwide.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contributing Section */}
          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-2xl p-8 border border-cyan-800/30 mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-lg">
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-100">Want to Contribute?</h2>
            </div>
            
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              CVPlus is open to contributions! Whether you're a developer, designer, or just 
              someone with great ideas, we'd love to have you join our mission to revolutionize 
              how people present their professional stories.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="https://github.com/gilco1973/cvplus" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
              >
                <Github className="w-5 h-5" />
                Contribute on GitHub
                <ExternalLink className="w-4 h-4" />
              </a>
              <a 
                href="https://github.com/gilco1973/cvplus/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Report Issues & Ideas
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Built With Modern Technology</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                'React', 'TypeScript', 'Tailwind CSS', 'Firebase',
                'Claude AI', 'Vite', 'React Router', 'PDF Generation'
              ].map((tech) => (
                <div key={tech} className="bg-gray-700 rounded-lg px-4 py-2 text-center text-gray-300 text-sm font-medium">
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-100 mb-4">
            Ready to Transform Your CV?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of professionals who have already revolutionized their career presentation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              Get Started Now
            </button>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-gray-700 text-gray-100 font-semibold rounded-lg shadow-lg hover:shadow-xl border border-gray-600 transform hover:-translate-y-1 transition-all duration-200 hover:bg-gray-600"
            >
              <Home className="inline w-5 h-5 mr-2" />
              Back to Home
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 CVPlus. Released under MIT License.</p>
            <p className="mt-2">
              Created with ❤️ by <a href="https://klainert.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">Gil Klainert</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};