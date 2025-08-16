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

    // Smoothly update only feature previews when selectedFeatures changes
    const featurePreviews = previewRef.current.querySelectorAll('.feature-preview');
    featurePreviews.forEach(preview => {
      const featureId = preview.getAttribute('data-feature');
      if (featureId) {
        const isEnabled = selectedFeatures[featureId.replace(/-/g, '')];
        if (isEnabled) {
          preview.classList.remove('opacity-50');
        } else {
          preview.classList.add('opacity-50');
        }
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