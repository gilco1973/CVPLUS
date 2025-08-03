import * as functions from 'firebase-functions';
import { CVTemplate } from '../types';

const templates: CVTemplate[] = [
  {
    id: 'modern-tech',
    name: 'Modern Tech',
    description: 'Clean and modern design perfect for tech professionals',
    thumbnail: 'https://storage.googleapis.com/getmycv/templates/modern-tech.png',
    category: 'modern',
    isPremium: false,
    config: {
      colors: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#60a5fa',
        text: '#1f2937',
        background: '#ffffff'
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter'
      },
      layout: 'two-column'
    }
  },
  {
    id: 'executive-classic',
    name: 'Executive Classic',
    description: 'Traditional and professional design for senior positions',
    thumbnail: 'https://storage.googleapis.com/getmycv/templates/executive-classic.png',
    category: 'classic',
    isPremium: true,
    config: {
      colors: {
        primary: '#0f172a',
        secondary: '#334155',
        accent: '#64748b',
        text: '#0f172a',
        background: '#ffffff'
      },
      fonts: {
        heading: 'Playfair Display',
        body: 'Merriweather'
      },
      layout: 'single-column'
    }
  },
  {
    id: 'creative-designer',
    name: 'Creative Designer',
    description: 'Bold and creative layout for designers and artists',
    thumbnail: 'https://storage.googleapis.com/getmycv/templates/creative-designer.png',
    category: 'creative',
    isPremium: true,
    config: {
      colors: {
        primary: '#dc2626',
        secondary: '#f59e0b',
        accent: '#10b981',
        text: '#111827',
        background: '#fef3c7'
      },
      fonts: {
        heading: 'Bebas Neue',
        body: 'Open Sans'
      },
      layout: 'asymmetric'
    }
  }
];

export const getTemplates = functions.https.onCall(async (data, context) => {
  const { category, includePublic } = data;

  let filteredTemplates = templates;

  if (category) {
    filteredTemplates = templates.filter(t => t.category === category);
  }

  if (!includePublic) {
    filteredTemplates = filteredTemplates.filter(t => !t.isPremium);
  }

  return {
    templates: filteredTemplates,
    total: filteredTemplates.length
  };
});