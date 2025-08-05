import * as admin from 'firebase-admin';
import { ParsedCV } from './cvParser';

export class CVGenerator {
  async generateHTML(parsedCV: ParsedCV, template: string, features?: string[], jobId?: string): Promise<string> {
    const templates: Record<string, (cv: ParsedCV, features?: string[]) => string> = {
      modern: this.modernTemplate.bind(this),
      classic: this.classicTemplate.bind(this),
      creative: this.creativeTemplate.bind(this),
    };

    const templateFn = templates[template] || templates.modern;
    let html = templateFn(parsedCV, features);
    
    // Replace jobId placeholder if podcast feature is enabled
    if (features?.includes('generate-podcast') && jobId) {
      html = html.replace('{{JOB_ID}}', jobId);
    }
    
    return html;
  }

  private generateInteractiveFeatures(cv: ParsedCV, features?: string[]): {
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
  } {
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
      const cvUrl = `https://cvisionary.web.app/cv/${cv.personalInfo.name?.replace(/\s+/g, '-').toLowerCase()}`;
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

    // Skills Chart
    if (features.includes('skills-chart')) {
      const technicalSkills = cv.skills?.technical || [];
      skillsChart = `
        <div class="skills-chart-section">
          <h2 class="section-title">Skills Visualization</h2>
          <div class="skills-chart">
            ${technicalSkills.slice(0, 8).map(skill => {
              const level = Math.floor(Math.random() * 30) + 70; // Random level 70-100
              return `
                <div class="skill-bar">
                  <span class="skill-name">${skill}</span>
                  <div class="skill-progress">
                    <div class="skill-level" style="width: ${level}%">
                      <span class="skill-percent">${level}%</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>`;
      
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
      socialLinks = `
        <div class="social-links">
          ${cv.personalInfo.linkedin ? `<a href="${cv.personalInfo.linkedin}" target="_blank" class="social-link linkedin">LinkedIn</a>` : ''}
          ${cv.personalInfo.github ? `<a href="${cv.personalInfo.github}" target="_blank" class="social-link github">GitHub</a>` : ''}
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
          <form class="contact-form" onsubmit="alert('Message sent! (Demo only)'); return false;">
            <input type="text" placeholder="Your Name" required />
            <input type="email" placeholder="Your Email" required />
            <textarea placeholder="Your Message" rows="4" required></textarea>
            <button type="submit">Send Message</button>
          </form>
        </div>`;
      
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
        }`;
    }

    // Language Proficiency
    if (features.includes('language-proficiency')) {
      const languages = cv.skills?.languages || [];
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

    // Achievements Showcase
    if (features.includes('achievements-showcase')) {
      const achievements: { text: string; company: string }[] = [];
      cv.experience?.forEach(exp => {
        if (exp.achievements) {
          achievements.push(...exp.achievements.map(ach => ({ text: ach, company: exp.company })));
        }
      });
      
      if (achievements.length > 0) {
        achievementsShowcase = `
          <div class="achievements-section">
            <h2 class="section-title">Key Achievements</h2>
            <div class="achievements-grid">
              ${achievements.slice(0, 6).map((ach, index) => `
                <div class="achievement-card" style="animation-delay: ${index * 0.1}s">
                  <div class="achievement-icon">🏆</div>
                  <div class="achievement-text">${ach.text}</div>
                  <div class="achievement-company">${ach.company}</div>
                </div>
              `).join('')}
            </div>
          </div>`;
        
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

    // Video Introduction
    if (features.includes('video-introduction')) {
      videoIntroduction = `
        <div class="video-section">
          <h2 class="section-title">Video Introduction</h2>
          <div class="video-container">
            <div class="video-placeholder">
              <div class="video-icon">🎥</div>
              <h3>My Professional Introduction</h3>
              <p>Click to play a 2-minute video about my background and expertise</p>
              <button class="video-play-btn" onclick="alert('Video feature coming soon!')">
                ▶ Play Video
              </button>
            </div>
          </div>
        </div>`;
      
      additionalStyles += `
        .video-container {
          max-width: 600px;
          margin: 20px auto;
        }
        .video-placeholder {
          background: #f8f9fa;
          padding: 60px 40px;
          border-radius: 12px;
          text-align: center;
          border: 2px dashed #e0e0e0;
        }
        .video-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .video-placeholder h3 {
          margin-bottom: 10px;
        }
        .video-placeholder p {
          color: #666;
          margin-bottom: 20px;
        }
        .video-play-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .video-play-btn:hover {
          background: #c0392b;
          transform: scale(1.05);
        }
        @media print, screen {
          .video-section {
            page-break-inside: avoid;
          }
          .video-placeholder {
            background: #f8f9fa !important;
            border: 2px solid #e0e0e0 !important;
            padding: 40px 30px;
          }
          .video-play-btn {
            background: #e74c3c !important;
            transform: none !important;
          }
          .video-play-btn:hover {
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
          <h2 class="section-title">Availability</h2>
          <div class="calendar-widget">
            <div class="calendar-header">
              <h4>Schedule a Meeting</h4>
              <p>I'm available for interviews and discussions</p>
            </div>
            <div class="availability-slots">
              <div class="slot available">Mon-Fri: 9 AM - 6 PM EST</div>
              <div class="slot available">Weekends: By appointment</div>
            </div>
            <button class="schedule-btn" onclick="alert('Calendar integration coming soon!')">
              📅 Book a Time Slot
            </button>
          </div>
        </div>`;
      
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
        .schedule-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .schedule-btn:hover {
          background: #388e3c;
          transform: scale(1.05);
        }
        @media print, screen {
          .calendar-section {
            page-break-inside: avoid;
          }
          .calendar-widget {
            background: #f8f9fa !important;
            max-width: 350px;
          }
          .schedule-btn {
            background: #4caf50 !important;
            transform: none !important;
          }
          .schedule-btn:hover {
            background: #4caf50 !important;
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

  private modernTemplate(cv: ParsedCV, features?: string[]): string {
    const interactiveFeatures = this.generateInteractiveFeatures(cv, features);
    
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
        apiKey: "AIzaSyAgANn5E7V3jcdHOU3M0A9Du_ZjF_3Xmcs",
        authDomain: "getmycv-ai.firebaseapp.com",
        projectId: "getmycv-ai",
        storageBucket: "getmycv-ai.firebasestorage.app",
        messagingSenderId: "515594461216",
        appId: "1:515594461216:web:99452fce1dff7557dc9c45"
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
                        <span class="graduation-date">${edu.graduationDate}</span>
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
        
        ${interactiveFeatures.personalityInsights || ''}
        
        ${interactiveFeatures.videoIntroduction || ''}
        
        ${interactiveFeatures.calendar || ''}
        
        ${interactiveFeatures.contactForm || ''}
        
        <footer style="margin-top: 60px; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
            <p>Generated with CVisionery - From Paper to Powerful: Your CV, Reinvented</p>
        </footer>
    </div>
</body>
</html>`;
  }

  private classicTemplate(cv: ParsedCV, features?: string[]): string {
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
                        <span class="graduation-date">${edu.graduationDate}</span>
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
            <p>Generated with CVisionery - From Paper to Powerful: Your CV, Reinvented</p>
        </footer>
    </div>
</body>
</html>`;
  }

  private creativeTemplate(cv: ParsedCV, features?: string[]): string {
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
                            <span class="graduation-date">${edu.graduationDate}</span>
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
                <p>Generated with CVisionery - From Paper to Powerful: Your CV, Reinvented</p>
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
}