import { PluginManager } from '../../src/services/PluginManager.js';
import { Plugin, PluginMetadata, PluginManifest, HookEvent } from '../../src/types/plugin.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock path
jest.mock('path');
const mockPath = path as jest.Mocked<typeof path>;

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockPlugin: Plugin;

  beforeEach(() => {
    pluginManager = new PluginManager({
      pluginDirs: ['./test-plugins'],
      autoLoad: false,
      autoActivate: false
    });

    // Setup default mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Create mock plugin
    mockPlugin = {
      metadata: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        tags: ['test'],
        umrVersion: '^1.0.0'
      },
      capabilities: {
        validationRules: [{
          rule: {
            id: 'test-rule',
            name: 'Test Rule',
            description: 'A test validation rule',
            severity: 'warning',
            validate: jest.fn()
          },
          priority: 100
        }],
        hooks: [{
          event: 'validation:before',
          priority: 50,
          handler: jest.fn().mockResolvedValue({ continue: true })
        }]
      },
      lifecycle: {
        onLoad: jest.fn(),
        onActivate: jest.fn(),
        onDeactivate: jest.fn(),
        onUnload: jest.fn()
      }
    };

    jest.clearAllMocks();
  });

  describe('discoverPlugins', () => {
    it('should discover plugins in configured directories', async () => {
      // Mock directory structure
      mockFs.access.mockResolvedValueOnce(undefined); // Directory exists
      mockFs.readdir.mockResolvedValueOnce([
        { name: 'plugin1', isDirectory: () => true } as any,
        { name: 'plugin2', isDirectory: () => true } as any,
        { name: 'file.txt', isDirectory: () => false } as any
      ]);

      // Mock plugin manifests
      const mockManifest: PluginManifest = {
        metadata: {
          id: 'discovered-plugin',
          name: 'Discovered Plugin',
          version: '1.0.0',
          description: 'A discovered plugin',
          author: 'Author',
          tags: ['test'],
          umrVersion: '^1.0.0'
        },
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest));
      mockFs.access.mockResolvedValue(undefined); // Entry point exists

      const result = await pluginManager.discoverPlugins();

      expect(result).toBeDefined();
      expect(result.plugins).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.directoriesScanned).toBe(1);
      expect(result.metadata.scanDuration).toBeGreaterThan(0);
    });

    it('should handle directory access errors', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await pluginManager.discoverPlugins();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Permission denied');
    });

    it('should handle malformed plugin manifests', async () => {
      mockFs.access.mockResolvedValueOnce(undefined);
      mockFs.readdir.mockResolvedValueOnce([
        { name: 'bad-plugin', isDirectory: () => true } as any
      ]);
      mockFs.readFile.mockResolvedValueOnce('{ invalid json');

      const result = await pluginManager.discoverPlugins();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toContain('bad-plugin');
    });

    it('should fallback to package.json for plugin metadata', async () => {
      mockFs.access.mockResolvedValueOnce(undefined);
      mockFs.readdir.mockResolvedValueOnce([
        { name: 'npm-plugin', isDirectory: () => true } as any
      ]);

      // First readFile call for plugin.json fails
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      // Second readFile call for package.json succeeds
      const packageJson = {
        name: 'npm-plugin',
        main: 'index.js',
        umrPlugin: {
          metadata: {
            id: 'npm-plugin',
            name: 'NPM Plugin',
            version: '1.0.0',
            description: 'Plugin from NPM',
            author: 'NPM Author',
            tags: ['npm'],
            umrVersion: '^1.0.0'
          }
        }
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(packageJson));
      mockFs.access.mockResolvedValueOnce(undefined); // Entry point exists

      const result = await pluginManager.discoverPlugins();

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].metadata.name).toBe('NPM Plugin');
    });
  });

  describe('loadPlugin', () => {
    it('should load a valid plugin', async () => {
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined); // Entry point exists

      // Mock dynamic import
      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      const pluginId = await pluginManager.loadPlugin(pluginPath);

      expect(pluginId).toBe(mockPlugin.metadata.id);
      expect(mockPlugin.lifecycle.onLoad).toHaveBeenCalled();

      const loadedPlugin = pluginManager.getPlugin(pluginId);
      expect(loadedPlugin).toBeDefined();
      expect(loadedPlugin?.status).toBe('loaded');
    });

    it('should fail to load plugin without manifest', async () => {
      const pluginPath = './test-plugins/no-manifest';
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(pluginManager.loadPlugin(pluginPath)).rejects.toThrow('Plugin manifest not found');
    });

    it('should fail to load plugin with invalid structure', async () => {
      const pluginPath = './test-plugins/invalid-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      // Mock import returning invalid plugin
      const invalidPlugin = { metadata: null };
      const mockImport = jest.fn().mockResolvedValue(invalidPlugin);
      (global as any).import = mockImport;

      await expect(pluginManager.loadPlugin(pluginPath)).rejects.toThrow('Invalid plugin structure');
    });

    it('should handle plugin load errors', async () => {
      const pluginPath = './test-plugins/error-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      // Mock import error
      const mockImport = jest.fn().mockRejectedValue(new Error('Import failed'));
      (global as any).import = mockImport;

      await expect(pluginManager.loadPlugin(pluginPath)).rejects.toThrow('Failed to load plugin');
    });
  });

  describe('activatePlugin', () => {
    beforeEach(async () => {
      // Load plugin first
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      await pluginManager.loadPlugin(pluginPath);
    });

    it('should activate a loaded plugin', async () => {
      await pluginManager.activatePlugin(mockPlugin.metadata.id);

      expect(mockPlugin.lifecycle.onActivate).toHaveBeenCalled();

      const plugin = pluginManager.getPlugin(mockPlugin.metadata.id);
      expect(plugin?.status).toBe('active');
      expect(plugin?.activatedAt).toBeInstanceOf(Date);
    });

    it('should fail to activate non-existent plugin', async () => {
      await expect(pluginManager.activatePlugin('non-existent')).rejects.toThrow('Plugin not found');
    });

    it('should fail to activate plugin not in loaded state', async () => {
      // First activate the plugin
      await pluginManager.activatePlugin(mockPlugin.metadata.id);

      // Try to activate again
      await expect(pluginManager.activatePlugin(mockPlugin.metadata.id)).rejects.toThrow('Plugin not in loaded state');
    });

    it('should handle activation errors', async () => {
      // Mock onActivate to throw error
      mockPlugin.lifecycle.onActivate = jest.fn().mockRejectedValue(new Error('Activation failed'));

      await expect(pluginManager.activatePlugin(mockPlugin.metadata.id)).rejects.toThrow('Activation failed');

      const plugin = pluginManager.getPlugin(mockPlugin.metadata.id);
      expect(plugin?.status).toBe('error');
      expect(plugin?.error).toBeInstanceOf(Error);
    });
  });

  describe('deactivatePlugin', () => {
    beforeEach(async () => {
      // Load and activate plugin first
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      await pluginManager.loadPlugin(pluginPath);
      await pluginManager.activatePlugin(mockPlugin.metadata.id);
    });

    it('should deactivate an active plugin', async () => {
      await pluginManager.deactivatePlugin(mockPlugin.metadata.id);

      expect(mockPlugin.lifecycle.onDeactivate).toHaveBeenCalled();

      const plugin = pluginManager.getPlugin(mockPlugin.metadata.id);
      expect(plugin?.status).toBe('loaded');
      expect(plugin?.activatedAt).toBeUndefined();
    });

    it('should fail to deactivate non-active plugin', async () => {
      // Deactivate first
      await pluginManager.deactivatePlugin(mockPlugin.metadata.id);

      // Try to deactivate again
      await expect(pluginManager.deactivatePlugin(mockPlugin.metadata.id)).rejects.toThrow('Plugin not active');
    });
  });

  describe('unloadPlugin', () => {
    beforeEach(async () => {
      // Load plugin first
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      await pluginManager.loadPlugin(pluginPath);
    });

    it('should unload a loaded plugin', async () => {
      await pluginManager.unloadPlugin(mockPlugin.metadata.id);

      expect(mockPlugin.lifecycle.onUnload).toHaveBeenCalled();
      expect(pluginManager.getPlugin(mockPlugin.metadata.id)).toBeUndefined();
    });

    it('should deactivate and unload an active plugin', async () => {
      await pluginManager.activatePlugin(mockPlugin.metadata.id);
      await pluginManager.unloadPlugin(mockPlugin.metadata.id);

      expect(mockPlugin.lifecycle.onDeactivate).toHaveBeenCalled();
      expect(mockPlugin.lifecycle.onUnload).toHaveBeenCalled();
      expect(pluginManager.getPlugin(mockPlugin.metadata.id)).toBeUndefined();
    });
  });

  describe('executeHooks', () => {
    beforeEach(async () => {
      // Load and activate plugin with hooks
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      await pluginManager.loadPlugin(pluginPath);
      await pluginManager.activatePlugin(mockPlugin.metadata.id);
    });

    it('should execute hooks for an event', async () => {
      const testData = { test: 'data' };
      const result = await pluginManager.executeHooks('validation:before', testData);

      expect(mockPlugin.capabilities.hooks![0].handler).toHaveBeenCalledWith(
        testData,
        expect.any(Object) // Plugin context
      );
      expect(result).toEqual(testData);
    });

    it('should handle hook execution errors gracefully', async () => {
      // Mock hook to throw error
      const errorHook = mockPlugin.capabilities.hooks![0];
      (errorHook.handler as jest.Mock).mockRejectedValueOnce(new Error('Hook error'));

      const testData = { test: 'data' };

      // Should not throw, but log error
      const result = await pluginManager.executeHooks('validation:before', testData);
      expect(result).toEqual(testData);
    });

    it('should stop hook chain when continue: false is returned', async () => {
      // Add second plugin with hook
      const secondPlugin = {
        ...mockPlugin,
        metadata: { ...mockPlugin.metadata, id: 'second-plugin' },
        capabilities: {
          hooks: [{
            event: 'validation:before' as HookEvent,
            priority: 25, // Lower priority
            handler: jest.fn().mockResolvedValue({ continue: true })
          }]
        }
      };

      // Mock first hook to return continue: false
      (mockPlugin.capabilities.hooks![0].handler as jest.Mock).mockResolvedValueOnce({
        continue: false
      });

      const testData = { test: 'data' };
      await pluginManager.executeHooks('validation:before', testData);

      // Second hook should not be called due to continue: false
      expect(mockPlugin.capabilities.hooks![0].handler).toHaveBeenCalled();
    });

    it('should modify data through hook chain', async () => {
      const modifiedData = { test: 'modified' };
      (mockPlugin.capabilities.hooks![0].handler as jest.Mock).mockResolvedValueOnce({
        continue: true,
        data: modifiedData
      });

      const testData = { test: 'original' };
      const result = await pluginManager.executeHooks('validation:before', testData);

      expect(result).toEqual(modifiedData);
    });
  });

  describe('getPlugins', () => {
    it('should return empty array when no plugins loaded', () => {
      const plugins = pluginManager.getPlugins();
      expect(plugins).toHaveLength(0);
    });

    it('should return all loaded plugins', async () => {
      // Load a plugin
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      await pluginManager.loadPlugin(pluginPath);

      const plugins = pluginManager.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].plugin.metadata.id).toBe(mockPlugin.metadata.id);
    });
  });

  describe('getActivePlugins', () => {
    it('should return only active plugins', async () => {
      // Load and activate plugin
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      await pluginManager.loadPlugin(pluginPath);

      // Should be 0 when loaded but not active
      expect(pluginManager.getActivePlugins()).toHaveLength(0);

      await pluginManager.activatePlugin(mockPlugin.metadata.id);

      // Should be 1 when active
      expect(pluginManager.getActivePlugins()).toHaveLength(1);

      await pluginManager.deactivatePlugin(mockPlugin.metadata.id);

      // Should be 0 again when deactivated
      expect(pluginManager.getActivePlugins()).toHaveLength(0);
    });
  });

  describe('plugin context creation', () => {
    it('should create plugin context with proper interfaces', async () => {
      // Load plugin to trigger context creation
      const pluginPath = './test-plugins/test-plugin';
      const manifest: PluginManifest = {
        metadata: mockPlugin.metadata,
        main: 'index.js'
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(manifest));
      mockFs.access.mockResolvedValueOnce(undefined);

      const mockImport = jest.fn().mockResolvedValue(mockPlugin);
      (global as any).import = mockImport;

      await pluginManager.loadPlugin(pluginPath);

      const plugin = pluginManager.getPlugin(mockPlugin.metadata.id);
      expect(plugin).toBeDefined();

      const context = plugin!.context;
      expect(context.metadata).toEqual(mockPlugin.metadata);
      expect(context.config).toBeDefined();
      expect(context.logger).toBeDefined();
      expect(context.events).toBeDefined();
      expect(context.storage).toBeDefined();
      expect(context.api).toBeDefined();

      // Test logger functionality
      expect(typeof context.logger.info).toBe('function');
      expect(typeof context.logger.error).toBe('function');

      // Test storage functionality
      await context.storage.set('test-key', 'test-value');
      const value = await context.storage.get('test-key');
      expect(value).toBe('test-value');

      const keys = await context.storage.keys();
      expect(keys).toContain('test-key');

      await context.storage.delete('test-key');
      const deletedValue = await context.storage.get('test-key');
      expect(deletedValue).toBeNull();
    });
  });
});