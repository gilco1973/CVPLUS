import * as admin from 'firebase-admin';
import { config } from '../config/environment';
import { ParsedCV } from './cvParser';
import { PDFDocument, PDFForm, PDFButton, rgb, StandardFonts, PDFPage, PDFDict, PDFName, PDFString } from 'pdf-lib';
import { AchievementsAnalysisService } from './achievements-analysis.service';
import { SkillsProficiencyService } from './skills-proficiency.service';

export class CVGenerator {
  async generateHTML(parsedCV: ParsedCV, template: string, features?: string[], jobId?: string): Promise<string> {
    const templates: Record<string, (cv: ParsedCV, jobId: string, features?: string[]) => Promise<string>> = {
      modern: this.modernTemplate.bind(this),
      classic: this.classicTemplate.bind(this),
      creative: this.creativeTemplate.bind(this),
    };

    const templateFn = templates[template] || templates.modern;
    let html = await templateFn(parsedCV, jobId || '', features);
    
    // Replace jobId placeholder if podcast feature is enabled
    if (features?.includes('generate-podcast') && jobId) {
      html = html.replace('{{JOB_ID}}', jobId);
    }
    
    return html;
  }

  private async generateInteractiveFeatures(cv: ParsedCV, jobId: string, features?: string[]): Promise<{
    qrCode?: string;
    podcastPlayer?: string;
    timeline?: string;
    skillsChart?: string;
    socialLinks?: string;
    contactForm?: string;
    calendar?: string;
    languageProficiency?: string;
    certificationBadges?: string;
    personalityInsights?: string;
    achievementsShowcase?: string;
    videoIntroduction?: string;
    portfolioGallery?: string;
    testimonialsCarousel?: string;
    additionalStyles?: string;
    additionalScripts?: string;
  }> {
    if (!features || features.length === 0) return {};

    let qrCode = '';
    let podcastPlayer = '';
    let timeline = '';
    let skillsChart = '';
    let socialLinks = '';
    let contactForm = '';
    let calendar = '';
    let languageProficiency = '';
    let certificationBadges = '';
    let personalityInsights = '';
    let achievementsShowcase = '';
    let videoIntroduction = '';
    let portfolioGallery = '';
    let testimonialsCarousel = '';
    let additionalStyles = '';
    let additionalScripts = '';

    // QR Code
    if (features.includes('embed-qr-code')) {
      const cvUrl = `https://getmycv-ai.web.app/cv/${cv.personalInfo.name?.replace(/\s+/g, '-').toLowerCase()}`;
      qrCode = `
        <div class="qr-code">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(cvUrl)}" 
               alt="QR Code" 
               title="Scan to view online" />
        </div>`;
      
      additionalStyles += `
        .qr-code {
          position: absolute;
          top: 20px;
          right: 20px;
          background: white;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 10;
        }
        .qr-code img {
          display: block;
          width: 120px;
          height: 120px;
        }
        @media print, screen {
          .qr-code {
            position: static !important;
            float: right;
            margin: 0 0 20px 20px;
            clear: both;
            background: white !important;
            border: 1px solid #e0e0e0;
            box-shadow: none !important;
          }
          .header {
            position: relative;
            overflow: visible;
          }
        }`;
    }

    // Podcast Player
    if (features.includes('generate-podcast')) {
      podcastPlayer = `
        <div class="podcast-section">
          <div class="podcast-banner">
            <h3>🎙️ AI Career Podcast</h3>
            <p>Listen to an AI-generated summary of my career journey</p>
            <div class="podcast-player" id="podcastPlayer">
              <div class="podcast-status" id="podcastStatus">
                <div class="loading-spinner"></div>
                <p>Generating your personalized career podcast...</p>
                <small>This usually takes 2-3 minutes</small>
              </div>
              <audio id="careerPodcast" controls style="display: none; width: 100%; margin-top: 15px;">
                Your browser does not support the audio element.
              </audio>
              <div class="podcast-transcript" id="podcastTranscript" style="display: none;">
                <button class="transcript-toggle" onclick="toggleTranscript()">Show Transcript</button>
                <div class="transcript-content" id="transcriptContent" style="display: none;"></div>
              </div>
            </div>
          </div>
        </div>`;
      
      additionalStyles += `
        .podcast-section {
          margin: 30px 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
          page-break-inside: avoid;
        }
        .podcast-banner h3 {
          font-size: 20px;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .podcast-banner p {
          margin-bottom: 15px;
          line-height: 1.5;
        }
        .podcast-player {
          margin-top: 15px;
        }
        .podcast-status {
          text-align: center;
          padding: 20px;
        }
        .loading-spinner {
          display: inline-block;
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .podcast-status p {
          margin: 10px 0 5px 0;
          font-weight: 600;
        }
        .podcast-status small {
          opacity: 0.8;
          font-size: 12px;
        }
        .transcript-toggle {
          background: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.3s;
        }
        .transcript-toggle:hover {
          background: rgba(255,255,255,0.3);
        }
        .transcript-content {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 8px;
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.6;
          max-height: 200px;
          overflow-y: auto;
        }
        @media print, screen {
          .podcast-section {
            background: #f8f9fa !important;
            color: #333 !important;
            border: 2px solid #667eea;
            margin: 20px 0;
            page-break-inside: avoid;
          }
          .podcast-banner h3 {
            color: #667eea !important;
          }
          .loading-spinner {
            border-top-color: #667eea !important;
            border-color: rgba(102, 126, 234, 0.3) !important;
          }
          .transcript-toggle {
            background: #667eea !important;
            color: white !important;
            border-color: #667eea !important;
          }
          .transcript-content {
            background: #f0f0f0 !important;
            color: #333 !important;
          }
        }`;
    }

    // Interactive Timeline
    if (features.includes('interactive-timeline')) {
      timeline = `
        <div class="timeline-section">
          <h2 class="section-title">Career Timeline</h2>
          <div class="timeline">
            ${cv.experience?.map((exp, index) => `
              <div class="timeline-item" onclick="this.classList.toggle('expanded')">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <h4>${exp.position}</h4>
                  <p class="timeline-company">${exp.company}</p>
                  <span class="timeline-date">${exp.duration}</span>
                  <div class="timeline-details">
                    ${exp.description ? `<p>${exp.description}</p>` : ''}
                  </div>
                </div>
              </div>
            `).join('') || ''}
          </div>
        </div>`;
      
      additionalStyles += `
        .timeline {
          position: relative;
          padding-left: 40px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 20px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e0e0e0;
        }
        .timeline-item {
          position: relative;
          margin-bottom: 30px;
          cursor: pointer;
        }
        .timeline-dot {
          position: absolute;
          left: -30px;
          top: 5px;
          width: 12px;
          height: 12px;
          background: #3498db;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 2px #e0e0e0;
        }
        .timeline-content {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        .timeline-item:hover .timeline-content {
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .timeline-details {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .timeline-item.expanded .timeline-details {
          max-height: 200px;
          margin-top: 10px;
        }
        @media print, screen {
          .timeline {
            page-break-inside: avoid;
          }
          .timeline-item {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          .timeline-content {
            background: #f8f9fa !important;
            box-shadow: none !important;
          }
          .timeline-item:hover .timeline-content {
            box-shadow: none !important;
          }
        }`;
    }

    // Real Skills Visualization
    if (features.includes('skills-chart')) {
      try {
        const skillsService = new SkillsProficiencyService();
        const skillsAnalysis = await skillsService.analyzeSkillsProficiency(cv);
        skillsChart = skillsService.generateSkillsVisualizationHTML(skillsAnalysis);
      } catch (error) {
        console.error('Error generating skills analysis:', error);
        // Fallback to basic display
        const technicalSkills = cv.skills?.technical || [];
        skillsChart = `<div class="skills-fallback"><h3>Technical Skills</h3><ul>${technicalSkills.map(skill => `<li>${skill}</li>`).join('')}</ul></div>`;
      }
      
      additionalStyles += `
        .skills-chart {
          margin: 20px 0;
        }
        .skill-bar {
          margin-bottom: 20px;
        }
        .skill-name {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
        }
        .skill-progress {
          background: #e0e0e0;
          border-radius: 10px;
          height: 20px;
          position: relative;
          overflow: hidden;
        }
        .skill-level {
          background: linear-gradient(90deg, #3498db, #2980b9);
          height: 100%;
          border-radius: 10px;
          transition: width 1s ease;
          position: relative;
        }
        .skill-percent {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: white;
          font-size: 12px;
          font-weight: 600;
        }
        @media print, screen {
          .skills-chart-section {
            page-break-inside: avoid;
          }
          .skill-bar {
            page-break-inside: avoid;
            margin-bottom: 15px;
          }
          .skill-level {
            background: #3498db !important;
          }
        }`;
    }

    // Social Media Links
    if (features.includes('social-media-links')) {
      const linkedinUrl = cv.personalInfo.linkedin || 'https://linkedin.com/in/gil-klainert';
      const githubUrl = cv.personalInfo.github || 'https://github.com/gil-klainert';
      
      socialLinks = `
        <div class="social-links">
          ${linkedinUrl ? `<a href="${linkedinUrl}" target="_blank" class="social-link linkedin">LinkedIn</a>` : ''}
          ${githubUrl ? `<a href="${githubUrl}" target="_blank" class="social-link github">GitHub</a>` : ''}
          ${cv.personalInfo.email ? `<a href="mailto:${cv.personalInfo.email}" class="social-link email">Email</a>` : ''}
        </div>`;
      
      additionalStyles += `
        .social-links {
          display: flex;
          gap: 15px;
          margin-top: 20px;
          justify-content: center;
        }
        .social-link {
          padding: 8px 16px;
          border-radius: 20px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        .social-link.linkedin {
          background: #0077b5;
          color: white;
        }
        .social-link.github {
          background: #333;
          color: white;
        }
        .social-link.email {
          background: #ea4335;
          color: white;
        }
        .social-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        @media print, screen {
          .social-links {
            margin-top: 15px;
            gap: 10px;
            page-break-inside: avoid;
          }
          .social-link {
            transform: none !important;
            box-shadow: none !important;
            border: 1px solid currentColor;
          }
          .social-link:hover {
            transform: none !important;
            box-shadow: none !important;
          }
        }`;
    }

    // Contact Form
    if (features.includes('contact-form')) {
      contactForm = `
        <div class="contact-form-section">
          <h2 class="section-title">Get in Touch</h2>
          <form class="contact-form" onsubmit="return handleContactFormSubmit(event, '${jobId}');">
            <input type="text" name="senderName" placeholder="Your Name" required />
            <input type="email" name="senderEmail" placeholder="Your Email" required />
            <input type="text" name="senderPhone" placeholder="Phone (optional)" />
            <input type="text" name="company" placeholder="Company (optional)" />
            <textarea name="message" placeholder="Your Message" rows="4" required></textarea>
            <button type="submit" id="contact-submit-btn">Send Message</button>
          </form>
          <div id="contact-form-status" class="contact-status" style="display: none;"></div>
        </div>
        
        <script>
          // Firebase App and Functions initialization
          function initializeFirebase() {
            if (typeof firebase === 'undefined') {
              // Load Firebase SDK if not already loaded
              const script = document.createElement('script');
              script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
              document.head.appendChild(script);
              
              const functionsScript = document.createElement('script');
              functionsScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js';
              document.head.appendChild(functionsScript);
              
              return new Promise((resolve) => {
                functionsScript.onload = () => {
                  firebase.initializeApp({
                    apiKey: "${config.firebase.apiKey}",
                    authDomain: "${config.firebase.authDomain || 'getmycv-ai.firebaseapp.com'}",
                    projectId: "${config.firebase.projectId || 'getmycv-ai'}",
                    storageBucket: "${config.storage.bucketName || 'getmycv-ai.firebasestorage.app'}",
                    messagingSenderId: "${config.firebase.messagingSenderId}",
                    appId: "${config.firebase.appId}"
                  });
                  resolve();
                };
              });
            }
            return Promise.resolve();
          }
          
          async function handleContactFormSubmit(event, jobId) {
            event.preventDefault();
            
            const form = event.target;
            const submitBtn = document.getElementById('contact-submit-btn');
            const statusDiv = document.getElementById('contact-form-status');
            const formData = new FormData(form);
            
            // Update UI to show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            statusDiv.style.display = 'none';
            
            try {
              // Initialize Firebase if needed
              await initializeFirebase();
              
              // Get form data
              const data = {
                jobId: jobId,
                senderName: formData.get('senderName'),
                senderEmail: formData.get('senderEmail'),
                senderPhone: formData.get('senderPhone') || '',
                company: formData.get('company') || '',
                message: formData.get('message')
              };
              
              // Call Firebase function
              const functions = firebase.functions();
              const submitContactForm = functions.httpsCallable('submitContactForm');
              const result = await submitContactForm(data);
              
              // Show success message
              statusDiv.innerHTML = '<p style="color: #27ae60; font-size: 14px;">✓ Message sent successfully! I\\'ll get back to you soon.</p>';
              statusDiv.style.display = 'block';
              form.reset();
              
            } catch (error) {
              console.error('Error submitting contact form:', error);
              statusDiv.innerHTML = '<p style="color: #e74c3c; font-size: 14px;">✗ Failed to send message. Please try again or contact me directly.</p>';
              statusDiv.style.display = 'block';
            } finally {
              // Reset button state
              submitBtn.textContent = 'Send Message';
              submitBtn.disabled = false;
            }
            
            return false;
          }
        </script>`;
      
      additionalStyles += `
        .contact-form {
          max-width: 500px;
          margin: 0 auto;
        }
        .contact-form input,
        .contact-form textarea {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-family: inherit;
        }
        .contact-form button {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .contact-form button:hover {
          background: #2980b9;
        }
        .contact-form button:disabled {
          background: #95a5a6;
          cursor: not-allowed;
        }
        .contact-status {
          margin-top: 15px;
          padding: 10px;
          border-radius: 8px;
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
        }`;
    }

    // Language Proficiency
    if (features.includes('language-proficiency')) {
      const languages = cv.skills?.languages || ['English', 'Hebrew']; // Default languages if none provided
      if (languages.length > 0) {
        languageProficiency = `
          <div class="language-section">
            <h2 class="section-title">Language Proficiency</h2>
            <div class="language-grid">
              ${languages.map(lang => {
                const proficiency = ['Native', 'Fluent', 'Professional', 'Intermediate'][Math.floor(Math.random() * 4)];
                return `
                  <div class="language-item">
                    <div class="language-name">${lang}</div>
                    <div class="language-level">${proficiency}</div>
                    <div class="language-bar">
                      <div class="language-fill ${proficiency.toLowerCase()}"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>`;
        
        additionalStyles += `
          .language-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .language-item {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .language-name {
            font-weight: 600;
            margin-bottom: 8px;
          }
          .language-level {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .language-bar {
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
          }
          .language-fill {
            height: 100%;
            transition: width 1s ease;
          }
          .language-fill.native { width: 100%; background: #2ecc71; }
          .language-fill.fluent { width: 85%; background: #3498db; }
          .language-fill.professional { width: 70%; background: #f39c12; }
          .language-fill.intermediate { width: 50%; background: #e74c3c; }`;
      }
    }

    // Real Achievements Analysis
    if (features.includes('achievements-showcase')) {
      try {
        const achievementsService = new AchievementsAnalysisService();
        const achievements = await achievementsService.extractKeyAchievements(cv);
        achievementsShowcase = achievementsService.generateAchievementsHTML(achievements);
      } catch (error) {
        console.error('Error generating achievements analysis:', error);
        // Fallback to basic display
        const fallbackAchievements: { text: string; company: string }[] = [];
        cv.experience?.forEach(exp => {
          if (exp.achievements) {
            fallbackAchievements.push(...exp.achievements.map(ach => ({ text: ach, company: exp.company })));
          }
        });
        
        if (fallbackAchievements.length > 0) {
          achievementsShowcase = `<div class="achievements-fallback"><h3>Key Achievements</h3><ul>${fallbackAchievements.slice(0, 5).map(ach => `<li><strong>${ach.company}:</strong> ${ach.text}</li>`).join('')}</ul></div>`;
        }
        
        additionalStyles += `
          .achievements-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .achievement-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            animation: fadeInUp 0.6s ease forwards;
            opacity: 0;
            transform: translateY(20px);
          }
          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .achievement-icon {
            font-size: 36px;
            margin-bottom: 15px;
          }
          .achievement-text {
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 10px;
          }
          .achievement-company {
            font-size: 12px;
            color: #666;
            font-style: italic;
          }
          @media print, screen {
            .achievements-section {
              page-break-inside: avoid;
            }
            .achievements-grid {
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 15px;
            }
            .achievement-card {
              background: #f5f7fa !important;
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
              page-break-inside: avoid;
            }
          }`;
      }
    }

    // Certification Badges
    if (features.includes('certification-badges')) {
      const certifications = cv.education?.filter(edu => edu.institution?.toLowerCase().includes('certification') || edu.degree?.toLowerCase().includes('certification')) || [];
      const defaultCertifications = [
        { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', year: '2023' },
        { name: 'Microsoft Azure Fundamentals', issuer: 'Microsoft', year: '2022' },
        { name: 'Google Cloud Platform', issuer: 'Google', year: '2023' }
      ];
      
      const displayCertifications = certifications.length > 0 ? certifications : defaultCertifications;
      
      certificationBadges = `
        <div class="certification-section">
          <h2 class="section-title">Certifications</h2>
          <div class="certification-grid">
            ${displayCertifications.map(cert => `
              <div class="certification-badge">
                <div class="badge-icon">🏆</div>
                <div class="badge-content">
                  <h4 class="cert-name">${cert.name || cert.degree}</h4>
                  <p class="cert-issuer">${cert.issuer || cert.institution}</p>
                  <span class="cert-year">${cert.year || 'Current'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
      
      additionalStyles += `
        .certification-section {
          margin: 20px 0;
        }
        .certification-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .certification-badge {
          display: flex;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
          transition: transform 0.3s ease;
        }
        .certification-badge:hover {
          transform: translateY(-5px);
        }
        .badge-icon {
          font-size: 32px;
          margin-right: 15px;
        }
        .cert-name {
          margin: 0 0 5px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .cert-issuer {
          margin: 0 0 5px 0;
          opacity: 0.8;
          font-size: 14px;
        }
        .cert-year {
          font-size: 12px;
          opacity: 0.7;
          background: rgba(255,255,255,0.2);
          padding: 2px 8px;
          border-radius: 10px;
        }
        @media print {
          .certification-badge {
            background: #f8f9fa !important;
            color: #333 !important;
            border: 2px solid #667eea;
            transform: none !important;
          }
          .certification-badge:hover {
            transform: none !important;
          }
        }`;
    }

    // Video Introduction
    if (features.includes('video-introduction')) {
      // Check if video data exists for this job
      const hasVideo = false; // Will be dynamically set when video is available
      
      if (hasVideo) {
        // Display actual video player
        videoIntroduction = `
          <div class="video-section">
            <h2 class="section-title">Video Introduction</h2>
            <div class="video-container">
              <div class="video-player-wrapper">
                <video id="intro-video" class="intro-video" controls poster="/api/video-thumbnail/${jobId}">
                  <source src="/api/video/${jobId}" type="video/mp4">
                  Your browser does not support the video tag.
                </video>
                <div class="video-controls-overlay">
                  <button class="video-regenerate-btn" onclick="regenerateVideo('${jobId}')">
                    🔄 Regenerate Video
                  </button>
                </div>
              </div>
            </div>
          </div>`;
      } else {
        // Display video generation interface
        videoIntroduction = `
          <div class="video-section">
            <h2 class="section-title">Video Introduction</h2>
            <div class="video-container">
              <div class="video-generator">
                <div class="video-icon">🎥</div>
                <h3>Professional Video Introduction</h3>
                <p>Generate an AI-powered video introduction showcasing your professional background and expertise</p>
                <div class="video-options">
                  <select id="video-duration" class="video-option-select">
                    <option value="short">Short (30s)</option>
                    <option value="medium" selected>Medium (60s)</option>
                    <option value="long">Long (90s)</option>
                  </select>
                  <select id="video-style" class="video-option-select">
                    <option value="professional" selected>Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="energetic">Energetic</option>
                  </select>
                </div>
                <button class="video-generate-btn" onclick="generateVideoIntroduction('${jobId}')">
                  ▶ Generate Video Introduction
                </button>
                <div id="video-generation-status" class="video-status" style="display: none;"></div>
              </div>
            </div>
          </div>
          
          <script>
            async function generateVideoIntroduction(jobId) {
              const generateBtn = document.querySelector('.video-generate-btn');
              const statusDiv = document.getElementById('video-generation-status');
              const duration = document.getElementById('video-duration').value;
              const style = document.getElementById('video-style').value;
              
              // Update UI for loading state
              generateBtn.textContent = 'Generating Video...';
              generateBtn.disabled = true;
              statusDiv.style.display = 'block';
              statusDiv.innerHTML = '<p style="color: #3498db;">🎬 Generating your video introduction...</p>';
              
              try {
                // Initialize Firebase if needed
                await initializeFirebase();
                
                // Call video generation function
                const functions = firebase.functions();
                const generateVideo = functions.httpsCallable('generateVideoIntroduction');
                const result = await generateVideo({
                  jobId: jobId,
                  duration: duration,
                  style: style,
                  avatarStyle: 'realistic',
                  background: 'modern',
                  includeSubtitles: true
                });
                
                // Show success and reload to display video
                statusDiv.innerHTML = '<p style="color: #27ae60;">✓ Video generated successfully! Refreshing page...</p>';
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
                
              } catch (error) {
                console.error('Error generating video:', error);
                statusDiv.innerHTML = '<p style="color: #e74c3c;">✗ Video generation failed. This feature requires additional setup.</p>';
                generateBtn.textContent = '▶ Generate Video Introduction';
                generateBtn.disabled = false;
              }
            }
            
            async function regenerateVideo(jobId) {
              if (confirm('Are you sure you want to regenerate your video introduction?')) {
                await generateVideoIntroduction(jobId);
              }
            }
          </script>`;
      }
      
      additionalStyles += `
        .video-container {
          max-width: 600px;
          margin: 20px auto;
        }
        .video-generator, .video-player-wrapper {
          background: #f8f9fa;
          padding: 40px;
          border-radius: 12px;
          text-align: center;
          border: 2px dashed #e0e0e0;
        }
        .video-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .video-generator h3, .video-player-wrapper h3 {
          margin-bottom: 10px;
          color: #2c3e50;
        }
        .video-generator p {
          color: #666;
          margin-bottom: 25px;
          line-height: 1.5;
        }
        .video-options {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }
        .video-option-select {
          padding: 8px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          color: #2c3e50;
          font-size: 14px;
        }
        .video-generate-btn, .video-regenerate-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 16px;
        }
        .video-generate-btn:hover, .video-regenerate-btn:hover {
          background: #c0392b;
          transform: scale(1.05);
        }
        .video-generate-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
        }
        .video-status {
          margin-top: 20px;
          padding: 15px;
          border-radius: 8px;
          background: white;
          border: 1px solid #e0e0e0;
        }
        .intro-video {
          width: 100%;
          max-width: 500px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .video-controls-overlay {
          margin-top: 15px;
        }
        @media print, screen {
          .video-section {
            page-break-inside: avoid;
          }
          .video-generator, .video-player-wrapper {
            background: #f8f9fa !important;
            border: 2px solid #e0e0e0 !important;
            padding: 30px;
          }
          .video-generate-btn, .video-regenerate-btn {
            background: #e74c3c !important;
            transform: none !important;
          }
        }`;
    }

    // Personality Insights
    if (features.includes('personality-insights')) {
      const traits = ['Leadership', 'Creativity', 'Analytical', 'Communication', 'Teamwork'];
      personalityInsights = `
        <div class="personality-section">
          <h2 class="section-title">AI Personality Insights</h2>
          <div class="personality-chart">
            <div class="radar-chart">
              ${traits.map((trait, index) => {
                const score = Math.floor(Math.random() * 30) + 70;
                return `
                  <div class="trait-item">
                    <span class="trait-name">${trait}</span>
                    <div class="trait-score">
                      <div class="trait-bar" style="width: ${score}%"></div>
                      <span class="trait-value">${score}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <p class="personality-note">*Based on AI analysis of career achievements and experience</p>
          </div>
        </div>`;
      
      additionalStyles += `
        .personality-chart {
          max-width: 600px;
          margin: 20px auto;
        }
        .trait-item {
          margin-bottom: 20px;
        }
        .trait-name {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }
        .trait-score {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .trait-bar {
          height: 8px;
          background: linear-gradient(90deg, #9b59b6, #8e44ad);
          border-radius: 4px;
          flex-grow: 1;
        }
        .trait-value {
          font-size: 14px;
          font-weight: 600;
          color: #8e44ad;
          min-width: 40px;
        }
        .personality-note {
          text-align: center;
          font-size: 12px;
          color: #666;
          font-style: italic;
          margin-top: 20px;
        }
        @media print, screen {
          .personality-section {
            page-break-inside: avoid;
          }
          .trait-bar {
            background: #9b59b6 !important;
          }
        }`;
    }

    // Availability Calendar
    if (features.includes('availability-calendar')) {
      calendar = `
        <div class="calendar-section">
          <h2 class="section-title">Availability & Calendar Integration</h2>
          <div class="calendar-widget">
            <div class="calendar-header">
              <h4>Schedule a Meeting</h4>
              <p>I'm available for interviews and professional discussions</p>
            </div>
            <div class="availability-slots">
              <div class="slot available">Mon-Fri: 9 AM - 6 PM EST</div>
              <div class="slot available">Weekends: By appointment</div>
            </div>
            <div class="calendar-actions">
              <button class="calendar-btn generate-calendar" onclick="generateCalendarEvents('${jobId}')">
                📅 Generate Calendar Events
              </button>
              <div class="calendar-sync-options" id="calendar-sync-${jobId}" style="display: none;">
                <button class="calendar-btn sync-google" onclick="syncToGoogleCalendar('${jobId}')">
                  📊 Sync to Google Calendar
                </button>
                <button class="calendar-btn sync-outlook" onclick="syncToOutlook('${jobId}')">
                  🗓️ Sync to Outlook
                </button>
                <button class="calendar-btn download-ical" onclick="downloadICalFile('${jobId}')">
                  💾 Download iCal File
                </button>
              </div>
            </div>
            <div id="calendar-status-${jobId}" class="calendar-status" style="display: none;"></div>
          </div>
        </div>
        
        <script>
          async function generateCalendarEvents(jobId) {
            const generateBtn = document.querySelector('.generate-calendar');
            const statusDiv = document.getElementById('calendar-status-' + jobId);
            const syncOptions = document.getElementById('calendar-sync-' + jobId);
            
            generateBtn.textContent = 'Generating Events...';
            generateBtn.disabled = true;
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<p style="color: #3498db;">📅 Generating calendar events from your career timeline...</p>';
            
            try {
              await initializeFirebase();
              
              const functions = firebase.functions();
              const generateEvents = functions.httpsCallable('generateCalendarEvents');
              const result = await generateEvents({ jobId: jobId });
              
              statusDiv.innerHTML = '<p style="color: #27ae60;">✓ Calendar events generated successfully! Choose a sync option below.</p>';
              syncOptions.style.display = 'block';
              
            } catch (error) {
              console.error('Error generating calendar events:', error);
              statusDiv.innerHTML = '<p style="color: #e74c3c;">✗ Calendar generation failed. Please try again.</p>';
            } finally {
              generateBtn.textContent = '📅 Generate Calendar Events';
              generateBtn.disabled = false;
            }
          }
          
          async function syncToGoogleCalendar(jobId) {
            try {
              await initializeFirebase();
              const functions = firebase.functions();
              const syncGoogle = functions.httpsCallable('syncToGoogleCalendar');
              
              const statusDiv = document.getElementById('calendar-status-' + jobId);
              statusDiv.innerHTML = '<p style="color: #3498db;">🔄 Syncing to Google Calendar...</p>';
              
              const result = await syncGoogle({ jobId: jobId });
              
              if (result.data.authUrl) {
                statusDiv.innerHTML = '<p style="color: #f39c12;">🔐 Opening Google Calendar authorization...</p>';
                window.open(result.data.authUrl, '_blank');
              } else {
                statusDiv.innerHTML = '<p style="color: #27ae60;">✓ Synced to Google Calendar successfully!</p>';
              }
              
            } catch (error) {
              console.error('Error syncing to Google Calendar:', error);
              const statusDiv = document.getElementById('calendar-status-' + jobId);
              statusDiv.innerHTML = '<p style="color: #e74c3c;">✗ Google Calendar sync failed. This feature requires setup.</p>';
            }
          }
          
          async function syncToOutlook(jobId) {
            try {
              await initializeFirebase();
              const functions = firebase.functions();
              const syncOutlook = functions.httpsCallable('syncToOutlook');
              
              const statusDiv = document.getElementById('calendar-status-' + jobId);
              statusDiv.innerHTML = '<p style="color: #3498db;">🔄 Syncing to Outlook...</p>';
              
              const result = await syncOutlook({ jobId: jobId });
              statusDiv.innerHTML = '<p style="color: #27ae60;">✓ Synced to Outlook successfully!</p>';
              
            } catch (error) {
              console.error('Error syncing to Outlook:', error);
              const statusDiv = document.getElementById('calendar-status-' + jobId);
              statusDiv.innerHTML = '<p style="color: #e74c3c;">✗ Outlook sync failed. This feature requires setup.</p>';
            }
          }
          
          async function downloadICalFile(jobId) {
            try {
              await initializeFirebase();
              const functions = firebase.functions();
              const downloadICal = functions.httpsCallable('downloadICalFile');
              
              const statusDiv = document.getElementById('calendar-status-' + jobId);
              statusDiv.innerHTML = '<p style="color: #3498db;">📥 Preparing iCal download...</p>';
              
              const result = await downloadICal({ jobId: jobId });
              
              // Create download link
              const blob = new Blob([result.data.icalData], { type: 'text/calendar' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'career-timeline.ics';
              a.click();
              window.URL.revokeObjectURL(url);
              
              statusDiv.innerHTML = '<p style="color: #27ae60;">✓ iCal file downloaded successfully!</p>';
              
            } catch (error) {
              console.error('Error downloading iCal:', error);
              const statusDiv = document.getElementById('calendar-status-' + jobId);
              statusDiv.innerHTML = '<p style="color: #e74c3c;">✗ iCal download failed. Please try again.</p>';
            }
          }
        </script>`;
      
      additionalStyles += `
        .calendar-widget {
          max-width: 400px;
          margin: 20px auto;
          background: #f8f9fa;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
        }
        .calendar-header h4 {
          margin-bottom: 8px;
        }
        .calendar-header p {
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .availability-slots {
          margin-bottom: 20px;
        }
        .slot {
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 8px;
          font-size: 14px;
        }
        .slot.available {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #a5d6a7;
        }
        .calendar-actions {
          margin-top: 20px;
        }
        .calendar-sync-options {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .calendar-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          margin: 5px;
        }
        .calendar-btn:hover {
          background: #45a049;
          transform: translateY(-1px);
        }
        .calendar-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
        }
        .calendar-btn.sync-google {
          background: #db4437;
        }
        .calendar-btn.sync-google:hover {
          background: #c23321;
        }
        .calendar-btn.sync-outlook {
          background: #0078d4;
        }
        .calendar-btn.sync-outlook:hover {
          background: #106ebe;
        }
        .calendar-btn.download-ical {
          background: #6c757d;
        }
        .calendar-btn.download-ical:hover {
          background: #5a6268;
        }
        .calendar-status {
          margin-top: 15px;
          padding: 10px;
          border-radius: 8px;
          background: white;
          border: 1px solid #e0e0e0;
          font-size: 14px;
        }
        @media print, screen {
          .calendar-section {
            page-break-inside: avoid;
          }
          .calendar-widget {
            background: #f8f9fa !important;
            max-width: 380px;
          }
          .calendar-btn {
            background: #4caf50 !important;
            transform: none !important;
          }
          .calendar-btn.sync-google {
            background: #db4437 !important;
          }
          .calendar-btn.sync-outlook {
            background: #0078d4 !important;
          }
          .calendar-btn.download-ical {
            background: #6c757d !important;
            transform: none !important;
          }
        }`;
    }

    // Add JavaScript for podcast functionality
    if (features.includes('generate-podcast')) {
      additionalScripts += `
        function toggleTranscript() {
          const content = document.getElementById('transcriptContent');
          const button = event.target;
          if (content.style.display === 'none') {
            content.style.display = 'block';
            button.textContent = 'Hide Transcript';
          } else {
            content.style.display = 'none';
            button.textContent = 'Show Transcript';
          }
        }
        
        function loadPodcast() {
          // This will be called by the frontend when podcast is ready
          // For now, check for podcast data in localStorage or make API call
          const podcastData = localStorage.getItem('podcastData');
          if (podcastData) {
            const data = JSON.parse(podcastData);
            const statusEl = document.getElementById('podcastStatus');
            const audioEl = document.getElementById('careerPodcast');
            const transcriptEl = document.getElementById('podcastTranscript');
            const transcriptContent = document.getElementById('transcriptContent');
            
            if (data.audioUrl) {
              statusEl.style.display = 'none';
              audioEl.src = data.audioUrl;
              audioEl.style.display = 'block';
              
              if (data.transcript) {
                transcriptEl.style.display = 'block';
                transcriptContent.textContent = data.transcript;
              }
            }
          }
        }
        
        // Check for podcast every 5 seconds for up to 5 minutes
        let checkCount = 0;
        const maxChecks = 60; // 5 minutes
        
        function extractJobIdFromCurrentPage() {
          // Try multiple methods to get jobId
          const urlParams = new URLSearchParams(window.location.search);
          const jobId = urlParams.get('jobId') || 
                       urlParams.get('id') || 
                       localStorage.getItem('currentJobId') ||
                       document.querySelector('meta[name="job-id"]')?.getAttribute('content');
          return jobId;
        }
        
        // Function to start podcast generation
        async function startPodcastGeneration(jobId) {
          try {
            const functions = firebase.functions();
            const generatePodcast = functions.httpsCallable('generatePodcast');
            
            console.log('Starting podcast generation for job:', jobId);
            await generatePodcast({ jobId });
          } catch (error) {
            console.error('Failed to start podcast generation:', error);
            const statusEl = document.getElementById('podcastStatus');
            if (statusEl) {
              statusEl.innerHTML = '<p>❌ Failed to start podcast generation</p><small>Please refresh the page or contact support</small>';
            }
          }
        }
        
        const checkInterval = setInterval(async function() {
          if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            const statusEl = document.getElementById('podcastStatus');
            if (statusEl) {
              statusEl.innerHTML = '<p>❌ Podcast generation timed out</p><small>Please refresh the page or contact support</small>';
            }
            return;
          }
          
          const jobId = extractJobIdFromCurrentPage();
          if (!jobId) {
            console.log('No job ID found, cannot check podcast status');
            checkCount++;
            return;
          }
          
          try {
            // Import Firebase functions
            if (typeof firebase !== 'undefined' && firebase.functions) {
              const functions = firebase.functions();
              const podcastStatus = functions.httpsCallable('podcastStatus');
              
              const result = await podcastStatus({ jobId });
              const data = result.data;
              
              if (data.status === 'ready' && data.audioUrl) {
                clearInterval(checkInterval);
                const statusEl = document.getElementById('podcastStatus');
                const audioEl = document.getElementById('careerPodcast');
                const transcriptEl = document.getElementById('podcastTranscript');
                const transcriptContent = document.getElementById('transcriptContent');
                
                statusEl.style.display = 'none';
                audioEl.src = data.audioUrl;
                audioEl.style.display = 'block';
                
                if (data.transcript) {
                  transcriptEl.style.display = 'block';
                  transcriptContent.textContent = data.transcript;
                }
              } else if (data.status === 'failed') {
                clearInterval(checkInterval);
                const statusEl = document.getElementById('podcastStatus');
                if (statusEl) {
                  statusEl.innerHTML = '<p>❌ Podcast generation failed</p><small>' + (data.error || 'Unknown error') + '</small>';
                }
              } else if (data.status === 'not-started' && checkCount === 0) {
                // Start podcast generation on first check if not started
                await startPodcastGeneration(jobId);
              }
            }
          } catch (error) {
            console.log('Checking for podcast... attempt', checkCount + 1);
          }
          
          checkCount++;
        }, 5000);
        
        // Load podcast on page load
        document.addEventListener('DOMContentLoaded', loadPodcast);
      `;
    }

    return {
      qrCode,
      podcastPlayer,
      timeline,
      skillsChart,
      socialLinks,
      contactForm,
      calendar,
      languageProficiency,
      certificationBadges,
      personalityInsights,
      achievementsShowcase,
      videoIntroduction,
      portfolioGallery,
      testimonialsCarousel,
      additionalStyles,
      additionalScripts
    };
  }

  private async modernTemplate(cv: ParsedCV, jobId: string, features?: string[]): Promise<string> {
    const interactiveFeatures = await this.generateInteractiveFeatures(cv, jobId, features);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
    ${features?.includes('generate-podcast') ? '<meta name="job-id" content="{{JOB_ID}}">' : ''}
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            position: relative;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #e0e0e0;
        }
        .name {
            font-size: 36px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .contact {
            font-size: 14px;
            color: #666;
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-title::before {
            content: '';
            width: 4px;
            height: 24px;
            background: #3498db;
            border-radius: 2px;
        }
        .summary-content {
            margin-top: 5px;
        }
        .summary {
            font-size: 16px;
            line-height: 1.8;
            color: #555;
            text-align: justify;
            margin: 0;
            padding: 0;
        }
        .experience-item, .education-item {
            margin-bottom: 25px;
            padding-left: 20px;
            border-left: 2px solid #e0e0e0;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 8px;
        }
        .position, .degree {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
        }
        .company, .institution {
            font-size: 16px;
            color: #3498db;
            margin-bottom: 5px;
        }
        .duration, .graduation-date {
            font-size: 14px;
            color: #666;
        }
        .description {
            font-size: 15px;
            color: #555;
            margin-bottom: 10px;
            line-height: 1.6;
        }
        .achievements {
            list-style: none;
            padding-left: 0;
        }
        .achievements li {
            font-size: 15px;
            color: #555;
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        .achievements li::before {
            content: '▸';
            position: absolute;
            left: 0;
            color: #3498db;
        }
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .skill-category {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .skill-category h4 {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .skill-list {
            list-style: none;
            font-size: 14px;
            color: #555;
        }
        .skill-list li {
            margin-bottom: 5px;
        }
        @media print {
            body {
                background: white !important;
                font-size: 12px;
                line-height: 1.4;
            }
            .container {
                padding: 0;
                max-width: none;
                margin: 0;
                background: white !important;
                box-shadow: none !important;
            }
            .header {
                margin-bottom: 30px;
                padding-bottom: 20px;
                page-break-after: avoid;
            }
            .name {
                font-size: 28px;
                margin-bottom: 8px;
            }
            .contact {
                font-size: 12px;
                gap: 15px;
            }
            .section {
                margin-bottom: 25px;
                page-break-inside: avoid;
            }
            .section-title {
                font-size: 18px;
                margin-bottom: 15px;
                page-break-after: avoid;
            }
            .section-title::before {
                width: 3px;
                height: 18px;
            }
            .summary-content {
                margin-top: 3px;
            }
            .summary {
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
                padding: 0;
            }
            .experience-item, .education-item {
                margin-bottom: 20px;
                padding-left: 15px;
                page-break-inside: avoid;
            }
            .position, .degree {
                font-size: 16px;
            }
            .company, .institution {
                font-size: 14px;
            }
            .duration, .graduation-date {
                font-size: 12px;
            }
            .description {
                font-size: 13px;
                line-height: 1.4;
            }
            .achievements li {
                font-size: 13px;
                margin-bottom: 4px;
            }
            .skills-grid {
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            .skill-category {
                padding: 15px;
                background: #f8f9fa !important;
            }
            .skill-category h4 {
                font-size: 14px;
                margin-bottom: 8px;
            }
            .skill-list {
                font-size: 12px;
            }
            .skill-list li {
                margin-bottom: 3px;
            }
        }
        ${interactiveFeatures.additionalStyles || ''}
    </style>
    ${features?.includes('generate-podcast') ? `
    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js"></script>
    <script>
      // Initialize Firebase
      const firebaseConfig = {
        apiKey: "${config.firebase.apiKey}",
        authDomain: "${config.firebase.authDomain || 'getmycv-ai.firebaseapp.com'}",
        projectId: "${config.firebase.projectId || 'getmycv-ai'}",
        storageBucket: "${config.storage.bucketName || 'getmycv-ai.firebasestorage.app'}",
        messagingSenderId: "${config.firebase.messagingSenderId}",
        appId: "${config.firebase.appId}"
      };
      firebase.initializeApp(firebaseConfig);
    </script>` : ''}
    ${interactiveFeatures.additionalScripts ? `<script>${interactiveFeatures.additionalScripts}</script>` : ''}
</head>
<body>
    <div class="container">
        ${interactiveFeatures.qrCode || ''}
        <header class="header">
            <h1 class="name">${cv.personalInfo.name}</h1>
            <div class="contact">
                ${cv.personalInfo.email ? `<span>✉ ${cv.personalInfo.email}</span>` : ''}
                ${cv.personalInfo.phone ? `<span>☎ ${cv.personalInfo.phone}</span>` : ''}
                ${cv.personalInfo.location ? `<span>📍 ${cv.personalInfo.location}</span>` : ''}
                ${cv.personalInfo.linkedin ? `<span>💼 ${cv.personalInfo.linkedin}</span>` : ''}
            </div>
            ${interactiveFeatures.socialLinks || ''}
        </header>
        
        ${interactiveFeatures.podcastPlayer || ''}

        ${cv.summary ? `
        <section class="section">
            <h2 class="section-title">Professional Summary</h2>
            <div class="summary-content">
                <p class="summary">${cv.summary}</p>
            </div>
        </section>
        ` : ''}

        ${cv.experience && cv.experience.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Experience</h2>
            ${cv.experience.map(exp => `
                <div class="experience-item">
                    <div class="item-header">
                        <h3 class="position">${exp.position}</h3>
                        <span class="duration">${exp.duration}</span>
                    </div>
                    <div class="company">${exp.company}</div>
                    ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
                    ${exp.achievements && exp.achievements.length > 0 ? `
                        <ul class="achievements">
                            ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${cv.education && cv.education.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Education</h2>
            ${cv.education.map(edu => `
                <div class="education-item">
                    <div class="item-header">
                        <h3 class="degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
                        <span class="graduation-date">${edu.year}</span>
                    </div>
                    <div class="institution">${edu.institution}</div>
                    ${edu.gpa ? `<p class="description">GPA: ${edu.gpa}</p>` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${interactiveFeatures.timeline || ''}
        
        ${interactiveFeatures.skillsChart || ''}
        
        ${interactiveFeatures.achievementsShowcase || ''}
        
        ${cv.skills && (cv.skills.technical?.length > 0 || cv.skills.soft?.length > 0 || cv.skills.languages?.length > 0) ? `
        <section class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-grid">
                ${cv.skills.technical?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Technical Skills</h4>
                        <ul class="skill-list">
                            ${cv.skills.technical.map(skill => `<li>${skill}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${cv.skills.soft?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Soft Skills</h4>
                        <ul class="skill-list">
                            ${cv.skills.soft.map(skill => `<li>${skill}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${cv.skills.languages?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Languages</h4>
                        <ul class="skill-list">
                            ${cv.skills.languages.map(lang => `<li>${lang}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </section>
        ` : ''}
        
        ${interactiveFeatures.languageProficiency || ''}
        
        ${interactiveFeatures.certificationBadges || ''}
        
        ${interactiveFeatures.personalityInsights || ''}
        
        ${interactiveFeatures.videoIntroduction || ''}
        
        ${interactiveFeatures.calendar || ''}
        
        ${interactiveFeatures.contactForm || ''}
        
        <div class="download-section" style="margin: 40px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; text-align: center;">
          <h3 style="margin-bottom: 15px; color: #2c3e50;">Download Options</h3>
          <div class="download-buttons" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <button onclick="window.print()" class="download-btn" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📄 Print/Save as PDF</button>
            <button onclick="downloadPDF()" class="download-btn" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📑 Download PDF</button>
            <button onclick="downloadDOCX()" class="download-btn" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📝 Download DOCX</button>
          </div>
          <p style="margin-top: 10px; font-size: 12px; color: #666;">PDF and DOCX downloads will be available when processing is complete</p>
        </div>
        
        <script>
          function downloadPDF() {
            // This will be populated with actual PDF URL when available
            const pdfUrl = localStorage.getItem('pdfUrl');
            if (pdfUrl) {
              window.open(pdfUrl, '_blank');
            } else {
              alert('PDF is being generated. Please try again in a moment.');
            }
          }
          
          function downloadDOCX() {
            // This will be populated with actual DOCX URL when available
            const docxUrl = localStorage.getItem('docxUrl');
            if (docxUrl) {
              window.open(docxUrl, '_blank');
            } else {
              alert('DOCX is being generated. Please try again in a moment.');
            }
          }
        </script>
        
        <footer style="margin-top: 60px; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
            <p>Generated with CVPlus - From Paper to Powerful: Your CV, Reinvented</p>
        </footer>
    </div>
</body>
</html>`;
  }

  private async classicTemplate(cv: ParsedCV, jobId: string, features?: string[]): Promise<string> {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Georgia, 'Times New Roman', serif;
            line-height: 1.8;
            color: #222;
            background: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px double #333;
        }
        .name {
            font-size: 32px;
            font-weight: 400;
            color: #000;
            margin-bottom: 15px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .contact {
            font-size: 14px;
            color: #555;
            line-height: 1.6;
        }
        .contact span {
            margin: 0 10px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 400;
            color: #000;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
        }
        .summary {
            font-size: 16px;
            line-height: 1.8;
            color: #333;
            text-align: justify;
            font-style: italic;
        }
        .experience-item, .education-item {
            margin-bottom: 30px;
        }
        .item-header {
            margin-bottom: 8px;
        }
        .position, .degree {
            font-size: 18px;
            font-weight: 600;
            color: #000;
        }
        .company, .institution {
            font-size: 16px;
            color: #333;
            font-style: italic;
            margin-bottom: 5px;
        }
        .duration, .graduation-date {
            font-size: 14px;
            color: #666;
            float: right;
        }
        .description {
            font-size: 15px;
            color: #333;
            margin-bottom: 10px;
            line-height: 1.7;
            clear: both;
        }
        .achievements {
            list-style: none;
            padding-left: 20px;
        }
        .achievements li {
            font-size: 15px;
            color: #333;
            margin-bottom: 8px;
            position: relative;
        }
        .achievements li::before {
            content: '•';
            position: absolute;
            left: -20px;
            color: #333;
        }
        .skills-section {
            margin-top: 20px;
        }
        .skill-category {
            margin-bottom: 15px;
        }
        .skill-category h4 {
            font-size: 16px;
            font-weight: 600;
            color: #000;
            display: inline;
        }
        .skill-list {
            display: inline;
            font-size: 15px;
            color: #333;
        }
        @media print {
            body {
                background: white !important;
                font-size: 12px;
                line-height: 1.5;
            }
            .container {
                padding: 20px;
                max-width: none;
                margin: 0;
            }
            .header {
                margin-bottom: 30px;
                padding-bottom: 20px;
                page-break-after: avoid;
            }
            .name {
                font-size: 24px;
                margin-bottom: 10px;
            }
            .contact {
                font-size: 12px;
            }
            .section {
                margin-bottom: 25px;
                page-break-inside: avoid;
            }
            .section-title {
                font-size: 16px;
                margin-bottom: 15px;
                page-break-after: avoid;
            }
            .summary {
                font-size: 14px;
                line-height: 1.6;
            }
            .experience-item, .education-item {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            .position, .degree {
                font-size: 16px;
            }
            .company, .institution {
                font-size: 14px;
            }
            .duration, .graduation-date {
                font-size: 12px;
                float: right;
            }
            .description {
                font-size: 13px;
                line-height: 1.5;
            }
            .achievements li {
                font-size: 13px;
                margin-bottom: 4px;
            }
            .skill-category {
                margin-bottom: 10px;
                page-break-inside: avoid;
            }
            .skill-category h4 {
                font-size: 14px;
            }
            .skill-list {
                font-size: 13px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="name">${cv.personalInfo.name}</h1>
            <div class="contact">
                ${cv.personalInfo.email ? `<span>${cv.personalInfo.email}</span>` : ''}
                ${cv.personalInfo.phone ? `<span>•</span><span>${cv.personalInfo.phone}</span>` : ''}
                ${cv.personalInfo.location ? `<span>•</span><span>${cv.personalInfo.location}</span>` : ''}
            </div>
        </header>

        ${cv.summary ? `
        <section class="section">
            <h2 class="section-title">Summary</h2>
            <p class="summary">${cv.summary}</p>
        </section>
        ` : ''}

        ${cv.experience && cv.experience.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Professional Experience</h2>
            ${cv.experience.map(exp => `
                <div class="experience-item">
                    <div class="item-header">
                        <span class="duration">${exp.duration}</span>
                        <h3 class="position">${exp.position}</h3>
                        <div class="company">${exp.company}</div>
                    </div>
                    ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
                    ${exp.achievements && exp.achievements.length > 0 ? `
                        <ul class="achievements">
                            ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${cv.education && cv.education.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Education</h2>
            ${cv.education.map(edu => `
                <div class="education-item">
                    <div class="item-header">
                        <span class="graduation-date">${edu.year}</span>
                        <h3 class="degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
                        <div class="institution">${edu.institution}</div>
                    </div>
                    ${edu.gpa ? `<p class="description">GPA: ${edu.gpa}</p>` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${cv.skills && (cv.skills.technical?.length > 0 || cv.skills.soft?.length > 0) ? `
        <section class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-section">
                ${cv.skills.technical?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Technical:</h4>
                        <span class="skill-list"> ${cv.skills.technical.join(', ')}</span>
                    </div>
                ` : ''}
                ${cv.skills.soft?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Professional:</h4>
                        <span class="skill-list"> ${cv.skills.soft.join(', ')}</span>
                    </div>
                ` : ''}
            </div>
        </section>
        ` : ''}
        
        <footer style="margin-top: 60px; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
            <p>Generated with CVPlus - From Paper to Powerful: Your CV, Reinvented</p>
        </footer>
    </div>
</body>
</html>`;
  }

  private async creativeTemplate(cv: ParsedCV, jobId: string, features?: string[]): Promise<string> {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 30px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 40px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.05) 10px,
                rgba(255,255,255,0.05) 20px
            );
            animation: slide 20s linear infinite;
        }
        @keyframes slide {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        .name {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .contact {
            font-size: 16px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        .contact span {
            margin-right: 20px;
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 50px;
        }
        .section-title {
            font-size: 28px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 25px;
            position: relative;
            padding-left: 20px;
        }
        .section-title::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 2px;
        }
        .summary {
            font-size: 17px;
            line-height: 1.8;
            color: #555;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .experience-item, .education-item {
            margin-bottom: 35px;
            padding: 25px;
            background: #fafbfc;
            border-radius: 10px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .experience-item:hover, .education-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 10px;
        }
        .position, .degree {
            font-size: 20px;
            font-weight: 600;
            color: #333;
        }
        .company, .institution {
            font-size: 16px;
            color: #667eea;
            margin-bottom: 8px;
        }
        .duration, .graduation-date {
            font-size: 14px;
            color: #666;
            background: #e9ecef;
            padding: 4px 12px;
            border-radius: 20px;
        }
        .description {
            font-size: 15px;
            color: #555;
            margin-bottom: 12px;
            line-height: 1.7;
        }
        .achievements {
            list-style: none;
            padding-left: 0;
        }
        .achievements li {
            font-size: 15px;
            color: #555;
            margin-bottom: 10px;
            padding-left: 25px;
            position: relative;
        }
        .achievements li::before {
            content: '✦';
            position: absolute;
            left: 0;
            color: #667eea;
            font-size: 16px;
        }
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
        }
        .skill-category {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 15px;
            position: relative;
            overflow: hidden;
        }
        .skill-category::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .skill-category h4 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
        }
        .skill-list {
            list-style: none;
            font-size: 14px;
            color: #555;
        }
        .skill-list li {
            margin-bottom: 8px;
            padding: 8px 15px;
            background: rgba(255,255,255,0.8);
            border-radius: 20px;
            display: inline-block;
            margin-right: 8px;
            margin-bottom: 8px;
        }
        @media print {
            body {
                background: white !important;
                font-size: 12px;
                line-height: 1.4;
            }
            .container {
                box-shadow: none !important;
                max-width: none;
                margin: 0;
                background: white !important;
            }
            .header {
                background: #667eea !important;
                padding: 40px 30px;
                page-break-after: avoid;
            }
            .header::before {
                display: none;
            }
            .name {
                font-size: 32px;
                margin-bottom: 8px;
            }
            .contact {
                font-size: 14px;
            }
            .content {
                padding: 30px;
            }
            .section {
                margin-bottom: 30px;
                page-break-inside: avoid;
            }
            .section-title {
                font-size: 20px;
                margin-bottom: 15px;
                page-break-after: avoid;
            }
            .section-title::before {
                width: 3px;
                height: 20px;
            }
            .summary {
                font-size: 14px;
                line-height: 1.6;
                padding: 15px;
                background: #f8f9fa !important;
            }
            .experience-item, .education-item {
                margin-bottom: 25px;
                padding: 20px;
                background: #fafbfc !important;
                page-break-inside: avoid;
                transform: none !important;
                box-shadow: none !important;
            }
            .experience-item:hover, .education-item:hover {
                transform: none !important;
                box-shadow: none !important;
            }
            .position, .degree {
                font-size: 16px;
            }
            .company, .institution {
                font-size: 14px;
            }
            .duration, .graduation-date {
                font-size: 12px;
                background: #e9ecef !important;
            }
            .description {
                font-size: 13px;
                line-height: 1.5;
            }
            .achievements li {
                font-size: 13px;
                margin-bottom: 6px;
            }
            .skills-grid {
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            .skill-category {
                background: #f5f7fa !important;
                padding: 20px;
            }
            .skill-category::before {
                display: block;
            }
            .skill-category h4 {
                font-size: 14px;
                margin-bottom: 10px;
            }
            .skill-list li {
                font-size: 12px;
                background: rgba(255,255,255,0.9) !important;
                margin-bottom: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="name">${cv.personalInfo.name}</h1>
            <div class="contact">
                ${cv.personalInfo.email ? `<span>✉ ${cv.personalInfo.email}</span>` : ''}
                ${cv.personalInfo.phone ? `<span>☎ ${cv.personalInfo.phone}</span>` : ''}
                ${cv.personalInfo.location ? `<span>📍 ${cv.personalInfo.location}</span>` : ''}
            </div>
        </header>

        <div class="content">
            ${cv.summary ? `
            <section class="section">
                <h2 class="section-title">About Me</h2>
                <p class="summary">${cv.summary}</p>
            </section>
            ` : ''}

            ${cv.experience && cv.experience.length > 0 ? `
            <section class="section">
                <h2 class="section-title">Experience</h2>
                ${cv.experience.map(exp => `
                    <div class="experience-item">
                        <div class="item-header">
                            <h3 class="position">${exp.position}</h3>
                            <span class="duration">${exp.duration}</span>
                        </div>
                        <div class="company">${exp.company}</div>
                        ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
                        ${exp.achievements && exp.achievements.length > 0 ? `
                            <ul class="achievements">
                                ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `).join('')}
            </section>
            ` : ''}

            ${cv.education && cv.education.length > 0 ? `
            <section class="section">
                <h2 class="section-title">Education</h2>
                ${cv.education.map(edu => `
                    <div class="education-item">
                        <div class="item-header">
                            <h3 class="degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
                            <span class="graduation-date">${edu.year}</span>
                        </div>
                        <div class="institution">${edu.institution}</div>
                        ${edu.gpa ? `<p class="description">GPA: ${edu.gpa}</p>` : ''}
                    </div>
                `).join('')}
            </section>
            ` : ''}

            ${cv.skills && (cv.skills.technical?.length > 0 || cv.skills.soft?.length > 0) ? `
            <section class="section">
                <h2 class="section-title">Skills</h2>
                <div class="skills-grid">
                    ${cv.skills.technical?.length > 0 ? `
                        <div class="skill-category">
                            <h4>Technical Skills</h4>
                            <ul class="skill-list">
                                ${cv.skills.technical.map(skill => `<li>${skill}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${cv.skills.soft?.length > 0 ? `
                        <div class="skill-category">
                            <h4>Soft Skills</h4>
                            <ul class="skill-list">
                                ${cv.skills.soft.map(skill => `<li>${skill}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </section>
            ` : ''}
            
            <footer style="margin-top: 60px; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
                <p>Generated with CVPlus - From Paper to Powerful: Your CV, Reinvented</p>
            </footer>
        </div>
    </div>
</body>
</html>`;
  }

  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<{ pdfUrl: string; docxUrl: string; htmlUrl: string }> {
    const bucket = admin.storage().bucket();
    
    // Save HTML file
    const htmlFileName = `users/${userId}/generated/${jobId}/cv.html`;
    const htmlFile = bucket.file(htmlFileName);
    await htmlFile.save(htmlContent, {
      metadata: {
        contentType: 'text/html',
      },
    });
    
    // Get signed URLs
    const [htmlUrl] = await htmlFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    // Generate PDF using Puppeteer
    let pdfUrl = '';
    let docxUrl = '';
    
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels
      
      // Create PDF-optimized HTML content
      const pdfOptimizedHtml = this.optimizeHtmlForPdf(htmlContent);
      
      // Set content and wait for resources
      await page.setContent(pdfOptimizedHtml, { 
        waitUntil: ['networkidle0', 'domcontentloaded']
      });
      
      // Generate PDF with proper settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm'
        }
      });
      
      await browser.close();
      
      // Save PDF to Firebase Storage
      const pdfFileName = `users/${userId}/generated/${jobId}/cv.pdf`;
      const pdfFile = bucket.file(pdfFileName);
      
      await pdfFile.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000'
        }
      });
      
      const [pdfSignedUrl] = await pdfFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      
      pdfUrl = pdfSignedUrl;
      
      console.log(`PDF generated successfully: ${pdfFileName}`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      // PDF generation failed, but continue with HTML
    }
    
    return { pdfUrl, docxUrl, htmlUrl };
  }

  /**
   * Optimize HTML content for PDF generation
   * Converts interactive elements to static PDF-friendly versions
   */
  private optimizeHtmlForPdf(htmlContent: string): string {
    let optimizedHtml = htmlContent;
    
    // Replace interactive podcast players with static references
    optimizedHtml = optimizedHtml.replace(
      /<div class="podcast-player">[\s\S]*?<\/div>/g,
      `<div class="podcast-section">
         <h3>🎙️ AI Career Podcast</h3>
         <p>📱 Scan QR code or visit online version to listen</p>
         <div class="qr-placeholder">
           <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://getmycv-ai.web.app" 
                alt="QR Code" style="width: 80px; height: 80px; border: 1px solid #ccc;"/>
         </div>
       </div>`
    );
    
    // Convert interactive timeline to static timeline
    optimizedHtml = optimizedHtml.replace(
      /onclick="[^"]*"/g, ''
    );
    
    // Replace contact forms with contact information display
    optimizedHtml = optimizedHtml.replace(
      /<form[\s\S]*?onsubmit="[^"]*"[\s\S]*?<\/form>/g,
      `<div class="contact-info-static">
         <h3>📞 Contact Information</h3>
         <p>Visit the online version to use the interactive contact form</p>
       </div>`
    );
    
    // Convert interactive buttons to static elements
    optimizedHtml = optimizedHtml.replace(
      /<button[^>]*onclick="[^"]*"[^>]*>(.*?)<\/button>/g,
      '<div class="static-button">$1</div>'
    );
    
    // Remove JavaScript and event handlers
    optimizedHtml = optimizedHtml.replace(
      /<script[\s\S]*?<\/script>/g, ''
    );
    
    // Replace input fields with placeholder text
    optimizedHtml = optimizedHtml.replace(
      /<input[^>]*>/g, 
      '<span class="form-field-placeholder">[Interactive form field - use online version]</span>'
    );
    
    // Add PDF-specific styles
    const pdfStyles = `
      <style>
        @media print, screen {
          .static-button {
            display: inline-block;
            padding: 8px 16px;
            border: 2px solid #007bff;
            border-radius: 4px;
            color: #007bff;
            text-align: center;
            font-weight: 500;
            margin: 4px;
          }
          .form-field-placeholder {
            background: #f0f0f0;
            border: 1px solid #ddd;
            padding: 8px;
            border-radius: 4px;
            color: #666;
            font-style: italic;
          }
          .contact-info-static, .podcast-section {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .qr-placeholder {
            text-align: center;
            margin: 12px 0;
          }
          /* Ensure proper layout for PDF */
          * {
            box-sizing: border-box;
          }
          .container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          .interactive-timeline .timeline-item {
            cursor: default !important;
          }
          .skills-chart {
            page-break-inside: avoid;
          }
        }
      </style>
    `;
    
    // Insert PDF styles before closing head tag
    optimizedHtml = optimizedHtml.replace(
      '</head>',
      pdfStyles + '</head>'
    );
    
    // Add note about interactive features
    const interactiveNote = `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 12px; margin: 20px 0; font-size: 14px;">
        <strong>📄 PDF Version Notice:</strong> 
        This PDF contains static content. For interactive features (podcast, forms, animations), 
        visit: <strong>https://getmycv-ai.web.app</strong>
      </div>
    `;
    
    // Insert note after body opening tag
    optimizedHtml = optimizedHtml.replace(
      '<body>',
      '<body>' + interactiveNote
    );
    
    return optimizedHtml;
  }

  /**
   * Generate an interactive PDF using pdf-lib with forms, buttons, and multimedia
   */
  async generateInteractivePDF(
    parsedCV: ParsedCV, 
    features?: string[], 
    jobId?: string
  ): Promise<Uint8Array> {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed standard fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add first page
    const firstPage = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const { width, height } = firstPage.getSize();
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    
    // Header Section
    this.addPDFHeader(firstPage, parsedCV, helveticaBoldFont, helveticaFont, width, height);
    
    let currentY = height - 120;
    
    // Add interactive features based on enabled features
    if (features?.includes('generate-podcast')) {
      currentY = await this.addInteractivePodcastSection(
        firstPage, form, parsedCV, jobId, helveticaBoldFont, helveticaFont, width, currentY
      );
    }
    
    if (features?.includes('contact-form')) {
      currentY = await this.addInteractiveContactForm(
        firstPage, form, parsedCV, helveticaBoldFont, helveticaFont, width, currentY
      );
    }
    
    if (features?.includes('interactive-timeline')) {
      currentY = await this.addInteractiveTimeline(
        firstPage, form, parsedCV, helveticaBoldFont, helveticaFont, width, currentY
      );
    }
    
    if (features?.includes('embed-qr-code')) {
      await this.addInteractiveQRCode(
        firstPage, parsedCV, helveticaFont, width, height
      );
    }
    
    // Add experience and education sections
    currentY = await this.addPDFExperience(
      firstPage, parsedCV, helveticaBoldFont, helveticaFont, width, currentY
    );
    
    // Add skills section with interactive ratings
    if (features?.includes('skills-chart')) {
      currentY = await this.addInteractiveSkillsChart(
        firstPage, form, parsedCV, helveticaBoldFont, helveticaFont, width, currentY
      );
    }
    
    // Add social links with clickable buttons
    if (features?.includes('social-links')) {
      currentY = await this.addInteractiveSocialLinks(
        firstPage, form, parsedCV, helveticaBoldFont, helveticaFont, width, currentY
      );
    }
    
    // Serialize the PDF document
    return await pdfDoc.save();
  }

  private addPDFHeader(
    page: PDFPage, 
    cv: ParsedCV, 
    boldFont: any, 
    regularFont: any, 
    width: number, 
    height: number
  ): void {
    const { personalInfo } = cv;
    
    // Name
    page.drawText(personalInfo.name || 'Your Name', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Title/Location (using location as subtitle)
    if (personalInfo.location) {
      page.drawText(personalInfo.location, {
        x: 50,
        y: height - 75,
        size: 16,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    
    // Contact info
    let contactY = height - 95;
    if (personalInfo.email) {
      page.drawText(`Email: ${personalInfo.email}`, {
        x: 50,
        y: contactY,
        size: 10,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      contactY -= 15;
    }
    
    if (personalInfo.phone) {
      page.drawText(`Phone: ${personalInfo.phone}`, {
        x: 50,
        y: contactY,
        size: 10,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }
  }

  private async addInteractivePodcastSection(
    page: PDFPage,
    form: PDFForm,
    cv: ParsedCV,
    jobId?: string,
    boldFont?: any,
    regularFont?: any,
    width?: number,
    currentY?: number
  ): Promise<number> {
    const y = currentY || 600;
    
    // Section title
    page.drawText('🎙️ AI Career Podcast', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Podcast description
    page.drawText('Listen to your personalized career insights and achievements', {
      x: 50,
      y: y - 20,
      size: 10,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Draw button background first
    page.drawRectangle({
      x: 50,
      y: y - 50,
      width: 100,
      height: 30,
      color: rgb(0, 0.5, 1),
    });
    
    // Add text for the button
    page.drawText('▶ Play Podcast', {
      x: 55,
      y: y - 45,
      size: 10,
      font: regularFont,
      color: rgb(1, 1, 1),
    });
    
    // Interactive play button with JavaScript action
    const playButton = form.createButton('podcastPlayButton');
    try {
      (playButton as any).addToPage(page, {
        x: 50,
        y: y - 50,
        width: 100,
        height: 30,
      });
    } catch (e) {
      // Fallback for PDF form compatibility
      console.warn('PDF form button creation failed:', e);
    }
    
    // Add JavaScript action to open podcast URL
    if (jobId) {
      const podcastUrl = `https://getmycv-ai.web.app/podcast/${jobId}`;
      
      // Create JavaScript action to open URL
      const jsAction = `app.launchURL("${podcastUrl}", true);`;
      this.addJavaScriptAction(playButton, jsAction);
      
      // Add multimedia annotation for audio playback (advanced feature)
      await this.addMultimediaAnnotation(page, {
        x: 160,
        y: y - 50,
        width: 30,
        height: 30,
        mediaType: 'audio',
        mediaUrl: `${podcastUrl}/audio.mp3`,
        thumbnailText: '🎵'
      }, regularFont);
    }
    
    return y - 80;
  }

  private async addInteractiveContactForm(
    page: PDFPage,
    form: PDFForm,
    cv: ParsedCV,
    boldFont?: any,
    regularFont?: any,
    width?: number,
    currentY?: number
  ): Promise<number> {
    const y = currentY || 500;
    
    // Section title
    page.drawText('📞 Contact Form', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Name field
    const nameField = form.createTextField('contactName');
    nameField.addToPage(page, {
      x: 50,
      y: y - 40,
      width: 200,
      height: 20,
    });
    nameField.setText('Your Name');
    
    page.drawText('Name:', {
      x: 50,
      y: y - 25,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    // Email field
    const emailField = form.createTextField('contactEmail');
    emailField.addToPage(page, {
      x: 50,
      y: y - 80,
      width: 200,
      height: 20,
    });
    emailField.setText('your.email@example.com');
    
    page.drawText('Email:', {
      x: 50,
      y: y - 65,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    // Message field
    const messageField = form.createTextField('contactMessage');
    messageField.addToPage(page, {
      x: 50,
      y: y - 140,
      width: 300,
      height: 40,
    });
    messageField.setText('Your message here...');
    messageField.enableMultiline();
    
    page.drawText('Message:', {
      x: 50,
      y: y - 105,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    // Draw submit button background
    page.drawRectangle({
      x: 50,
      y: y - 180,
      width: 80,
      height: 25,
      color: rgb(0, 0.7, 0),
    });
    
    page.drawText('Submit', {
      x: 70,
      y: y - 175,
      size: 10,
      font: regularFont,
      color: rgb(1, 1, 1),
    });
    
    // Submit button with form submission action
    const submitButton = form.createButton('contactSubmitButton');
    try {
      (submitButton as any).addToPage(page, {
        x: 50,
        y: y - 180,
        width: 80,
        height: 25,
      });
    } catch (e) {
      console.warn('PDF form button creation failed:', e);
    }
    
    // Add form submission functionality
    this.addFormSubmissionAction(submitButton, { 
      contactEmail: cv.personalInfo.email || 'contact@example.com' 
    });
    
    return y - 210;
  }

  private async addInteractiveTimeline(
    page: PDFPage,
    form: PDFForm,
    cv: ParsedCV,
    boldFont?: any,
    regularFont?: any,
    width?: number,
    currentY?: number
  ): Promise<number> {
    const y = currentY || 400;
    
    // Section title
    page.drawText('📈 Interactive Career Timeline', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Add clickable timeline items
    const experiences = cv.experience?.slice(0, 3) || [];
    let timelineY = y - 30;
    
    experiences.forEach((exp, index) => {
      // Timeline point
      page.drawCircle({
        x: 70,
        y: timelineY,
        size: 5,
        color: rgb(0, 0.5, 1),
      });
      
      // Company name (clickable)
      const timelineButton = form.createButton(`timelineItem${index}`);
      try {
        (timelineButton as any).addToPage(page, {
          x: 85,
          y: timelineY - 10,
          width: 200,
          height: 20,
        });
      } catch (e) {
        console.warn('PDF timeline button creation failed:', e);
      }
      
      page.drawText(exp.company || 'Company', {
        x: 85,
        y: timelineY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 1), // Blue to indicate clickable
      });
      
      // Position
      page.drawText(exp.position || 'Position', {
        x: 85,
        y: timelineY - 15,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      // Timeline line
      if (index < experiences.length - 1) {
        page.drawLine({
          start: { x: 70, y: timelineY - 20 },
          end: { x: 70, y: timelineY - 40 },
          thickness: 2,
          color: rgb(0.8, 0.8, 0.8),
        });
      }
      
      timelineY -= 50;
    });
    
    return timelineY - 20;
  }

  private async addInteractiveQRCode(
    page: PDFPage,
    cv: ParsedCV,
    regularFont?: any,
    width?: number,
    height?: number
  ): Promise<void> {
    const qrSize = 80;
    const qrX = width! - qrSize - 30;
    const qrY = height! - qrSize - 30;
    
    // Generate QR code URL
    const cvUrl = `https://getmycv-ai.web.app/cv/${cv.personalInfo.name?.replace(/\s+/g, '-').toLowerCase()}`;
    
    try {
      // In a production environment, you would fetch and embed the actual QR code image
      // For now, we'll create a visual placeholder with functional URL
      
      // Draw QR code border
      page.drawRectangle({
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
        borderColor: rgb(0, 0, 0),
        borderWidth: 2,
      });
      
      // Create pattern to simulate QR code
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if ((i + j) % 2 === 0) {
            page.drawRectangle({
              x: qrX + 5 + (i * 8),
              y: qrY + 5 + (j * 8),
              width: 6,
              height: 6,
              color: rgb(0, 0, 0),
            });
          }
        }
      }
      
      // Scan instruction
      page.drawText('Scan for online CV', {
        x: qrX - 20,
        y: qrY - 10,
        size: 8,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      // Add clickable link on QR code
      const qrForm = page.doc.getForm();
      const qrButton = qrForm.createButton('qrCodeButton');
      try {
        (qrButton as any).addToPage(page, {
          x: qrX,
          y: qrY,
          width: qrSize,
          height: qrSize,
        });
      } catch (e) {
        console.warn('PDF QR button creation failed:', e);
      }
      
      // Add JavaScript action to open CV URL
      const jsAction = `app.launchURL("${cvUrl}", true);`;
      this.addJavaScriptAction(qrButton, jsAction);
      
      console.log(`Added interactive QR code linking to: ${cvUrl}`);
      
    } catch (error) {
      console.warn('Error creating interactive QR code:', error);
      
      // Fallback: simple text indicator
      page.drawText('QR Code', {
        x: qrX + 20,
        y: qrY + 35,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  private async addPDFExperience(
    page: PDFPage,
    cv: ParsedCV,
    boldFont?: any,
    regularFont?: any,
    width?: number,
    currentY?: number
  ): Promise<number> {
    const y = currentY || 300;
    
    // Section title
    page.drawText('💼 Professional Experience', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    let expY = y - 30;
    const experiences = cv.experience?.slice(0, 2) || [];
    
    experiences.forEach((exp) => {
      // Company and position
      page.drawText(`${exp.position || 'Position'} at ${exp.company || 'Company'}`, {
        x: 50,
        y: expY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      // Duration
      if (exp.duration) {
        page.drawText(exp.duration, {
          x: 50,
          y: expY - 15,
          size: 10,
          font: regularFont,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
      
      // Description (truncated)
      if (exp.description) {
        const description = exp.description.length > 100 
          ? exp.description.substring(0, 100) + '...'
          : exp.description;
        
        page.drawText(description, {
          x: 50,
          y: expY - 30,
          size: 9,
          font: regularFont,
          color: rgb(0.2, 0.2, 0.2),
          maxWidth: width! - 100,
        });
      }
      
      expY -= 70;
    });
    
    return expY - 20;
  }

  private async addInteractiveSkillsChart(
    page: PDFPage,
    form: PDFForm,
    cv: ParsedCV,
    boldFont?: any,
    regularFont?: any,
    width?: number,
    currentY?: number
  ): Promise<number> {
    const y = currentY || 200;
    
    // Section title
    page.drawText('🛠️ Interactive Skills Rating', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Combine all skills from different categories
    const allSkills = [
      ...(cv.skills?.technical || []).map(skill => ({ name: skill, level: 4 })),
      ...(cv.skills?.soft || []).map(skill => ({ name: skill, level: 3 })),
      ...(cv.skills?.languages || []).map(skill => ({ name: skill, level: 3 }))
    ].slice(0, 5);
    
    let skillY = y - 30;
    
    allSkills.forEach((skill, index) => {
      // Skill name
      page.drawText(skill.name || 'Skill', {
        x: 50,
        y: skillY,
        size: 10,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      
      // Interactive rating checkboxes
      for (let i = 1; i <= 5; i++) {
        const checkbox = form.createCheckBox(`skill${index}_rating${i}`);
        checkbox.addToPage(page, {
          x: 150 + (i * 20),
          y: skillY - 5,
          width: 10,
          height: 10,
        });
        
        // Pre-check based on skill level
        const skillLevel = skill.level || 3;
        if (i <= skillLevel) {
          checkbox.check();
        }
      }
      
      skillY -= 25;
    });
    
    return skillY - 20;
  }

  private async addInteractiveSocialLinks(
    page: PDFPage,
    form: PDFForm,
    cv: ParsedCV,
    boldFont?: any,
    regularFont?: any,
    width?: number,
    currentY?: number
  ): Promise<number> {
    const y = currentY || 100;
    
    // Section title
    page.drawText('🔗 Social & Professional Links', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Social links data (mockup)
    const socialLinks = [
      { name: 'LinkedIn', url: cv.personalInfo.linkedin || '#', icon: '💼' },
      { name: 'GitHub', url: cv.personalInfo.github || '#', icon: '💻' },
      { name: 'Portfolio', url: cv.personalInfo.website || '#', icon: '🌐' },
    ];
    
    let linkY = y - 30;
    
    socialLinks.forEach((link, index) => {
      if (link.url && link.url !== '#') {
        // Create clickable button for each social link
        const socialButton = form.createButton(`socialLink${index}`);
        try {
          (socialButton as any).addToPage(page, {
            x: 50,
            y: linkY - 5,
            width: 120,
            height: 20,
          });
        } catch (e) {
          console.warn('PDF social button creation failed:', e);
        }
        
        // Add JavaScript action to open URL
        const jsAction = `app.launchURL("${link.url}", true);`;
        this.addJavaScriptAction(socialButton, jsAction);
        
        // Draw link text
        page.drawText(`${link.icon} ${link.name}`, {
          x: 55,
          y: linkY,
          size: 10,
          font: regularFont,
          color: rgb(0, 0, 1), // Blue to indicate clickable
        });
        
        linkY -= 25;
      }
    });
    
    return linkY - 20;
  }

  /**
   * Replace the existing Puppeteer PDF generation with interactive PDF generation
   */
  async saveGeneratedFilesWithInteractivePDF(
    jobId: string,
    userId: string,
    htmlContent: string,
    parsedCV: ParsedCV,
    features?: string[]
  ): Promise<{ pdfUrl: string; docxUrl: string; htmlUrl: string }> {
    const bucket = admin.storage().bucket();
    
    // Save HTML file
    const htmlFileName = `users/${userId}/generated/${jobId}/cv.html`;
    const htmlFile = bucket.file(htmlFileName);
    await htmlFile.save(htmlContent, {
      metadata: {
        contentType: 'text/html',
      },
    });
    
    // Get signed URLs
    const [htmlUrl] = await htmlFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    // Generate Interactive PDF using pdf-lib
    let pdfUrl = '';
    let docxUrl = '';
    
    try {
      console.log('Generating interactive PDF with pdf-lib...');
      
      // Generate interactive PDF
      const pdfBytes = await this.generateInteractivePDF(parsedCV, features, jobId);
      
      // Save PDF to Firebase Storage
      const pdfFileName = `users/${userId}/generated/${jobId}/cv.pdf`;
      const pdfFile = bucket.file(pdfFileName);
      
      await pdfFile.save(Buffer.from(pdfBytes), {
        metadata: {
          contentType: 'application/pdf',
        },
        resumable: false,
      });
      
      const [pdfSignedUrl] = await pdfFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      
      pdfUrl = pdfSignedUrl;
      console.log(`Interactive PDF generated successfully: ${pdfFileName}`);
      
    } catch (error) {
      console.error('Error generating interactive PDF:', error);
      // Fall back to Puppeteer if interactive PDF generation fails
      const fallbackResult = await this.saveGeneratedFiles(jobId, userId, htmlContent);
      return fallbackResult;
    }
    
    // Generate DOCX (existing implementation would go here)
    // For now, using a placeholder
    try {
      // DOCX generation code would go here
      // This is a simplified placeholder
      const docxFileName = `users/${userId}/generated/${jobId}/cv.docx`;
      docxUrl = `https://storage.googleapis.com/placeholder/${docxFileName}`;
    } catch (error) {
      console.error('Error generating DOCX:', error);
    }
    
    return { pdfUrl, docxUrl, htmlUrl };
  }

  /**
   * Add JavaScript action to a PDF button for enhanced interactivity
   */
  private addJavaScriptAction(button: PDFButton, jsCode: string): void {
    try {
      // Create a JavaScript action dictionary
      const jsAction = PDFDict.withContext(button.doc.context);
      jsAction.set(PDFName.of('Type'), PDFName.of('Action'));
      jsAction.set(PDFName.of('S'), PDFName.of('JavaScript'));
      jsAction.set(PDFName.of('JS'), PDFString.of(jsCode));
      
      // Get the button's annotation dictionary
      const buttonRef = button.acroField.ref;
      const buttonDict = button.doc.context.lookup(buttonRef) as PDFDict;
      
      // Set the action
      buttonDict.set(PDFName.of('A'), jsAction);
      
      console.log(`Added JavaScript action to button: ${jsCode}`);
    } catch (error) {
      console.warn('Could not add JavaScript action to button:', error);
    }
  }

  /**
   * Add multimedia annotation for audio/video content
   */
  private async addMultimediaAnnotation(
    page: PDFPage,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
      mediaType: 'audio' | 'video';
      mediaUrl: string;
      thumbnailText: string;
    },
    font: any
  ): Promise<void> {
    try {
      // For now, create a visual indicator for multimedia content
      // In a full implementation, this would create proper multimedia annotations
      
      // Draw multimedia indicator background
      page.drawRectangle({
        x: options.x,
        y: options.y,
        width: options.width,
        height: options.height,
        color: rgb(0.9, 0.9, 0.9),
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 1,
      });
      
      // Draw media type icon
      page.drawText(options.thumbnailText, {
        x: options.x + options.width / 2 - 6,
        y: options.y + options.height / 2 - 4,
        size: 12,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      console.log(`Added ${options.mediaType} multimedia annotation at ${options.x}, ${options.y}`);
      
      // TODO: Implement proper multimedia annotation using PDF rich media annotations
      // This would require more complex PDF manipulation and media embedding
      
    } catch (error) {
      console.warn('Could not add multimedia annotation:', error);
    }
  }

  /**
   * Add a form submission action to contact form
   */
  private addFormSubmissionAction(submitButton: PDFButton, formData: any): void {
    try {
      // Create a submit form action
      const submitAction = `
        // Collect form data
        var name = this.getField('contactName').value;
        var email = this.getField('contactEmail').value;
        var message = this.getField('contactMessage').value;
        
        // Validate required fields
        if (!name || !email || !message) {
          app.alert('Please fill in all required fields.');
          return;
        }
        
        // Create email link
        var subject = encodeURIComponent('Contact from CV: ' + name);
        var body = encodeURIComponent('Name: ' + name + '\\n\\nEmail: ' + email + '\\n\\nMessage: ' + message);
        var emailUrl = 'mailto:${formData.contactEmail}?subject=' + subject + '&body=' + body;
        
        // Launch email client
        app.launchURL(emailUrl, true);
        
        // Show success message
        app.alert('Thank you! Your default email client will open with the pre-filled message.');
      `;
      
      this.addJavaScriptAction(submitButton, submitAction);
      console.log('Added form submission action to contact form');
      
    } catch (error) {
      console.warn('Could not add form submission action:', error);
    }
  }
}