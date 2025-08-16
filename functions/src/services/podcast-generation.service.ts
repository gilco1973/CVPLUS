/**
 * Podcast Generation Service
 * Creates conversational podcasts using AI voices
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../config/environment';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Set FFmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg');

interface ConversationalScript {
  segments: Array<{
    speaker: 'host1' | 'host2';
    text: string;
    emotion?: 'excited' | 'curious' | 'thoughtful' | 'impressed';
    pause?: number; // milliseconds
  }>;
  totalDuration: number;
}

interface VoiceConfig {
  host1: {
    voiceId: string;
    name: string;
    style: string;
  };
  host2: {
    voiceId: string;
    name: string;
    style: string;
  };
}

export class PodcastGenerationService {
  private openai: OpenAI;
  private elevenLabsApiKey: string;
  private voiceConfig: VoiceConfig;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });
    
    this.elevenLabsApiKey = (config.elevenLabs?.apiKey || process.env.ELEVENLABS_API_KEY || '').trim();
    
    // Configure voices for conversational podcast
    // Note: Swapped voice IDs to fix gender assignment issue
    this.voiceConfig = {
      host1: {
        voiceId: config.elevenLabs?.host1VoiceId || process.env.ELEVENLABS_HOST1_VOICE_ID || 'yoZ06aMxZJJ28mfd3POQ',
        name: 'Sarah',
        style: 'Professional podcast host'
      },
      host2: {
        voiceId: config.elevenLabs?.host2VoiceId || process.env.ELEVENLABS_HOST2_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
        name: 'Mike',
        style: 'Engaging co-host'
      }
    };
  }
  
  /**
   * Generate a conversational podcast from CV data
   */
  async generatePodcast(
    parsedCV: ParsedCV,
    jobId: string,
    userId: string,
    options: {
      duration?: 'short' | 'medium' | 'long'; // 2-3min, 5-7min, 10-12min
      style?: 'professional' | 'casual' | 'enthusiastic';
      focus?: 'achievements' | 'journey' | 'skills' | 'balanced';
    } = {}
  ): Promise<{
    audioUrl: string;
    transcript: string;
    duration: string;
    chapters: Array<{ title: string; startTime: number; endTime: number; }>;
  }> {
    try {
      // Step 1: Generate conversational script
      const script = await this.generateConversationalScript(parsedCV, options);
      
      // Step 2: Generate audio for each segment
      const audioSegments = await this.generateAudioSegments(script);
      
      // Step 3: Merge audio segments into final podcast
      const podcastUrl = await this.mergeAudioSegments(audioSegments, jobId, userId);
      
      // Step 4: Generate chapters from script
      const chapters = this.generateChapters(script);
      
      // Step 5: Create readable transcript
      const transcript = this.formatTranscript(script);
      
      // Step 6: Calculate total duration
      const duration = this.calculateDuration(audioSegments);
      
      return {
        audioUrl: podcastUrl,
        transcript,
        duration,
        chapters
      };
    } catch (error: any) {
      console.error('Error generating podcast:', error);
      throw new Error(`Podcast generation failed: ${error.message}`);
    }
  }

  /**
   * Get technical skills from skills union type
   */
  private getTechnicalSkills(skills: string[] | { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    return skills.technical || [];
  }
  
  /**
   * Generate a conversational script using GPT-4
   */
  private async generateConversationalScript(
    cv: ParsedCV,
    options: any
  ): Promise<ConversationalScript> {
    const durationWords = {
      short: 400,
      medium: 900,
      long: 1800
    };
    
    const targetWords = durationWords[options.duration as keyof typeof durationWords] || durationWords.medium;
    
    const prompt = `Create a natural, engaging podcast conversation between two hosts discussing this professional's career. Write ONLY the spoken dialogue - no stage directions, no emotional cues, no sound effects.

Host 1 (Sarah): Professional podcast host, asks insightful questions
Host 2 (Mike): Engaging co-host, adds color commentary and follow-up questions

Professional Profile:
Name: ${cv.personalInfo?.name || 'The candidate'}
Current Role: ${cv.experience?.[0]?.position || 'Professional'} at ${cv.experience?.[0]?.company || 'their company'}
Key Skills: ${this.getTechnicalSkills(cv.skills)?.slice(0, 5).join(', ') || 'various skills'}
Notable Achievement: ${cv.experience?.[0]?.achievements?.[0] || cv.achievements?.[0] || 'significant accomplishments'}

Create a ${targetWords}-word conversation that includes:
1. Natural opening banter
2. Introduction of the professional
3. Discussion of their career journey
4. Deep dive into key achievements
5. Insights about their skills and expertise
6. Future outlook and advice
7. Engaging closing

Format each line as:
[SARAH]: Spoken dialogue only
[MIKE]: Spoken dialogue only

IMPORTANT RULES:
- Write only what should be spoken aloud
- NO stage directions like "laughs", "chuckles", "pauses"
- NO emotional descriptions like "excitedly" or "thoughtfully"
- NO sound effects or action descriptions
- Use natural conversational language with enthusiasm and personality
- Let the voice actors convey emotion through delivery, not through text

Example of what NOT to do:
[SARAH]: That's amazing! *laughs* I can't believe how impressive that is.

Example of what TO do:
[SARAH]: That's absolutely incredible! I'm genuinely impressed by that achievement.

Style: ${options.style || 'casual'}
Focus: ${options.focus || 'balanced'}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a podcast script writer creating engaging, natural conversations about professionals. Make it sound like a real podcast with personality, not a formal interview.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: targetWords * 2
      });
      
      const scriptText = response.choices[0].message?.content || '';
      return this.parseScriptToSegments(scriptText);
    } catch (error) {
      console.error('Error generating script:', error);
      // Fallback to template-based script
      return this.generateTemplateScript(cv, targetWords);
    }
  }
  
  /**
   * Parse script text into segments
   */
  private parseScriptToSegments(scriptText: string): ConversationalScript {
    const lines = scriptText.split('\n').filter(line => line.trim());
    const segments: ConversationalScript['segments'] = [];
    
    for (const line of lines) {
      const match = line.match(/\[(HOST1|HOST2|SARAH|MIKE)\]:\s*(.+)/i);
      if (match) {
        const speaker = match[1].toLowerCase().includes('1') || match[1].toLowerCase() === 'sarah' ? 'host1' : 'host2';
        let text = match[2];
        
        // Clean the text of any stage directions or emotional cues
        text = this.cleanScriptText(text);
        
        // Skip empty segments after cleaning
        if (!text.trim()) {
          continue;
        }
        
        // Detect emotion from text content and punctuation
        let emotion: 'excited' | 'curious' | 'thoughtful' | 'impressed' = 'thoughtful';
        if (text.includes('!') || text.toLowerCase().includes('wow') || text.toLowerCase().includes('amazing') || 
            text.toLowerCase().includes('incredible') || text.toLowerCase().includes('fantastic')) {
          emotion = 'excited';
        } else if (text.includes('?') || text.toLowerCase().includes('how') || text.toLowerCase().includes('what') || 
                  text.toLowerCase().includes('why') || text.toLowerCase().includes('tell us')) {
          emotion = 'curious';
        } else if (text.toLowerCase().includes('impressive') || text.toLowerCase().includes('excellent') || 
                  text.toLowerCase().includes('outstanding') || text.toLowerCase().includes('remarkable')) {
          emotion = 'impressed';
        }
        
        segments.push({
          speaker,
          text,
          emotion,
          pause: text.endsWith('...') ? 500 : 200
        });
      }
    }
    
    // Calculate estimated duration (150 words per minute)
    const totalWords = segments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0);
    const totalDuration = (totalWords / 150) * 60 * 1000; // milliseconds
    
    return { segments, totalDuration };
  }
  
  /**
   * Clean script text of stage directions and emotional cues
   */
  private cleanScriptText(text: string): string {
    // Remove common stage directions and emotional cues
    let cleanText = text
      // Remove content in parentheses (laughs), (chuckles), (pause), etc.
      .replace(/\([^)]*\)/g, '')
      // Remove content in square brackets [laughs], [chuckle], [pause], etc.
      .replace(/\[[^\]]*\]/g, '')
      // Remove content in asterisks *laughs*, *chuckles*, *pauses*, etc.
      .replace(/\*[^*]*\*/g, '')
      // Remove common stage direction words when they appear as standalone elements
      .replace(/\b(laughs?|chuckles?|giggles?|pauses?|sighs?|gasps?)\b/gi, '')
      // Remove multiple spaces and clean up
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove leading/trailing punctuation that might be left over
    cleanText = cleanText.replace(/^[,\s]+|[,\s]+$/g, '');
    
    return cleanText;
  }
  
  /**
   * Generate audio for each segment using ElevenLabs
   */
  private async generateAudioSegments(
    script: ConversationalScript
  ): Promise<Array<{ speaker: string; audioBuffer: Buffer; duration: number; }>> {
    const audioSegments = [];
    
    for (const segment of script.segments) {
      const voiceId = segment.speaker === 'host1' 
        ? this.voiceConfig.host1.voiceId 
        : this.voiceConfig.host2.voiceId;
      
      try {
        // Validate and clean API key before making request
        if (!this.elevenLabsApiKey || this.elevenLabsApiKey.length < 10) {
          throw new Error('Invalid ElevenLabs API key');
        }

        // Ensure API key contains only valid characters (remove newlines, spaces, etc.)
        const cleanApiKey = this.elevenLabsApiKey.replace(/[\s\n\r\t]/g, '');
        
        // Clean text one more time before sending to ElevenLabs
        const cleanText = this.cleanScriptText(segment.text);
        
        // Skip if text is empty after cleaning
        if (!cleanText.trim()) {
          console.log('Skipping empty segment after cleaning');
          continue;
        }
        
        // Enhanced voice settings based on emotion
        const voiceSettings = this.getVoiceSettingsForEmotion(segment.emotion, segment.speaker);
        
        // Call ElevenLabs API
        const response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            text: cleanText,
            model_id: 'eleven_multilingual_v2', // Better for natural conversation
            voice_settings: voiceSettings
          },
          {
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': cleanApiKey,
              'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
          }
        );
        
        audioSegments.push({
          speaker: segment.speaker,
          audioBuffer: Buffer.from(response.data),
          duration: this.estimateAudioDuration(segment.text)
        });
        
        // Add pause if specified (skip for now to avoid FFmpeg lavfi issues)
        // Note: Pauses can be handled by adding brief silence between segments in the concat process
        // if (segment.pause && segment.pause > 200) {
        //   audioSegments.push({
        //     speaker: 'pause',
        //     audioBuffer: this.generateSilence(segment.pause),
        //     duration: segment.pause
        //   });
        // }
      } catch (error) {
        console.error('Error generating audio segment:', error);
        // Skip failed segments
      }
    }
    
    return audioSegments;
  }
  
  /**
   * Merge audio segments into final podcast using FFmpeg
   */
  private async mergeAudioSegments(
    segments: Array<{ speaker: string; audioBuffer: Buffer; duration: number; }>,
    jobId: string,
    userId: string
  ): Promise<string> {
    const tempDir = path.join(os.tmpdir(), `podcast-${jobId}`);
    const outputPath = path.join(tempDir, 'final-podcast.mp3');
    
    try {
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Save individual audio segments to temp files
      const tempFiles: string[] = [];
      const listFilePath = path.join(tempDir, 'filelist.txt');
      const listFileContent: string[] = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        if (segment.speaker === 'pause') {
          // Skip pause segments for now to avoid FFmpeg lavfi issues
          // In production, these could be handled by adding crossfade or brief silence
          console.log(`Skipping pause segment of ${segment.duration}ms`);
          continue;
        } else {
          // Save audio segment
          const segmentFile = path.join(tempDir, `segment-${i}.mp3`);
          fs.writeFileSync(segmentFile, segment.audioBuffer);
          tempFiles.push(segmentFile);
          listFileContent.push(`file '${segmentFile}'`);
        }
      }
      
      // Write list file for FFmpeg concat
      fs.writeFileSync(listFilePath, listFileContent.join('\n'));
      
      // Merge audio files using FFmpeg
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg()
          .input(listFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .audioFrequency(44100)
          .audioChannels(2)
          .output(outputPath)
          .on('start', (cmdline: string) => {
            console.log('FFmpeg command:', cmdline);
          })
          .on('progress', (progress: any) => {
            console.log('FFmpeg progress:', progress.percent + '% done');
          })
          .on('end', () => {
            console.log('Audio merging completed');
            resolve();
          })
          .on('error', (err: any) => {
            console.error('FFmpeg error:', err);
            console.error('FFmpeg stderr:', err.stderr);
            reject(new Error(`Audio merging failed: ${err.message}`));
          });
        
        console.log('Starting FFmpeg audio merging...');
        command.run();
      });
      
      // Upload merged file to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `users/${userId}/podcasts/${jobId}/career-podcast.mp3`;
      const file = bucket.file(fileName);
      
      const mergedAudioBuffer = fs.readFileSync(outputPath);
      await file.save(mergedAudioBuffer, {
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            jobId,
            generatedAt: new Date().toISOString(),
            segmentCount: segments.length,
            totalDuration: segments.reduce((sum, s) => sum + s.duration, 0)
          }
        }
      });
      
      await file.makePublic();
      
      // Clean up temp files
      this.cleanupTempFiles([...tempFiles, listFilePath, outputPath]);
      
      // Check if we're in emulator environment
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
      let audioUrl: string;
      
      if (isEmulator) {
        // Use emulator URL format
        audioUrl = `http://localhost:9199/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
      } else {
        // Use production URL format
        audioUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      }
      
      return audioUrl;
      
    } catch (error) {
      console.error('Error merging audio segments:', error);
      // Clean up temp files on error
      this.cleanupTempFiles([tempDir]);
      throw new Error(`Failed to merge audio segments: ${error}`);
    }
  }
  
  /**
   * Generate silence file using FFmpeg
   * Note: Currently disabled due to lavfi compatibility issues
   * Pauses are handled by skipping silence generation for now
   */
  private async generateSilenceFile(durationMs: number, outputPath: string): Promise<void> {
    // This method is currently disabled to avoid FFmpeg lavfi issues
    // In production, silence could be handled by:
    // 1. Using crossfade between audio segments
    // 2. Adding brief delays in the concat process
    // 3. Using a different audio processing library
    
    console.log(`Silence generation skipped for ${durationMs}ms duration`);
    throw new Error('Silence generation temporarily disabled');
  }
  
  /**
   * Clean up temporary files
   */
  private cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          if (fs.lstatSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    });
  }
  
  /**
   * Generate template-based script as fallback
   */
  private generateTemplateScript(cv: ParsedCV, targetWords: number): ConversationalScript {
    const name = cv.personalInfo?.name || 'our guest';
    const role = cv.experience?.[0]?.position || 'professional';
    const company = cv.experience?.[0]?.company || 'their company';
    
    const segments: ConversationalScript['segments'] = [
      {
        speaker: 'host1',
        text: `Welcome to Career Conversations! I'm Sarah, and I'm here with my co-host Mike.`,
        emotion: 'excited'
      },
      {
        speaker: 'host2',
        text: `Hey everyone! Today we have a fascinating professional to discuss.`,
        emotion: 'excited'
      },
      {
        speaker: 'host1',
        text: `That's right! We're talking about ${name}, who is currently working as ${role} at ${company}. Their journey is really inspiring.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `What caught my attention immediately was their diverse skill set. They're proficient in ${this.getTechnicalSkills(cv.skills)?.slice(0, 3).join(', ') || 'multiple technologies'}.`,
        emotion: 'impressed'
      },
      {
        speaker: 'host1',
        text: `Absolutely! And if we look at their career progression, it's clear they've been consistently growing. They've worked at ${cv.experience?.length || 'several'} different organizations.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `You know what really stands out to me? ${cv.experience?.[0]?.achievements?.[0] || 'Their ability to drive meaningful results and make a real impact'}.`,
        emotion: 'impressed'
      },
      {
        speaker: 'host1',
        text: `That's such a great point! It shows real leadership and initiative. What do you think makes them particularly effective in their role?`,
        emotion: 'curious'
      },
      {
        speaker: 'host2',
        text: `I think it's the combination of technical expertise and soft skills. They clearly understand not just the how but also the why behind their work.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host1',
        text: `Definitely. For our listeners who might be in similar fields, what key takeaways do you see from this career journey?`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `Great question! I'd say continuous learning is key. Look at their skill progression - they've stayed current with industry trends while building on their core expertise.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host1',
        text: `That's excellent advice. Well, that wraps up today's Career Conversation. Thanks for joining us!`,
        emotion: 'excited'
      },
      {
        speaker: 'host2',
        text: `Thanks everyone! Remember, every career journey is unique, but there's always something to learn from others' experiences. Until next time!`,
        emotion: 'excited'
      }
    ];
    
    const totalDuration = segments.length * 5000; // 5 seconds per segment average
    
    return { segments, totalDuration };
  }
  
  /**
   * Generate chapters from script
   */
  private generateChapters(script: ConversationalScript): Array<{ title: string; startTime: number; endTime: number; }> {
    const chapters = [
      { title: 'Introduction', startTime: 0, endTime: 30 },
      { title: 'Career Overview', startTime: 30, endTime: 90 },
      { title: 'Skills & Expertise', startTime: 90, endTime: 150 },
      { title: 'Key Achievements', startTime: 150, endTime: 210 },
      { title: 'Career Insights', startTime: 210, endTime: 270 },
      { title: 'Closing Thoughts', startTime: 270, endTime: 300 }
    ];
    
    return chapters;
  }
  
  /**
   * Format script as readable transcript
   */
  private formatTranscript(script: ConversationalScript): string {
    const lines = script.segments.map(segment => {
      const speaker = segment.speaker === 'host1' ? 'Sarah' : 'Mike';
      return `${speaker}: ${segment.text}`;
    });
    
    return lines.join('\n\n');
  }
  
  /**
   * Estimate audio duration from text
   */
  private estimateAudioDuration(text: string): number {
    const words = text.split(' ').length;
    const wordsPerSecond = 2.5; // Average speaking rate
    return (words / wordsPerSecond) * 1000; // milliseconds
  }
  
  /**
   * Generate silence buffer
   */
  private generateSilence(duration: number): Buffer {
    // Generate silent MP3 data
    // In production, use proper audio library
    return Buffer.alloc(duration * 16); // Simplified
  }
  
  /**
   * Get voice settings optimized for emotion and speaker
   */
  private getVoiceSettingsForEmotion(emotion: string, speaker: string) {
    const baseSettings = {
      stability: speaker === 'host1' ? 0.6 : 0.5, // Sarah (host1) slightly more stable
      similarity_boost: 0.8,
      use_speaker_boost: true
    };
    
    switch (emotion) {
      case 'excited':
        return {
          ...baseSettings,
          stability: baseSettings.stability - 0.1, // More expressive
          similarity_boost: 0.9,
          style: 0.8,
          use_speaker_boost: true
        };
      case 'curious':
        return {
          ...baseSettings,
          stability: baseSettings.stability + 0.1, // More controlled
          similarity_boost: 0.75,
          style: 0.4,
          use_speaker_boost: true
        };
      case 'impressed':
        return {
          ...baseSettings,
          stability: baseSettings.stability,
          similarity_boost: 0.85,
          style: 0.6,
          use_speaker_boost: true
        };
      case 'thoughtful':
      default:
        return {
          ...baseSettings,
          stability: baseSettings.stability + 0.05,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        };
    }
  }
  
  /**
   * Calculate total duration
   */
  private calculateDuration(segments: Array<{ duration: number }>): string {
    const totalMs = segments.reduce((sum, seg) => sum + seg.duration, 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export const podcastGenerationService = new PodcastGenerationService();