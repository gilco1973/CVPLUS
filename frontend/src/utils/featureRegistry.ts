import React from 'react';
import { CVFeatureProps, ComponentRegistry } from '../types/cv-features';

// Import all feature components (will be added as we implement them)
import { ContactForm } from '../components/features/ContactForm';

// AI-Powered Components (to be implemented)
// import { AIPodcastPlayer } from '../components/features/AI-Powered/AIPodcastPlayer';
// import { ATSOptimization } from '../components/features/AI-Powered/ATSOptimization';
// import { KeywordEnhancement } from '../components/features/AI-Powered/KeywordEnhancement';
// import { AchievementHighlighting } from '../components/features/AI-Powered/AchievementHighlighting';
// import { PrivacyMode } from '../components/features/AI-Powered/PrivacyMode';
// import { AIChatAssistant } from '../components/features/AI-Powered/AIChatAssistant';
// import { PublicProfile } from '../components/features/AI-Powered/PublicProfile';
// import { SkillsAnalytics } from '../components/features/AI-Powered/SkillsAnalytics';
// import { VideoIntroduction } from '../components/features/AI-Powered/VideoIntroduction';
// import { PersonalityInsights } from '../components/features/AI-Powered/PersonalityInsights';

// Interactive Components
import { DynamicQRCode } from '../components/features/Interactive/DynamicQRCode';
import { SocialMediaLinks } from '../components/features/Interactive/SocialMediaLinks';
// import { CareerTimeline } from '../components/features/Interactive/CareerTimeline';

// Visual Components (to be implemented)
// import { SkillsVisualization } from '../components/features/Visual/SkillsVisualization';
// import { AchievementCards } from '../components/features/Visual/AchievementCards';
// import { LanguageProficiency } from '../components/features/Visual/LanguageProficiency';
// import { CertificationBadges } from '../components/features/Visual/CertificationBadges';

// Media Components (to be implemented)
// import { PortfolioGallery } from '../components/features/Media/PortfolioGallery';
// import { TestimonialsCarousel } from '../components/features/Media/TestimonialsCarousel';

// Component Registry
export const FEATURE_COMPONENTS: ComponentRegistry = {
  // Existing components
  'ContactForm': ContactForm,
  'contact-form': ContactForm,
  'built-in-contact-form': ContactForm,

  // AI-Powered Components (placeholders for now)
  // 'AIPodcastPlayer': AIPodcastPlayer,
  // 'ai-career-podcast': AIPodcastPlayer,
  // 'ATSOptimization': ATSOptimization,
  // 'ats-optimization': ATSOptimization,
  // 'KeywordEnhancement': KeywordEnhancement,
  // 'keyword-enhancement': KeywordEnhancement,
  // 'AchievementHighlighting': AchievementHighlighting,
  // 'achievement-highlighting': AchievementHighlighting,
  // 'PrivacyMode': PrivacyMode,
  // 'privacy-mode': PrivacyMode,
  // 'AIChatAssistant': AIChatAssistant,
  // 'ai-chat-assistant': AIChatAssistant,
  // 'PublicProfile': PublicProfile,
  // 'public-profile': PublicProfile,
  // 'SkillsAnalytics': SkillsAnalytics,
  // 'skills-analytics': SkillsAnalytics,
  // 'VideoIntroduction': VideoIntroduction,
  // 'video-introduction': VideoIntroduction,
  // 'PersonalityInsights': PersonalityInsights,
  // 'personality-insights': PersonalityInsights,

  // Interactive Components
  'DynamicQRCode': DynamicQRCode,
  'qr-code': DynamicQRCode,
  'dynamic-qr-code': DynamicQRCode,
  'SocialMediaLinks': SocialMediaLinks,
  'social-media-links': SocialMediaLinks,
  'social-media-integration': SocialMediaLinks,
  // 'CareerTimeline': CareerTimeline,
  // 'career-timeline': CareerTimeline,
  // 'interactive-timeline': CareerTimeline,

  // Visual Components (placeholders for now)
  // 'SkillsVisualization': SkillsVisualization,
  // 'skills-visualization': SkillsVisualization,
  // 'interactive-skills-charts': SkillsVisualization,
  // 'AchievementCards': AchievementCards,
  // 'achievement-cards': AchievementCards,
  // 'animated-achievement-cards': AchievementCards,
  // 'LanguageProficiency': LanguageProficiency,
  // 'language-proficiency': LanguageProficiency,
  // 'language-proficiency-visuals': LanguageProficiency,
  // 'CertificationBadges': CertificationBadges,
  // 'certification-badges': CertificationBadges,
  // 'verified-certification-badges': CertificationBadges,

  // Media Components (placeholders for now)
  // 'PortfolioGallery': PortfolioGallery,
  // 'portfolio-gallery': PortfolioGallery,
  // 'interactive-portfolio-gallery': PortfolioGallery,
  // 'TestimonialsCarousel': TestimonialsCarousel,
  // 'testimonials-carousel': TestimonialsCarousel,
};

// Feature Registry Class
export class FeatureRegistry {
  private static instance: FeatureRegistry;
  private components: ComponentRegistry = { ...FEATURE_COMPONENTS };

  static getInstance(): FeatureRegistry {
    if (!FeatureRegistry.instance) {
      FeatureRegistry.instance = new FeatureRegistry();
    }
    return FeatureRegistry.instance;
  }

  // Register a new component
  register(name: string, component: React.ComponentType<CVFeatureProps>): void {
    this.components[name] = component;
  }

  // Get a component by name
  get(name: string): React.ComponentType<CVFeatureProps> | undefined {
    return this.components[name];
  }

  // Check if a component is registered
  has(name: string): boolean {
    return name in this.components;
  }

  // Get all registered component names
  getNames(): string[] {
    return Object.keys(this.components);
  }

  // Get all components
  getAll(): ComponentRegistry {
    return { ...this.components };
  }

  // Unregister a component
  unregister(name: string): void {
    delete this.components[name];
  }
}

// Utility functions
export const getFeatureComponent = (name: string): React.ComponentType<CVFeatureProps> | undefined => {
  return FeatureRegistry.getInstance().get(name);
};

export const registerFeatureComponent = (name: string, component: React.ComponentType<CVFeatureProps>): void => {
  FeatureRegistry.getInstance().register(name, component);
};

export const isFeatureSupported = (name: string): boolean => {
  return FeatureRegistry.getInstance().has(name);
};

// Feature categories for organization
export const FEATURE_CATEGORIES = {
  'ai-powered': [
    'ai-career-podcast',
    'ats-optimization', 
    'keyword-enhancement',
    'achievement-highlighting',
    'privacy-mode',
    'ai-chat-assistant',
    'public-profile',
    'skills-analytics',
    'video-introduction',
    'personality-insights'
  ],
  'interactive': [
    'qr-code',
    'career-timeline',
    'contact-form',
    'availability-calendar',
    'social-media-links'
  ],
  'visual': [
    'skills-visualization',
    'achievement-cards',
    'language-proficiency',
    'certification-badges'
  ],
  'media': [
    'video-introduction',
    'portfolio-gallery',
    'testimonials-carousel'
  ]
};

export const getFeatureCategory = (featureName: string): string | undefined => {
  for (const [category, features] of Object.entries(FEATURE_CATEGORIES)) {
    if (features.includes(featureName)) {
      return category;
    }
  }
  return undefined;
};