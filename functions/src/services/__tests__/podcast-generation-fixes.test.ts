/**
 * Test suite for podcast generation ffmpeg fixes
 * Tests the enhanced error handling and validation
 */

import { PodcastGenerationService } from '../podcast-generation.service';
import { ParsedCV } from '../../types/enhanced-models';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({
      file: () => ({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined),
        name: 'test-bucket'
      }),
      name: 'test-bucket'
    })
  })
}));

jest.mock('openai');
jest.mock('axios');

describe('PodcastGenerationService - Enhanced Error Handling', () => {
  let service: PodcastGenerationService;
  let mockParsedCV: ParsedCV;

  beforeEach(() => {
    // Set required environment variables
    process.env.ELEVENLABS_API_KEY = 'test-api-key-1234567890';
    process.env.ELEVENLABS_HOST1_VOICE_ID = 'test-voice-1';
    process.env.ELEVENLABS_HOST2_VOICE_ID = 'test-voice-2';
    
    service = new PodcastGenerationService();
    
    mockParsedCV = {
      personalInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        address: 'Test City, TC'
      },
      experience: [{
        position: 'Senior Developer',
        company: 'Test Company',
        duration: '2020-2024',
        startDate: '2020-01-01',
        endDate: '2024-01-01',
        achievements: ['Led team of 5 developers', 'Increased performance by 40%']
      }],
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      education: [{
        degree: 'Computer Science',
        institution: 'Test University',
        field: 'Computer Science',
        graduationDate: '2020-01-01'
      }]
    };
  });

  afterEach(() => {
    // Clean up any temp files
    jest.clearAllMocks();
  });

  describe('mergeAudioSegments validation', () => {
    test('should validate empty segments array', async () => {
      const emptySegments: Array<{ speaker: string; audioBuffer: Buffer; duration: number; }> = [];
      
      await expect(
        (service as any).mergeAudioSegments(emptySegments, 'test-job', 'test-user')
      ).rejects.toThrow('No audio segments provided for merging');
    });

    test('should handle segments with empty audio buffers', async () => {
      const segmentsWithEmptyBuffer = [
        {
          speaker: 'host1',
          audioBuffer: Buffer.alloc(0), // Empty buffer
          duration: 5000
        }
      ];
      
      await expect(
        (service as any).mergeAudioSegments(segmentsWithEmptyBuffer, 'test-job', 'test-user')
      ).rejects.toThrow('No valid audio segments found after filtering');
    });

    test('should create temp directory with proper permissions', async () => {
      const mockSegments = [
        {
          speaker: 'host1',
          audioBuffer: Buffer.from('mock-audio-data'),
          duration: 5000
        }
      ];

      const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const statSyncSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as fs.Stats);
      const copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('output-audio'));

      try {
        await (service as any).mergeAudioSegments(mockSegments, 'test-job', 'test-user');
      } catch (error) {
        // Expected to fail due to missing ffmpeg, but we can check directory creation
      }

      expect(mkdirSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('podcast-test-job'),
        { recursive: true, mode: 0o755 }
      );

      mkdirSyncSpy.mockRestore();
      existsSyncSpy.mockRestore();
      writeFileSyncSpy.mockRestore();
      statSyncSpy.mockRestore();
      copyFileSyncSpy.mockRestore();
      readFileSyncSpy.mockRestore();
    });

    test('should validate file paths in filelist.txt', async () => {
      const mockSegments = [
        {
          speaker: 'host1',
          audioBuffer: Buffer.from('mock-audio-data'),
          duration: 5000
        }
      ];

      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        // Mock that temp dir and segment files exist
        return typeof filePath === 'string' && filePath.includes('podcast-test-job');
      });
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const statSyncSpy = jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1024 } as fs.Stats);
      const copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('output-audio'));

      try {
        await (service as any).mergeAudioSegments(mockSegments, 'test-job', 'test-user');
      } catch (error) {
        // Expected to fail, but we can verify file creation
      }

      // Check that filelist.txt is created with proper format
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('filelist.txt'),
        expect.stringContaining("file '"),
        { encoding: 'utf8', mode: 0o644 }
      );

      existsSyncSpy.mockRestore();
      writeFileSyncSpy.mockRestore();
      statSyncSpy.mockRestore();
      copyFileSyncSpy.mockRestore();
      readFileSyncSpy.mockRestore();
    });
  });

  describe('generateAudioSegments validation', () => {
    test('should validate empty script', async () => {
      const emptyScript = { segments: [], totalDuration: 0 };
      
      await expect(
        (service as any).generateAudioSegments(emptyScript)
      ).rejects.toThrow('No script segments provided for audio generation');
    });

    test('should handle segments with empty text', async () => {
      const scriptWithEmptyText = {
        segments: [
          { speaker: 'host1', text: '', emotion: 'thoughtful' },
          { speaker: 'host2', text: '   ', emotion: 'excited' }
        ],
        totalDuration: 5000
      };
      
      await expect(
        (service as any).generateAudioSegments(scriptWithEmptyText)
      ).rejects.toThrow('No audio segments were successfully generated');
    });

    test('should validate voice configuration', async () => {
      const script = {
        segments: [
          { speaker: 'host1', text: 'Hello world', emotion: 'thoughtful' }
        ],
        totalDuration: 5000
      };

      // Mock invalid voice config
      (service as any).voiceConfig = {
        host1: { voiceId: '', name: 'Test', style: 'Test' },
        host2: { voiceId: 'valid-id', name: 'Test', style: 'Test' }
      };
      
      await expect(
        (service as any).generateAudioSegments(script)
      ).rejects.toThrow('No audio segments were successfully generated');
    });
  });

  describe('cleanupTempFiles', () => {
    test('should handle empty file paths array', () => {
      expect(() => {
        (service as any).cleanupTempFiles([]);
      }).not.toThrow();
    });

    test('should handle invalid file paths', () => {
      const invalidPaths = ['', null, undefined];
      
      expect(() => {
        (service as any).cleanupTempFiles(invalidPaths);
      }).not.toThrow();
    });

    test('should handle file deletion errors gracefully', () => {
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const lstatSyncSpy = jest.spyOn(fs, 'lstatSync').mockReturnValue({ isFile: () => true, isDirectory: () => false } as fs.Stats);
      const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        (service as any).cleanupTempFiles(['/tmp/test-file.mp3']);
      }).not.toThrow();

      existsSyncSpy.mockRestore();
      lstatSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
    });
  });

  describe('estimateAudioDuration', () => {
    test('should handle empty text', () => {
      const duration = (service as any).estimateAudioDuration('');
      expect(duration).toBe(1000); // 1 second minimum
    });

    test('should handle null or undefined text', () => {
      const duration1 = (service as any).estimateAudioDuration(null);
      const duration2 = (service as any).estimateAudioDuration(undefined);
      
      expect(duration1).toBe(1000);
      expect(duration2).toBe(1000);
    });

    test('should calculate reasonable duration for normal text', () => {
      const text = 'This is a test sentence with about ten words.';
      const duration = (service as any).estimateAudioDuration(text);
      
      // Should be between 2-8 seconds for 10 words
      expect(duration).toBeGreaterThan(2000);
      expect(duration).toBeLessThan(8000);
    });

    test('should enforce maximum duration limit', () => {
      const longText = 'word '.repeat(1000); // Very long text
      const duration = (service as any).estimateAudioDuration(longText);
      
      expect(duration).toBeLessThanOrEqual(60000); // Max 60 seconds
    });
  });

  describe('validateEnvironment', () => {
    test('should validate API key presence', async () => {
      // Clear API key
      delete process.env.ELEVENLABS_API_KEY;
      const serviceWithoutKey = new PodcastGenerationService();
      
      await expect(
        (serviceWithoutKey as any).validateEnvironment()
      ).rejects.toThrow('ElevenLabs API key is missing or invalid');
    });

    test('should validate voice configuration', async () => {
      process.env.ELEVENLABS_API_KEY = 'valid-api-key-1234567890';
      delete process.env.ELEVENLABS_HOST1_VOICE_ID;
      
      const serviceWithoutVoice = new PodcastGenerationService();
      
      await expect(
        (serviceWithoutVoice as any).validateEnvironment()
      ).rejects.toThrow('Voice configuration is incomplete');
    });
  });
});