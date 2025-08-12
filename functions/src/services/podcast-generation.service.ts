/**
 * Podcast Generation Service
 * Creates conversational podcasts using AI voices
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../config/environment';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
    
    this.elevenLabsApiKey = config.elevenLabs?.apiKey || process.env.ELEVENLABS_API_KEY || '';
    
    // Configure voices for conversational podcast
    this.voiceConfig = {
      host1: {
        voiceId: config.elevenLabs?.host1VoiceId || process.env.ELEVENLABS_HOST1_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
        name: 'Sarah',
        style: 'Professional podcast host'
      },
      host2: {
        voiceId: config.elevenLabs?.host2VoiceId || process.env.ELEVENLABS_HOST2_VOICE_ID || 'yoZ06aMxZJJ28mfd3POQ',
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
      const podcastUrl = await this.mergeAudioSegments(audioSegments, jobId);
      
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
    
    const targetWords = durationWords[options.duration || 'medium'];
    
    const prompt = `Create a natural, engaging podcast conversation between two hosts discussing this professional's career. The conversation should feel like a real podcast episode.

Host 1 (Sarah): Professional podcast host, asks insightful questions
Host 2 (Mike): Engaging co-host, adds color commentary and follow-up questions

Professional Profile:
Name: ${cv.personalInfo?.name || 'The candidate'}
Current Role: ${cv.experience?.[0]?.position || 'Professional'} at ${cv.experience?.[0]?.company || 'their company'}
Key Skills: ${cv.skills?.technical?.slice(0, 5).join(', ') || 'various skills'}
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
[SPEAKER]: Text

Include natural elements like:
- "Wow, that's fascinating!"
- "Can you tell us more about..."
- "What I find interesting is..."
- Laughter and reactions
- Natural interruptions and back-and-forth

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
        const text = match[2];
        
        // Detect emotion from text
        let emotion: 'excited' | 'curious' | 'thoughtful' | 'impressed' = 'thoughtful';
        if (text.includes('!') || text.toLowerCase().includes('wow') || text.toLowerCase().includes('amazing')) {
          emotion = 'excited';
        } else if (text.includes('?')) {
          emotion = 'curious';
        } else if (text.toLowerCase().includes('impressive') || text.toLowerCase().includes('excellent')) {
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
        // Call ElevenLabs API
        const response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            text: segment.text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: segment.emotion === 'excited' ? 0.8 : 0.5,
              use_speaker_boost: true
            }
          },
          {
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': this.elevenLabsApiKey,
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
        
        // Add pause if specified
        if (segment.pause && segment.pause > 200) {
          audioSegments.push({
            speaker: 'pause',
            audioBuffer: this.generateSilence(segment.pause),
            duration: segment.pause
          });
        }
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
    jobId: string
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
          // Generate silence file
          const silenceFile = path.join(tempDir, `silence-${i}.mp3`);
          await this.generateSilenceFile(segment.duration, silenceFile);
          tempFiles.push(silenceFile);
          listFileContent.push(`file '${silenceFile}'`);
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
        ffmpeg()
          .input(listFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .audioCodec('mp3')
          .audioBitrate('128k')
          .audioFrequency(44100)
          .audioChannels(2)
          .output(outputPath)
          .on('end', () => {
            console.log('Audio merging completed');
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(new Error(`Audio merging failed: ${err.message}`));
          })
          .run();
      });
      
      // Upload merged file to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `podcasts/${jobId}/career-podcast.mp3`;
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
      
      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
    } catch (error) {
      console.error('Error merging audio segments:', error);
      // Clean up temp files on error
      this.cleanupTempFiles([tempDir]);
      throw new Error(`Failed to merge audio segments: ${error}`);
    }
  }
  
  /**
   * Generate silence file using FFmpeg
   */
  private async generateSilenceFile(durationMs: number, outputPath: string): Promise<void> {
    const durationSeconds = durationMs / 1000;
    
    return new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputOptions(['-f', 'lavfi'])
        .audioCodec('mp3')
        .audioBitrate('128k')
        .duration(durationSeconds)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .run();
    });
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
        text: `Hey everyone! Today we have an fascinating professional to discuss - ${name}.`,
        emotion: 'excited'
      },
      {
        speaker: 'host1',
        text: `That's right! ${name} is currently working as ${role} at ${company}, and their journey is really inspiring.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `What caught my attention immediately was their diverse skill set. They're proficient in ${cv.skills?.technical?.slice(0, 3).join(', ') || 'multiple technologies'}.`,
        emotion: 'impressed'
      },
      {
        speaker: 'host1',
        text: `Absolutely! And if we look at their career progression, it's clear they've been consistently growing. They've worked at ${cv.experience?.length || 'several'} different companies.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `You know what really stands out to me? ${cv.experience?.[0]?.achievements?.[0] || 'Their ability to drive meaningful results'}.`,
        emotion: 'impressed'
      },
      {
        speaker: 'host1',
        text: `That's such a great point! It shows real leadership and initiative. What do you think makes them particularly effective in their role?`,
        emotion: 'curious'
      },
      {
        speaker: 'host2',
        text: `I think it's the combination of technical expertise and soft skills. They clearly understand not just the "how" but also the "why" behind their work.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host1',
        text: `Definitely. For our listeners who might be in similar fields, what key takeaways do you see from ${name}'s career journey?`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host2',
        text: `Great question! I'd say continuous learning is key. Look at their skill progression - they've stayed current with industry trends while building on their core expertise.`,
        emotion: 'thoughtful'
      },
      {
        speaker: 'host1',
        text: `That's excellent advice. Well, that wraps up today's Career Conversation about ${name}. Thanks for joining us!`,
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