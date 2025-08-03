# Interactive CV Features Design

## Overview
The Interactive CV Features system allows users to select and customize various interactive elements that will be embedded in their generated CV. These features transform a static CV into a dynamic, engaging professional profile.

## Feature Selection Architecture

```mermaid
flowchart TB
    subgraph "Feature Selection UI"
        FeatureGrid[Feature Selection Grid]
        Preview[Live Preview]
        Config[Feature Configuration]
    end
    
    subgraph "Available Features"
        Podcast[AI Podcast]
        Video[Video Introduction]
        Timeline[Interactive Timeline]
        Skills[Skill Visualization]
        Portfolio[Portfolio Gallery]
        Testimonials[Testimonials Carousel]
        Contact[Smart Contact Card]
        Analytics[View Analytics]
        QRCode[QR Code]
        Social[Social Links]
        Calendar[Schedule Meeting]
        Chat[AI Chat Assistant]
    end
    
    subgraph "Generation Engine"
        FeatureBuilder[Feature Builder]
        EmbedGenerator[Embed Code Generator]
        InteractiveCV[Interactive CV Generator]
    end
    
    FeatureGrid --> Config
    Config --> FeatureBuilder
    FeatureBuilder --> EmbedGenerator
    EmbedGenerator --> InteractiveCV
    
    All Features --> FeatureGrid
```

## Interactive Features Catalog

### 1. AI-Generated Podcast (NotebookLLM Integration)

```typescript
interface PodcastFeature {
  id: 'ai-podcast';
  name: 'AI Podcast Summary';
  description: 'AI-generated audio overview of your achievements';
  icon: '🎙️';
  category: 'multimedia';
  config: {
    duration: '2-5min' | '5-10min' | '10-15min';
    voice: 'professional' | 'conversational' | 'energetic';
    topics: string[]; // Selected sections to include
    language: string;
  };
  embed: {
    type: 'audio-player';
    autoplay: boolean;
    showTranscript: boolean;
  };
}
```

### 2. Video Introduction

```typescript
interface VideoIntroFeature {
  id: 'video-intro';
  name: 'Video Introduction';
  description: '30-second elevator pitch video';
  icon: '🎥';
  category: 'multimedia';
  config: {
    videoUrl?: string; // User uploads or records
    thumbnailUrl?: string;
    duration: number;
    captions: boolean;
  };
  embed: {
    type: 'video-player';
    controls: boolean;
    loop: boolean;
  };
}
```

### 3. Interactive Timeline

```typescript
interface TimelineFeature {
  id: 'interactive-timeline';
  name: 'Career Timeline';
  description: 'Visual journey of your professional growth';
  icon: '📈';
  category: 'visualization';
  config: {
    style: 'horizontal' | 'vertical' | 'curved';
    showMilestones: boolean;
    animated: boolean;
    color: string;
  };
  embed: {
    type: 'timeline-widget';
    interactive: boolean;
    zoomable: boolean;
  };
}
```

### 4. Skills Visualization

```typescript
interface SkillsVisualization {
  id: 'skills-viz';
  name: 'Interactive Skills Chart';
  description: 'Dynamic visualization of your skillset';
  icon: '📊';
  category: 'visualization';
  config: {
    chartType: 'radar' | 'bubble' | 'tree' | 'wordcloud';
    animated: boolean;
    interactive: boolean;
    showProficiency: boolean;
  };
  embed: {
    type: 'chart-widget';
    responsive: boolean;
  };
}
```

### 5. Portfolio Gallery

```typescript
interface PortfolioGallery {
  id: 'portfolio-gallery';
  name: 'Project Portfolio';
  description: 'Showcase your best work with images and links';
  icon: '🖼️';
  category: 'showcase';
  config: {
    layout: 'grid' | 'carousel' | 'masonry';
    itemsPerPage: number;
    showDescriptions: boolean;
    linkToProjects: boolean;
  };
  projects: Array<{
    title: string;
    description: string;
    imageUrl: string;
    projectUrl?: string;
    technologies: string[];
  }>;
}
```

### 6. Testimonials Carousel

```typescript
interface TestimonialsFeature {
  id: 'testimonials';
  name: 'Professional Testimonials';
  description: 'Recommendations from colleagues and clients';
  icon: '💬';
  category: 'social-proof';
  config: {
    autoRotate: boolean;
    rotationSpeed: number;
    showLinkedInBadge: boolean;
  };
  testimonials: Array<{
    author: string;
    role: string;
    company: string;
    text: string;
    linkedinUrl?: string;
    photo?: string;
  }>;
}
```

### 7. Smart Contact Card

```typescript
interface SmartContactCard {
  id: 'smart-contact';
  name: 'One-Click Contact';
  description: 'Interactive contact options with calendar integration';
  icon: '📇';
  category: 'communication';
  config: {
    showCalendar: boolean;
    showDirectMessage: boolean;
    showPhoneScheduler: boolean;
    preferredContact: 'email' | 'linkedin' | 'calendar';
  };
  embed: {
    type: 'contact-widget';
    floating: boolean;
    position: 'top-right' | 'bottom-right' | 'inline';
  };
}
```

### 8. View Analytics

```typescript
interface ViewAnalytics {
  id: 'view-analytics';
  name: 'CV Analytics';
  description: 'Track who views your CV (with privacy consent)';
  icon: '📊';
  category: 'analytics';
  config: {
    trackViews: boolean;
    trackDownloads: boolean;
    trackInteractions: boolean;
    anonymize: boolean;
  };
  dashboard: {
    showToOwner: boolean;
    publicStats: boolean;
  };
}
```

### 9. QR Code Integration

```typescript
interface QRCodeFeature {
  id: 'qr-code';
  name: 'Smart QR Code';
  description: 'QR code linking to your online profile';
  icon: '📱';
  category: 'connectivity';
  config: {
    destination: 'online-cv' | 'linkedin' | 'portfolio' | 'vcard';
    style: 'standard' | 'branded' | 'custom';
    logo?: string;
    color: string;
  };
}
```

### 10. Social Media Links

```typescript
interface SocialLinks {
  id: 'social-links';
  name: 'Professional Networks';
  description: 'Interactive social media connections';
  icon: '🔗';
  category: 'connectivity';
  config: {
    style: 'icons' | 'buttons' | 'cards';
    animation: 'none' | 'hover' | 'pulse';
    platforms: Array<{
      name: string;
      url: string;
      icon: string;
      color: string;
    }>;
  };
}
```

### 11. Meeting Scheduler

```typescript
interface MeetingScheduler {
  id: 'meeting-scheduler';
  name: 'Book a Meeting';
  description: 'Integrated calendar for interview scheduling';
  icon: '📅';
  category: 'communication';
  config: {
    calendarProvider: 'calendly' | 'google' | 'outlook' | 'custom';
    availability: any; // Calendar availability rules
    meetingTypes: Array<{
      name: string;
      duration: number;
      description: string;
    }>;
  };
}
```

### 12. AI Chat Assistant

```typescript
interface AIChatAssistant {
  id: 'ai-chat';
  name: 'CV Chat Assistant';
  description: 'AI that can answer questions about your experience';
  icon: '🤖';
  category: 'ai-powered';
  config: {
    personality: 'professional' | 'friendly' | 'concise';
    allowedTopics: string[];
    customResponses: Map<string, string>;
    model: 'claude' | 'gpt';
  };
  embed: {
    type: 'chat-widget';
    position: 'bottom-right' | 'bottom-left';
    welcomeMessage: string;
  };
}
```

## Feature Selection UI Implementation

```typescript
// components/FeatureSelector.tsx
import React, { useState } from 'react';
import { Feature, FeatureConfig } from '../types/features';

interface FeatureSelectorProps {
  availableFeatures: Feature[];
  onFeaturesSelected: (features: FeatureConfig[]) => void;
}

export const FeatureSelector: React.FC<FeatureSelectorProps> = ({
  availableFeatures,
  onFeaturesSelected
}) => {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [featureConfigs, setFeatureConfigs] = useState<Map<string, any>>(new Map());

  const categories = [
    { id: 'multimedia', name: 'Multimedia', icon: '🎬' },
    { id: 'visualization', name: 'Data Visualization', icon: '📊' },
    { id: 'showcase', name: 'Portfolio Showcase', icon: '🖼️' },
    { id: 'social-proof', name: 'Social Proof', icon: '⭐' },
    { id: 'communication', name: 'Communication', icon: '💬' },
    { id: 'connectivity', name: 'Connectivity', icon: '🔗' },
    { id: 'ai-powered', name: 'AI Features', icon: '🤖' },
    { id: 'analytics', name: 'Analytics', icon: '📈' }
  ];

  return (
    <div className="feature-selector">
      <h2>Customize Your Interactive CV</h2>
      <p>Select the features you want to include in your CV</p>

      {categories.map(category => (
        <div key={category.id} className="feature-category">
          <h3>
            <span className="category-icon">{category.icon}</span>
            {category.name}
          </h3>
          
          <div className="feature-grid">
            {availableFeatures
              .filter(f => f.category === category.id)
              .map(feature => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  selected={selectedFeatures.has(feature.id)}
                  onToggle={(selected) => {
                    const newSelected = new Set(selectedFeatures);
                    if (selected) {
                      newSelected.add(feature.id);
                    } else {
                      newSelected.delete(feature.id);
                    }
                    setSelectedFeatures(newSelected);
                  }}
                  onConfigChange={(config) => {
                    featureConfigs.set(feature.id, config);
                    setFeatureConfigs(new Map(featureConfigs));
                  }}
                />
              ))}
          </div>
        </div>
      ))}

      <div className="feature-summary">
        <h3>Selected Features ({selectedFeatures.size})</h3>
        <div className="selected-features-list">
          {Array.from(selectedFeatures).map(id => {
            const feature = availableFeatures.find(f => f.id === id);
            return (
              <div key={id} className="selected-feature-tag">
                {feature?.icon} {feature?.name}
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="generate-cv-button"
        onClick={() => {
          const configs = Array.from(selectedFeatures).map(id => ({
            featureId: id,
            config: featureConfigs.get(id) || {}
          }));
          onFeaturesSelected(configs);
        }}
      >
        Generate Interactive CV
      </button>
    </div>
  );
};
```

## Feature Builder Service

```typescript
// functions/src/services/featureBuilder.ts
export class FeatureBuilder {
  private features: Map<string, FeatureGenerator>;

  constructor() {
    this.features = new Map([
      ['ai-podcast', new PodcastGenerator()],
      ['video-intro', new VideoIntroGenerator()],
      ['interactive-timeline', new TimelineGenerator()],
      ['skills-viz', new SkillsVizGenerator()],
      ['portfolio-gallery', new PortfolioGenerator()],
      ['testimonials', new TestimonialsGenerator()],
      ['smart-contact', new ContactCardGenerator()],
      ['view-analytics', new AnalyticsGenerator()],
      ['qr-code', new QRCodeGenerator()],
      ['social-links', new SocialLinksGenerator()],
      ['meeting-scheduler', new MeetingSchedulerGenerator()],
      ['ai-chat', new AIChatGenerator()]
    ]);
  }

  async buildFeatures(
    selectedFeatures: FeatureConfig[],
    cvData: ParsedCV,
    jobId: string
  ): Promise<GeneratedFeatures> {
    const results = new Map<string, GeneratedFeature>();

    // Build features in parallel
    await Promise.all(
      selectedFeatures.map(async ({ featureId, config }) => {
        const generator = this.features.get(featureId);
        if (generator) {
          try {
            const result = await generator.generate(cvData, config, jobId);
            results.set(featureId, result);
          } catch (error) {
            console.error(`Failed to generate feature ${featureId}:`, error);
          }
        }
      })
    );

    return {
      features: results,
      embedCode: this.generateEmbedCode(results),
      requirements: this.getRequirements(results)
    };
  }

  private generateEmbedCode(features: Map<string, GeneratedFeature>): string {
    const scripts: string[] = [];
    const styles: string[] = [];
    const widgets: string[] = [];

    features.forEach((feature, id) => {
      if (feature.scripts) scripts.push(...feature.scripts);
      if (feature.styles) styles.push(...feature.styles);
      if (feature.widget) widgets.push(feature.widget);
    });

    return `
      <!-- Interactive CV Features -->
      ${styles.map(s => `<link rel="stylesheet" href="${s}">`).join('\n')}
      ${scripts.map(s => `<script src="${s}"></script>`).join('\n')}
      
      <div class="interactive-cv-features">
        ${widgets.join('\n')}
      </div>
    `;
  }

  private getRequirements(features: Map<string, GeneratedFeature>): Requirements {
    const requirements = {
      scripts: new Set<string>(),
      styles: new Set<string>(),
      apiKeys: new Set<string>()
    };

    features.forEach(feature => {
      if (feature.requirements) {
        feature.requirements.scripts?.forEach(s => requirements.scripts.add(s));
        feature.requirements.styles?.forEach(s => requirements.styles.add(s));
        feature.requirements.apiKeys?.forEach(k => requirements.apiKeys.add(k));
      }
    });

    return {
      scripts: Array.from(requirements.scripts),
      styles: Array.from(requirements.styles),
      apiKeys: Array.from(requirements.apiKeys)
    };
  }
}
```

## Podcast Feature Implementation (NotebookLLM)

```typescript
// functions/src/features/podcastGenerator.ts
import { NotebookLLMService } from '../services/notebookLLM';
import { ParsedCV } from '../types';

export class PodcastGenerator implements FeatureGenerator {
  private notebookLLM: NotebookLLMService;

  constructor() {
    this.notebookLLM = new NotebookLLMService();
  }

  async generate(
    cvData: ParsedCV,
    config: PodcastConfig,
    jobId: string
  ): Promise<GeneratedFeature> {
    // Create podcast script
    const script = await this.createPodcastScript(cvData, config);
    
    // Generate audio using NotebookLLM
    const audioUrl = await this.notebookLLM.generatePodcast({
      script,
      voice: config.voice,
      duration: config.duration,
      jobId
    });

    // Generate transcript
    const transcript = await this.notebookLLM.generateTranscript(audioUrl);

    // Create embed widget
    const widget = `
      <div class="cv-podcast-player" data-job-id="${jobId}">
        <div class="podcast-header">
          <span class="podcast-icon">🎙️</span>
          <h3>AI Career Summary</h3>
          <span class="duration">${config.duration}</span>
        </div>
        
        <audio controls class="podcast-audio">
          <source src="${audioUrl}" type="audio/mp3">
          Your browser does not support the audio element.
        </audio>
        
        <div class="podcast-controls">
          <button class="transcript-toggle">📝 Show Transcript</button>
          <button class="download-podcast">⬇️ Download</button>
        </div>
        
        <div class="podcast-transcript" style="display: none;">
          <h4>Transcript</h4>
          <p>${transcript}</p>
        </div>
      </div>
    `;

    return {
      id: 'ai-podcast',
      widget,
      scripts: ['/js/podcast-player.js'],
      styles: ['/css/podcast-player.css'],
      data: {
        audioUrl,
        transcript,
        duration: config.duration
      }
    };
  }

  private async createPodcastScript(
    cvData: ParsedCV,
    config: PodcastConfig
  ): Promise<string> {
    const sections = [];

    // Introduction
    sections.push(`
      Welcome to the career journey of ${cvData.personalInfo.name}, 
      ${this.summarizeProfession(cvData)}.
    `);

    // Experience highlights
    if (config.topics.includes('experience')) {
      sections.push(this.createExperienceNarrative(cvData.experience));
    }

    // Skills overview
    if (config.topics.includes('skills')) {
      sections.push(this.createSkillsNarrative(cvData.skills));
    }

    // Achievements
    if (config.topics.includes('achievements')) {
      sections.push(this.createAchievementsNarrative(cvData));
    }

    // Closing
    sections.push(`
      To learn more about ${cvData.personalInfo.name}'s professional journey,
      explore the interactive CV or reach out directly.
    `);

    return sections.join('\n\n');
  }

  private summarizeProfession(cvData: ParsedCV): string {
    const latestJob = cvData.experience[0];
    return `a ${latestJob.position} with expertise in ${cvData.skills.technical.slice(0, 3).join(', ')}`;
  }

  private createExperienceNarrative(experience: any[]): string {
    const narratives = experience.slice(0, 3).map(job => `
      At ${job.company}, ${job.position} role involved ${job.description}.
      Key achievements include ${job.achievements[0]}.
    `);
    
    return `Let's explore the professional journey:\n${narratives.join('\n')}`;
  }

  private createSkillsNarrative(skills: any): string {
    return `
      The technical expertise includes ${skills.technical.slice(0, 5).join(', ')},
      complemented by strong ${skills.soft.slice(0, 3).join(' and ')} skills.
      ${skills.languages.length > 0 ? `Fluent in ${skills.languages.join(', ')}.` : ''}
    `;
  }

  private createAchievementsNarrative(cvData: ParsedCV): string {
    const allAchievements = cvData.experience
      .flatMap(job => job.achievements)
      .slice(0, 5);
    
    return `Notable achievements include:\n${allAchievements.join('\n')}`;
  }
}
```

## Interactive Timeline Implementation

```typescript
// functions/src/features/timelineGenerator.ts
export class TimelineGenerator implements FeatureGenerator {
  async generate(
    cvData: ParsedCV,
    config: TimelineConfig,
    jobId: string
  ): Promise<GeneratedFeature> {
    const timelineData = this.createTimelineData(cvData);
    
    const widget = `
      <div class="cv-timeline" 
           data-style="${config.style}"
           data-animated="${config.animated}"
           data-job-id="${jobId}">
        <h3>Career Journey</h3>
        <div class="timeline-container">
          ${this.renderTimeline(timelineData, config)}
        </div>
      </div>
    `;

    return {
      id: 'interactive-timeline',
      widget,
      scripts: [
        'https://cdn.jsdelivr.net/npm/vis-timeline@latest/standalone/umd/vis-timeline-graph2d.min.js'
      ],
      styles: [
        'https://cdn.jsdelivr.net/npm/vis-timeline@latest/styles/vis-timeline-graph2d.min.css',
        '/css/timeline-custom.css'
      ],
      data: timelineData
    };
  }

  private createTimelineData(cvData: ParsedCV): TimelineItem[] {
    const items: TimelineItem[] = [];

    // Add education items
    cvData.education.forEach(edu => {
      items.push({
        id: `edu-${edu.institution}`,
        content: `${edu.degree} - ${edu.institution}`,
        start: new Date(edu.graduationDate),
        type: 'education',
        className: 'timeline-education'
      });
    });

    // Add experience items
    cvData.experience.forEach(job => {
      const [start, end] = this.parseDuration(job.duration);
      items.push({
        id: `job-${job.company}`,
        content: `${job.position} @ ${job.company}`,
        start: start,
        end: end || new Date(),
        type: 'experience',
        className: 'timeline-experience'
      });
    });

    // Add certifications
    cvData.certifications.forEach(cert => {
      items.push({
        id: `cert-${cert.name}`,
        content: cert.name,
        start: new Date(cert.date),
        type: 'certification',
        className: 'timeline-certification'
      });
    });

    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private parseDuration(duration: string): [Date, Date | null] {
    // Parse duration like "2020-2023" or "2020-Present"
    const parts = duration.split('-');
    const start = new Date(`${parts[0]}-01-01`);
    const end = parts[1].toLowerCase() === 'present' 
      ? null 
      : new Date(`${parts[1]}-12-31`);
    return [start, end];
  }

  private renderTimeline(items: TimelineItem[], config: TimelineConfig): string {
    // For initial render, create a simple HTML structure
    // The actual timeline will be initialized by JavaScript
    return `
      <div id="timeline-visualization"></div>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const container = document.getElementById('timeline-visualization');
          const items = new vis.DataSet(${JSON.stringify(items)});
          const options = {
            style: '${config.style}',
            showMajorLabels: true,
            showMinorLabels: true,
            zoomable: ${config.animated},
            moveable: ${config.animated},
            animation: ${config.animated}
          };
          const timeline = new vis.Timeline(container, items, options);
        });
      </script>
    `;
  }
}
```

## Skills Visualization Implementation

```typescript
// functions/src/features/skillsVizGenerator.ts
export class SkillsVizGenerator implements FeatureGenerator {
  async generate(
    cvData: ParsedCV,
    config: SkillsVizConfig,
    jobId: string
  ): Promise<GeneratedFeature> {
    const chartData = this.prepareChartData(cvData.skills, config);
    
    const widget = `
      <div class="cv-skills-viz" data-job-id="${jobId}">
        <h3>Skills Overview</h3>
        <div class="chart-container">
          <canvas id="skills-chart-${jobId}"></canvas>
        </div>
        <div class="skills-legend"></div>
      </div>
      
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const ctx = document.getElementById('skills-chart-${jobId}').getContext('2d');
          const chart = new Chart(ctx, {
            type: '${this.getChartType(config.chartType)}',
            data: ${JSON.stringify(chartData)},
            options: {
              responsive: true,
              animation: {
                duration: ${config.animated ? 2000 : 0}
              },
              plugins: {
                legend: {
                  display: ${config.showProficiency}
                }
              }
            }
          });
        });
      </script>
    `;

    return {
      id: 'skills-viz',
      widget,
      scripts: ['https://cdn.jsdelivr.net/npm/chart.js'],
      styles: ['/css/skills-viz.css'],
      data: chartData
    };
  }

  private prepareChartData(skills: any, config: SkillsVizConfig): ChartData {
    switch (config.chartType) {
      case 'radar':
        return this.prepareRadarData(skills);
      case 'bubble':
        return this.prepareBubbleData(skills);
      case 'wordcloud':
        return this.prepareWordCloudData(skills);
      default:
        return this.prepareTreeData(skills);
    }
  }

  private prepareRadarData(skills: any): ChartData {
    const allSkills = [
      ...skills.technical.map(s => ({ name: s, category: 'Technical', value: 90 })),
      ...skills.soft.map(s => ({ name: s, category: 'Soft', value: 85 })),
      ...skills.languages.map(s => ({ name: s, category: 'Language', value: 80 }))
    ];

    return {
      labels: allSkills.map(s => s.name),
      datasets: [{
        label: 'Skill Proficiency',
        data: allSkills.map(s => s.value),
        backgroundColor: 'rgba(30, 64, 175, 0.2)',
        borderColor: 'rgba(30, 64, 175, 1)',
        borderWidth: 2
      }]
    };
  }

  private getChartType(type: string): string {
    const mapping = {
      'radar': 'radar',
      'bubble': 'bubble',
      'tree': 'doughnut',
      'wordcloud': 'scatter'
    };
    return mapping[type] || 'radar';
  }
}
```

## Smart Contact Card Implementation

```typescript
// functions/src/features/contactCardGenerator.ts
export class ContactCardGenerator implements FeatureGenerator {
  async generate(
    cvData: ParsedCV,
    config: ContactCardConfig,
    jobId: string
  ): Promise<GeneratedFeature> {
    const vCardData = this.generateVCard(cvData.personalInfo);
    
    const widget = `
      <div class="cv-contact-card ${config.floating ? 'floating' : 'inline'}" 
           data-position="${config.position}"
           data-job-id="${jobId}">
        <button class="contact-trigger">
          <span class="icon">💬</span>
          <span class="text">Get in Touch</span>
        </button>
        
        <div class="contact-popup" style="display: none;">
          <h4>Contact ${cvData.personalInfo.name}</h4>
          
          <div class="contact-options">
            <a href="mailto:${cvData.personalInfo.email}" class="contact-option email">
              <span class="icon">✉️</span>
              <span>Send Email</span>
            </a>
            
            ${config.showCalendar ? `
              <button class="contact-option calendar" onclick="openCalendar('${jobId}')">
                <span class="icon">📅</span>
                <span>Schedule Meeting</span>
              </button>
            ` : ''}
            
            ${cvData.personalInfo.linkedin ? `
              <a href="${cvData.personalInfo.linkedin}" class="contact-option linkedin" target="_blank">
                <span class="icon">💼</span>
                <span>LinkedIn Profile</span>
              </a>
            ` : ''}
            
            <button class="contact-option vcard" onclick="downloadVCard('${jobId}')">
              <span class="icon">📇</span>
              <span>Save Contact</span>
            </button>
          </div>
          
          ${config.showDirectMessage ? `
            <div class="direct-message">
              <textarea placeholder="Send a quick message..."></textarea>
              <button onclick="sendMessage('${jobId}')">Send</button>
            </div>
          ` : ''}
        </div>
      </div>
      
      <script>
        // Store vCard data
        window.vCardData = window.vCardData || {};
        window.vCardData['${jobId}'] = \`${vCardData}\`;
      </script>
    `;

    return {
      id: 'smart-contact',
      widget,
      scripts: ['/js/contact-card.js'],
      styles: ['/css/contact-card.css'],
      data: {
        vCard: vCardData,
        email: cvData.personalInfo.email
      }
    };
  }

  private generateVCard(personalInfo: any): string {
    return `BEGIN:VCARD
VERSION:3.0
FN:${personalInfo.name}
EMAIL:${personalInfo.email}
TEL:${personalInfo.phone}
ADR:;;${personalInfo.location};;;
URL:${personalInfo.website || ''}
END:VCARD`;
  }
}
```

## Feature Integration in CV Template

```typescript
// functions/src/services/interactiveCVGenerator.ts
export class InteractiveCVGenerator {
  private templateEngine: TemplateEngine;
  private featureBuilder: FeatureBuilder;

  constructor() {
    this.templateEngine = new TemplateEngine();
    this.featureBuilder = new FeatureBuilder();
  }

  async generateInteractiveCV(
    template: CVTemplate,
    cvData: ParsedCV,
    selectedFeatures: FeatureConfig[],
    jobId: string
  ): Promise<InteractiveCV> {
    // Generate base CV HTML
    const baseHTML = this.templateEngine.generateHTML(template, cvData);

    // Build selected features
    const generatedFeatures = await this.featureBuilder.buildFeatures(
      selectedFeatures,
      cvData,
      jobId
    );

    // Inject features into CV
    const interactiveHTML = this.injectFeatures(
      baseHTML,
      generatedFeatures,
      template.config
    );

    // Create online version
    const onlineUrl = await this.deployOnlineVersion(interactiveHTML, jobId);

    return {
      html: interactiveHTML,
      features: generatedFeatures,
      onlineUrl,
      shareableLink: `https://getmycv.ai/cv/${jobId}`,
      embedCode: this.generateEmbedCode(jobId)
    };
  }

  private injectFeatures(
    baseHTML: string,
    features: GeneratedFeatures,
    templateConfig: TemplateConfig
  ): string {
    const $ = cheerio.load(baseHTML);

    // Add required scripts and styles to head
    const head = $('head');
    features.requirements.styles.forEach(style => {
      head.append(`<link rel="stylesheet" href="${style}">`);
    });
    features.requirements.scripts.forEach(script => {
      head.append(`<script src="${script}"></script>`);
    });

    // Add feature initialization script
    head.append(`
      <script>
        window.cvFeatures = ${JSON.stringify(Array.from(features.features.keys()))};
        window.cvJobId = '${jobId}';
      </script>
    `);

    // Inject feature widgets
    const container = $('.cv-container');
    
    // Add features based on their position preferences
    features.features.forEach((feature, id) => {
      const position = this.getFeaturePosition(id, templateConfig);
      
      if (position === 'floating') {
        $('body').append(feature.widget);
      } else {
        const section = container.find(position);
        if (section.length) {
          section.after(feature.widget);
        } else {
          container.append(feature.widget);
        }
      }
    });

    // Add interactive CV wrapper
    $('body').addClass('interactive-cv');
    
    return $.html();
  }

  private getFeaturePosition(featureId: string, templateConfig: TemplateConfig): string {
    const positionMap = {
      'ai-podcast': '.cv-header',
      'video-intro': '.cv-header',
      'interactive-timeline': '.experience',
      'skills-viz': '.skills',
      'portfolio-gallery': '.experience',
      'testimonials': '.certifications',
      'smart-contact': 'floating',
      'view-analytics': 'floating',
      'qr-code': '.cv-header',
      'social-links': '.contact-info',
      'meeting-scheduler': 'floating',
      'ai-chat': 'floating'
    };

    return positionMap[featureId] || '.cv-container';
  }

  private async deployOnlineVersion(html: string, jobId: string): Promise<string> {
    // Save to Firebase Hosting
    const bucket = admin.storage().bucket();
    const fileName = `online-cvs/${jobId}/index.html`;
    const file = bucket.file(fileName);

    await file.save(html, {
      metadata: {
        contentType: 'text/html',
        cacheControl: 'public, max-age=3600'
      }
    });

    // Return public URL
    return `https://getmycv.ai/cv/${jobId}`;
  }

  private generateEmbedCode(jobId: string): string {
    return `
      <!-- Embed Interactive CV -->
      <iframe 
        src="https://getmycv.ai/embed/${jobId}" 
        width="100%" 
        height="1200" 
        frameborder="0"
        allowfullscreen>
      </iframe>
    `;
  }
}
```

## Firebase Functions for Features

```typescript
// functions/src/functions/featureHandlers.ts
import * as functions from 'firebase-functions';

// Handle podcast generation
export const generatePodcast = functions
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onCall(async (data, context) => {
    const { jobId, config } = data;
    
    const podcastGenerator = new PodcastGenerator();
    const cvData = await getCVData(jobId);
    
    const podcast = await podcastGenerator.generate(cvData, config, jobId);
    
    // Save to Firestore
    await admin.firestore()
      .collection('features')
      .doc(`${jobId}-podcast`)
      .set({
        jobId,
        featureId: 'ai-podcast',
        data: podcast.data,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return podcast;
  });

// Handle meeting scheduling
export const scheduleMeeting = functions.https.onCall(async (data, context) => {
  const { jobId, meetingType, dateTime, email, message } = data;
  
  // Integrate with calendar provider
  const scheduler = new MeetingScheduler();
  const meetingLink = await scheduler.createMeeting({
    jobId,
    type: meetingType,
    dateTime,
    attendeeEmail: email,
    message
  });
  
  // Send notification
  await sendMeetingNotification(jobId, meetingLink, email);
  
  return { success: true, meetingLink };
});

// Handle AI chat queries
export const handleChatQuery = functions.https.onCall(async (data, context) => {
  const { jobId, query } = data;
  
  const cvData = await getCVData(jobId);
  const chatAssistant = new AIChatAssistant(cvData);
  
  const response = await chatAssistant.generateResponse(query);
  
  // Log interaction
  await logChatInteraction(jobId, query, response);
  
  return { response };
});
```

## Analytics Dashboard

```typescript
// components/AnalyticsDashboard.tsx
export const AnalyticsDashboard: React.FC<{ jobId: string }> = ({ jobId }) => {
  const [analytics, setAnalytics] = useState<CVAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [jobId]);

  const loadAnalytics = async () => {
    const data = await fetchAnalytics(jobId);
    setAnalytics(data);
  };

  return (
    <div className="analytics-dashboard">
      <h2>CV Performance Analytics</h2>
      
      <div className="metrics-grid">
        <MetricCard
          icon="👁️"
          title="Total Views"
          value={analytics?.totalViews || 0}
          change={analytics?.viewsChange}
        />
        
        <MetricCard
          icon="⬇️"
          title="Downloads"
          value={analytics?.totalDownloads || 0}
          change={analytics?.downloadsChange}
        />
        
        <MetricCard
          icon="🎙️"
          title="Podcast Plays"
          value={analytics?.podcastPlays || 0}
        />
        
        <MetricCard
          icon="💬"
          title="Interactions"
          value={analytics?.interactions || 0}
        />
      </div>
      
      <div className="charts">
        <ViewsChart data={analytics?.viewsOverTime} />
        <GeographicChart data={analytics?.viewsByLocation} />
        <DeviceChart data={analytics?.viewsByDevice} />
      </div>
      
      <div className="feature-usage">
        <h3>Feature Engagement</h3>
        {analytics?.featureUsage.map(feature => (
          <FeatureUsageBar
            key={feature.id}
            feature={feature}
            percentage={feature.usage}
          />
        ))}
      </div>
    </div>
  );
};
```

## Security and Privacy

```typescript
// functions/src/security/featureSecurity.ts
export class FeatureSecurity {
  static validateFeatureAccess(userId: string, featureId: string): boolean {
    // Check user permissions
    const userPlan = getUserPlan(userId);
    const featureRequirements = getFeatureRequirements(featureId);
    
    return userPlan.includes(featureRequirements.plan);
  }

  static sanitizeUserInput(input: any): any {
    // Sanitize all user inputs for features
    if (typeof input === 'string') {
      return DOMPurify.sanitize(input);
    }
    if (typeof input === 'object') {
      return Object.keys(input).reduce((acc, key) => {
        acc[key] = this.sanitizeUserInput(input[key]);
        return acc;
      }, {});
    }
    return input;
  }

  static enforceRateLimits(userId: string, feature: string): boolean {
    const limits = {
      'ai-podcast': { requests: 5, window: '1h' },
      'ai-chat': { requests: 100, window: '1h' },
      'meeting-scheduler': { requests: 20, window: '1d' }
    };
    
    return checkRateLimit(userId, feature, limits[feature]);
  }
}
```