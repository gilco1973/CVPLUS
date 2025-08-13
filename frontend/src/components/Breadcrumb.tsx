import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home, FileText, BarChart3, Eye, Palette, CheckCircle } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  variant?: 'default' | 'dark';
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '', variant = 'default' }) => {
  const navigate = useNavigate();

  const handleItemClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <button
        onClick={() => navigate('/')}
        className={`flex items-center transition-colors ${
          variant === 'dark' 
            ? 'text-gray-300 hover:text-blue-400' 
            : 'text-gray-700 hover:text-blue-600'
        }`}
        title="Home"
      >
        <Home className="w-4 h-4" />
      </button>
      
      {items.length > 0 && <ChevronRight className={`w-4 h-4 ${
        variant === 'dark' ? 'text-gray-500' : 'text-gray-400'
      }`} />}
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className={`w-4 h-4 ${
            variant === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`} />}
          
          {item.current ? (
            <span className={`flex items-center space-x-1 font-medium ${
              variant === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {item.icon && <span className={variant === 'dark' ? 'text-blue-400' : 'text-blue-600'}>{item.icon}</span>}
              <span>{item.label}</span>
            </span>
          ) : (
            <button
              onClick={() => handleItemClick(item.path)}
              className={`flex items-center space-x-1 transition-colors ${
                variant === 'dark'
                  ? 'text-gray-300 hover:text-blue-400'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              {item.icon && <span className={variant === 'dark' ? 'text-gray-400' : 'text-gray-600'}>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Helper function to generate breadcrumb items for different pages
export const generateBreadcrumbs = (currentPage: string, jobId?: string): BreadcrumbItem[] => {

  switch (currentPage) {
    case 'processing':
      return [
        { label: 'Upload CV', path: '/', icon: <FileText className="w-4 h-4" /> },
        { label: 'Processing', current: true, icon: <BarChart3 className="w-4 h-4" /> },
      ];

    case 'analysis':
      return [
        { label: 'Upload CV', path: '/', icon: <FileText className="w-4 h-4" /> },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Analysis Results', current: true, icon: <Eye className="w-4 h-4" /> },
      ];

    case 'preview':
      return [
        { label: 'Upload CV', path: '/', icon: <FileText className="w-4 h-4" /> },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: <Eye className="w-4 h-4" /> },
        { label: 'Preview & Customize', current: true, icon: <Palette className="w-4 h-4" /> },
      ];

    case 'templates':
      return [
        { label: 'Upload CV', path: '/', icon: <FileText className="w-4 h-4" /> },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: <Eye className="w-4 h-4" /> },
        { label: 'Preview & Customize', path: jobId ? `/preview/${jobId}` : undefined, icon: <Palette className="w-4 h-4" /> },
        { label: 'Template Selection', current: true, icon: <Palette className="w-4 h-4" /> },
      ];

    case 'results':
      return [
        { label: 'Upload CV', path: '/', icon: <FileText className="w-4 h-4" /> },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: <Eye className="w-4 h-4" /> },
        { label: 'Preview & Customize', path: jobId ? `/preview/${jobId}` : undefined, icon: <Palette className="w-4 h-4" /> },
        { label: 'Final Results', current: true, icon: <CheckCircle className="w-4 h-4" /> },
      ];

    case 'keywords':
      return [
        { label: 'Upload CV', path: '/', icon: <FileText className="w-4 h-4" /> },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: <Eye className="w-4 h-4" /> },
        { label: 'Preview & Customize', path: jobId ? `/preview/${jobId}` : undefined, icon: <Palette className="w-4 h-4" /> },
        { label: 'Keyword Optimization', current: true, icon: <BarChart3 className="w-4 h-4" /> },
      ];

    case 'features':
      return [
        { label: 'Features', current: true, icon: <Palette className="w-4 h-4" /> },
      ];

    case 'about':
      return [
        { label: 'About', current: true, icon: <FileText className="w-4 h-4" /> },
      ];

    default:
      return [];
  }
};