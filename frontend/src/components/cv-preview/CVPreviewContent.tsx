import React, { useRef, useEffect } from 'react';
import type { CVPreviewContentProps } from '../../types/cv-preview';
import { CVTemplateGenerator } from '../../utils/cv-preview/cvTemplateGenerator';
import { useFeaturePreviews } from '../../hooks/cv-preview/useFeaturePreviews';
import { PlaceholderBanner } from './PlaceholderBanner';

export const CVPreviewContent: React.FC<CVPreviewContentProps> = ({
  previewData,
  selectedTemplate,
  selectedFeatures,
  showFeaturePreviews,
  collapsedSections,
  qrCodeSettings,
  showPlaceholderBanner,
  onToggleSection,
  onEditQRCode,
  onAnalyzeAchievements,
  onStartEditing,
  onDismissPlaceholderBanner
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { generateFeaturePreview } = useFeaturePreviews(previewData);

  // Generate the HTML content
  const generatePreviewHTML = () => {
    if (!showFeaturePreviews) {
      // Return basic CV without feature previews
      return CVTemplateGenerator.generateHTML(
        previewData,
        selectedTemplate,
        {},
        qrCodeSettings,
        collapsedSections,
        () => '' // No feature previews
      );
    }

    return CVTemplateGenerator.generateHTML(
      previewData,
      selectedTemplate,
      selectedFeatures,
      qrCodeSettings,
      collapsedSections,
      generateFeaturePreview
    );
  };

  // Setup event listeners and DOM interactions
  useEffect(() => {
    if (!previewRef.current) return;

    // Add click handlers for editing
    const editButtons = previewRef.current.querySelectorAll('.edit-overlay');
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const section = (e.target as HTMLElement).closest('.editable-section')?.getAttribute('data-section');
        if (section) {
          // This will be handled by the parent component via global function
          console.log('Edit section requested:', section);
        }
      });
    });

    // Add click handlers for collapsing sections
    const sectionTitles = previewRef.current.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
      title.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionElement = (e.target as HTMLElement).closest('.section, .feature-preview');
        const sectionId = sectionElement?.getAttribute('data-section') || 
                          sectionElement?.getAttribute('data-feature');
        if (sectionId) {
          onToggleSection(sectionId);
        }
      });
    });

    // Add global functions for inline HTML calls
    const windowWithFunctions = window as Window & {
      toggleSection?: typeof onToggleSection;
      editSection?: (section: string) => void;
      editQRCode?: typeof onEditQRCode;
      handleAchievementAnalysis?: typeof onAnalyzeAchievements;
    };
    
    windowWithFunctions.toggleSection = onToggleSection;
    windowWithFunctions.editSection = (section: string) => {
      // This should trigger the section editing in the parent component
      console.log('Edit section requested:', section);
    };
    windowWithFunctions.editQRCode = onEditQRCode;
    windowWithFunctions.handleAchievementAnalysis = onAnalyzeAchievements;

    // Add smooth animations for feature previews
    const featurePreviews = previewRef.current.querySelectorAll('.feature-preview');
    featurePreviews.forEach((preview, index) => {
      (preview as HTMLElement).style.animationDelay = `${index * 0.1}s`;
      preview.classList.add('animate-fade-in-up');
    });

    return () => {
      // Clean up global functions
      delete windowWithFunctions.toggleSection;
      delete windowWithFunctions.editSection;
      delete windowWithFunctions.editQRCode;
      delete windowWithFunctions.handleAchievementAnalysis;
    };
  }, [onToggleSection, onEditQRCode, onAnalyzeAchievements, previewData]);

  // Real-time feature updates
  useEffect(() => {
    if (!previewRef.current) return;

    // Map feature IDs to their camelCase equivalents in selectedFeatures
    const featureMapping: Record<string, string> = {
      // Core Enhancement Features
      'ats-optimization': 'atsOptimization',
      'keyword-enhancement': 'keywordEnhancement',
      'achievement-highlighting': 'achievementHighlighting',
      
      // Interactive Features
      'skills-visualization': 'skillsVisualization',
      'skills-chart': 'skillsChart',
      'interactive-timeline': 'interactiveTimeline',
      
      // Multimedia Features
      'generate-podcast': 'generatePodcast',
      'video-introduction': 'videoIntroduction',
      'portfolio-gallery': 'portfolioGallery',
      
      // Professional Features
      'certification-badges': 'certificationBadges',
      'language-proficiency': 'languageProficiency',
      'achievements-showcase': 'achievementsShowcase',
      
      // Contact & Integration Features
      'contact-form': 'contactForm',
      'social-media-links': 'socialMediaLinks',
      'availability-calendar': 'availabilityCalendar',
      'testimonials-carousel': 'testimonialsCarousel',
      
      // Technical Features
      'embed-qr-code': 'embedQRCode',
      'privacy-mode': 'privacyMode'
    };

    console.log('🔄 [DYNAMIC UPDATE] selectedFeatures changed:', selectedFeatures);
    console.log('🔄 [DYNAMIC UPDATE] Available selectedFeatures keys:', Object.keys(selectedFeatures));
    
    // Smoothly update only feature previews when selectedFeatures changes
    const featurePreviews = previewRef.current.querySelectorAll('.feature-preview');
    console.log(`🔄 [DYNAMIC UPDATE] Found ${featurePreviews.length} feature previews in DOM`);
    
    featurePreviews.forEach((preview, index) => {
      const featureId = preview.getAttribute('data-feature');
      if (featureId) {
        const camelCaseKey = featureMapping[featureId];
        const isEnabled = camelCaseKey ? selectedFeatures[camelCaseKey] : false;
        
        console.log(`🔄 [DYNAMIC UPDATE #${index + 1}] Feature: ${featureId}, CamelCase: ${camelCaseKey}, Enabled: ${isEnabled}`);
        
        // Handle both direct key match and camelCase mapping
        const directMatch = selectedFeatures[featureId];
        const finalEnabled = isEnabled || directMatch;
        
        if (finalEnabled) {
          preview.classList.remove('opacity-50', 'grayscale');
          preview.classList.add('animate-fade-in-up');
          (preview as HTMLElement).style.transform = 'scale(1)';
        } else {
          preview.classList.add('opacity-50', 'grayscale');
          preview.classList.remove('animate-fade-in-up');
          (preview as HTMLElement).style.transform = 'scale(0.95)';
        }
      } else {
        console.warn(`🔄 [DYNAMIC UPDATE] Preview element ${index + 1} missing data-feature attribute`);
      }
    });
  }, [selectedFeatures]);

  return (
    <div className="cv-preview-content-wrapper">
      {/* Placeholder Banner */}
      {showPlaceholderBanner && (
        <PlaceholderBanner
          cvData={previewData}
          onDismiss={onDismissPlaceholderBanner}
          onStartEditing={onStartEditing}
          className="mb-4"
          autoHideAfter={15000} // Auto-hide after 15 seconds
        />
      )}
      
      {/* CV Preview Content */}
      <div 
        ref={previewRef}
        className="cv-preview-content bg-white rounded-lg shadow-sm border border-gray-200"
        dangerouslySetInnerHTML={{ __html: generatePreviewHTML() }}
      />
    </div>
  );
};