import { ParsedCV } from '../../cvParser';
import { CVFeature } from '../types';

/**
 * Podcast feature generator
 * Creates an AI-generated career podcast player section
 */
export class PodcastFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    return `
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
      </div>
    `;
  }

  getStyles(): string {
    return `
      .podcast-section {
        margin: 30px 0;
        padding: 25px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        color: white;
        page-break-inside: avoid;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      }
      
      .podcast-banner h3 {
        font-size: 22px;
        margin-bottom: 8px;
        line-height: 1.4;
        font-weight: 600;
      }
      
      .podcast-banner p {
        margin-bottom: 15px;
        line-height: 1.5;
        opacity: 0.9;
      }
      
      .podcast-player {
        margin-top: 15px;
      }
      
      .podcast-status {
        text-align: center;
        padding: 25px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        backdrop-filter: blur(10px);
      }
      
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .podcast-status p {
        margin: 10px 0 5px;
        font-weight: 500;
      }
      
      .podcast-status small {
        opacity: 0.8;
        font-size: 13px;
      }
      
      .transcript-toggle {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 14px;
        margin-top: 15px;
        transition: all 0.3s ease;
      }
      
      .transcript-toggle:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .transcript-content {
        background: rgba(255, 255, 255, 0.1);
        padding: 15px;
        border-radius: 8px;
        margin-top: 10px;
        font-size: 14px;
        line-height: 1.6;
        backdrop-filter: blur(5px);
      }
      
      #careerPodcast {
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      }
      
      @media (max-width: 768px) {
        .podcast-section {
          margin: 20px 0;
          padding: 20px;
        }
        
        .podcast-banner h3 {
          font-size: 20px;
        }
        
        .podcast-status {
          padding: 20px;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      let podcastCheckInterval;
      let retryCount = 0;
      const MAX_RETRIES = 60; // 5 minutes with 5-second intervals

      function toggleTranscript() {
        const transcriptContent = document.getElementById('transcriptContent');
        const toggleBtn = document.querySelector('.transcript-toggle');
        
        if (transcriptContent.style.display === 'none') {
          transcriptContent.style.display = 'block';
          toggleBtn.textContent = 'Hide Transcript';
        } else {
          transcriptContent.style.display = 'none';
          toggleBtn.textContent = 'Show Transcript';
        }
      }

      async function startPodcastGeneration(jobId) {
        try {
          const response = await fetch('/api/generate-podcast', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jobId: jobId })
          });
          
          if (response.ok) {
            // Start checking for completion
            checkPodcastStatus(jobId);
          } else {
            throw new Error('Failed to start podcast generation');
          }
        } catch (error) {
          console.error('Podcast generation error:', error);
          document.getElementById('podcastStatus').innerHTML = 
            '<p style="color: #ffeb3b;">⚠️ Podcast generation unavailable. Please try again later.</p>';
        }
      }

      async function checkPodcastStatus(jobId) {
        try {
          const response = await fetch(\`/api/podcast-status/\${jobId}\`);
          const data = await response.json();
          
          if (data.ready && data.audioUrl) {
            // Podcast is ready
            displayPodcast(data.audioUrl, data.transcript);
          } else if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => checkPodcastStatus(jobId), 5000);
          } else {
            // Timeout
            document.getElementById('podcastStatus').innerHTML = 
              '<p style="color: #ffeb3b;">⚠️ Podcast generation is taking longer than expected. Please refresh to check status.</p>';
          }
        } catch (error) {
          console.error('Podcast check error:', error);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => checkPodcastStatus(jobId), 5000);
          }
        }
      }

      function displayPodcast(audioUrl, transcript) {
        const statusDiv = document.getElementById('podcastStatus');
        const audioPlayer = document.getElementById('careerPodcast');
        const transcriptDiv = document.getElementById('podcastTranscript');
        
        // Hide loading status
        statusDiv.style.display = 'none';
        
        // Show audio player
        audioPlayer.src = audioUrl;
        audioPlayer.style.display = 'block';
        
        // Show transcript if available
        if (transcript) {
          document.getElementById('transcriptContent').innerHTML = transcript;
          transcriptDiv.style.display = 'block';
        }
      }

      // Auto-start podcast generation on page load
      document.addEventListener('DOMContentLoaded', function() {
        const jobIdMeta = document.querySelector('meta[name="job-id"]');
        if (jobIdMeta) {
          startPodcastGeneration(jobIdMeta.getAttribute('content'));
        }
      });
    `;
  }
}