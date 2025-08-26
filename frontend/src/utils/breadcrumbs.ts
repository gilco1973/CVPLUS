export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string; // Change to string to represent icon names
  current?: boolean;
}

// Helper function to generate breadcrumb items for different pages
export const generateBreadcrumbs = (currentPage: string, jobId?: string): BreadcrumbItem[] => {
  switch (currentPage) {
    case 'processing':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', current: true, icon: 'BarChart3' },
      ];

    case 'analysis':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', current: true, icon: 'Eye' },
      ];

    case 'role-selection':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Role Selection', current: true, icon: 'Target' },
      ];

    case 'feature-selection':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Role Selection', path: jobId ? `/role-select/${jobId}` : undefined, icon: 'Target' },
        { label: 'Feature Selection', current: true, icon: 'CheckCircle' },
      ];

    case 'preview':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Role Selection', path: jobId ? `/role-select/${jobId}` : undefined, icon: 'Target' },
        { label: 'Preview & Customize', current: true, icon: 'Palette' },
      ];

    case 'templates':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Role Selection', path: jobId ? `/role-select/${jobId}` : undefined, icon: 'Target' },
        { label: 'Preview & Customize', path: jobId ? `/preview/${jobId}` : undefined, icon: 'Palette' },
        { label: 'Template Selection', current: true, icon: 'Palette' },
      ];

    case 'results':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Role Selection', path: jobId ? `/role-select/${jobId}` : undefined, icon: 'Target' },
        { label: 'Feature Selection', current: true, icon: 'CheckCircle' },
      ];

    case 'final-results':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Role Selection', path: jobId ? `/role-select/${jobId}` : undefined, icon: 'Target' },
        { label: 'Feature Selection', path: jobId ? `/select-features/${jobId}` : undefined, icon: 'CheckCircle' },
        { label: 'Final Results', path: jobId ? `/final-results/${jobId}` : undefined, current: true, icon: 'CheckCircle' },
      ];

    case 'keywords':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Role Selection', path: jobId ? `/role-select/${jobId}` : undefined, icon: 'Target' },
        { label: 'Preview & Customize', path: jobId ? `/preview/${jobId}` : undefined, icon: 'Palette' },
        { label: 'Keyword Optimization', path: jobId ? `/keywords/${jobId}` : undefined, current: true, icon: 'BarChart3' },
      ];

    case 'features':
      return [
        { label: 'Features', current: true, icon: 'Palette' },
      ];

    case 'about':
      return [
        { label: 'About', current: true, icon: 'FileText' },
      ];

    default:
      return [];
  }
};