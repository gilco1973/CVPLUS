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

    // Removed role-selection case - functionality integrated into analysis page

    case 'feature-selection':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Feature Selection', current: true, icon: 'CheckCircle' },
      ];

    case 'preview':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Feature Selection', path: jobId ? `/customize/${jobId}` : undefined, icon: 'CheckCircle' },
        { label: 'Preview & Customize', current: true, icon: 'Palette' },
      ];

    case 'templates':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Feature Selection', path: jobId ? `/customize/${jobId}` : undefined, icon: 'CheckCircle' },
        { label: 'Preview & Customize', path: jobId ? `/preview/${jobId}` : undefined, icon: 'Palette' },
        { label: 'Template Selection', current: true, icon: 'Palette' },
      ];

    case 'results':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Feature Selection', path: jobId ? `/customize/${jobId}` : undefined, icon: 'CheckCircle' },
        { label: 'Final Results', current: true, icon: 'CheckCircle' },
      ];

    case 'keywords':
      return [
        { label: 'Upload CV', path: '/', icon: 'FileText' },
        { label: 'Processing', path: jobId ? `/process/${jobId}` : undefined, icon: 'BarChart3' },
        { label: 'Analysis Results', path: jobId ? `/analysis/${jobId}` : undefined, icon: 'Eye' },
        { label: 'Feature Selection', path: jobId ? `/customize/${jobId}` : undefined, icon: 'CheckCircle' },
        { label: 'Preview & Customize', path: jobId ? `/preview/${jobId}` : undefined, icon: 'Palette' },
        { label: 'Keyword Optimization', current: true, icon: 'BarChart3' },
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