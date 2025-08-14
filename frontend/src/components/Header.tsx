import React from 'react';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import { Breadcrumb, generateBreadcrumbs } from './Breadcrumb';

interface HeaderProps {
  currentPage?: string;
  jobId?: string;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'dark' | 'gradient';
  showBreadcrumbs?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  jobId,
  title,
  subtitle,
  variant = 'default',
  showBreadcrumbs = true
}) => {
  const getHeaderClasses = () => {
    switch (variant) {
      case 'dark':
        return 'bg-gray-800/95 backdrop-blur-md border-b border-gray-700';
      case 'gradient':
        return 'bg-gradient-to-r from-blue-600 to-purple-600 border-b border-blue-500/20';
      default:
        return 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm';
    }
  };

  const getTextClasses = () => {
    switch (variant) {
      case 'dark':
      case 'gradient':
        return 'text-white';
      default:
        return 'text-gray-900';
    }
  };

  const breadcrumbItems = currentPage ? generateBreadcrumbs(currentPage, jobId) : [];

  return (
    <>
      <header className={`sticky top-0 z-50 ${getHeaderClasses()}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Logo variant={variant === 'default' ? 'default' : 'white'} />
              
              {title && (
                <div className="hidden sm:block border-l border-gray-300 pl-4">
                  <h1 className={`text-lg font-semibold ${getTextClasses()}`}>
                    {title}
                  </h1>
                  {subtitle && (
                    <p className={`text-sm ${variant === 'default' ? 'text-gray-600' : 'text-gray-200'}`}>
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {currentPage && (
                <div className="hidden md:flex items-center space-x-2 text-sm">
                  <span className={variant === 'default' ? 'text-gray-600' : 'text-gray-200'}>
                    Step {getStepNumber(currentPage)} of 4:
                  </span>
                  <span className={`font-medium ${variant === 'default' ? 'text-blue-600' : 'text-blue-200'}`}>
                    {getStepLabel(currentPage)}
                  </span>
                </div>
              )}
              <UserMenu variant={variant === 'default' ? 'default' : 'white'} />
            </div>
          </div>
        </div>
      </header>

      {showBreadcrumbs && breadcrumbItems.length > 0 && (
        <div className={variant === 'default' ? 'bg-gray-50 border-b border-gray-200' : 'bg-gray-100/10 border-b border-white/10'}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumb 
              items={breadcrumbItems} 
              variant={variant === 'default' ? 'default' : 'dark'}
              className={variant === 'default' ? 'text-gray-700' : 'text-white/90'}
            />
          </div>
        </div>
      )}
    </>
  );
};

const getStepNumber = (currentPage: string): string => {
  switch (currentPage) {
    case 'processing':
      return '1';
    case 'analysis':
      return '2';
    case 'preview':
      return '3';
    case 'templates':
      return '3a'; // Templates are sub-step of customization
    case 'keywords':
      return '3b'; // Keywords are sub-step of customization
    case 'results':
      return '4'; // Results are step 4 in the complete flow
    default:
      return '1';
  }
};

const getStepLabel = (currentPage: string): string => {
  switch (currentPage) {
    case 'processing':
      return 'Processing CV';
    case 'analysis':
      return 'Analysis Results';
    case 'preview':
      return 'Preview & Customize';
    case 'templates':
      return 'Template Selection';
    case 'keywords':
      return 'Keyword Optimization';
    case 'results':
      return 'Final Results';
    default:
      return 'Getting Started';
  }
};