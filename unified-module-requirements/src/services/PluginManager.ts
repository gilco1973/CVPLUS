/**
 * Plugin Manager Service
 *
 * Core service for managing the plugin system lifecycle, including
 * discovery, loading, activation, and execution of plugins.
 */

import {
  Plugin,
  PluginRegistryEntry,
  PluginContext,
  PluginManagerConfig,
  PluginDiscoveryResult,
  PluginValidationResult,
  PluginManifest,
  PluginInstallOptions,
  HookEvent,
  HookResult,
  PluginLogger,
  PluginEventEmitter,
  PluginStorage,
  PluginApiAccess
} from '../types/plugin.js';
import { ValidationRule } from '../types/validation.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

export class PluginManager {
  private registry: Map<string, PluginRegistryEntry> = new Map();
  private config: PluginManagerConfig;
  private eventEmitter: EventEmitter = new EventEmitter();
  private hooks: Map<HookEvent, Array<{ pluginId: string; handler: Function; priority: number }>> = new Map();
  private validationRules: Map<string, ValidationRule> = new Map();

  constructor(config: Partial<PluginManagerConfig> = {}) {
    this.config = {
      pluginDirs: ['./plugins', './node_modules/@umr'],
      autoLoad: true,
      autoActivate: true,
      loadTimeout: 30000,
      maxConcurrency: 5,
      allowUnsafe: false,
      security: {
        allowedSources: ['local', 'npm'],
        requireSigning: false,
        sandboxed: false,
        resourceLimits: {
          maxMemory: 256 * 1024 * 1024, // 256MB
          maxCpu: 100, // 100% CPU
          maxFileAccess: ['./']
        }
      },
      ...config
    };

    this.initializeHookEvents();
  }

  /**
   * Initialize hook event maps
   */
  private initializeHookEvents(): void {
    const hookEvents: HookEvent[] = [
      'validation:before',
      'validation:after',
      'validation:rule:before',
      'validation:rule:after',
      'report:before',
      'report:after',
      'autofix:before',
      'autofix:after',
      'security:scan:before',
      'security:scan:after',
      'performance:analyze:before',
      'performance:analyze:after',
      'cli:command:before',
      'cli:command:after'
    ];

    hookEvents.forEach(event => {
      this.hooks.set(event, []);
    });
  }

  /**
   * Discover plugins in configured directories
   */
  async discoverPlugins(): Promise<PluginDiscoveryResult> {
    const startTime = Date.now();
    const result: PluginDiscoveryResult = {
      plugins: [],
      errors: [],
      metadata: {
        scanDuration: 0,
        directoriesScanned: 0,
        filesScanned: 0
      }
    };

    for (const pluginDir of this.config.pluginDirs) {
      try {
        await fs.access(pluginDir);
        result.metadata.directoriesScanned++;

        const dirResults = await this.scanDirectory(pluginDir);
        result.plugins.push(...dirResults.plugins);
        result.errors.push(...dirResults.errors);
        result.metadata.filesScanned += dirResults.filesScanned;
      } catch (error) {
        result.errors.push({
          path: pluginDir,
          message: `Directory not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    result.metadata.scanDuration = Date.now() - startTime;
    return result;
  }

  /**
   * Scan a single directory for plugins
   */
  private async scanDirectory(dirPath: string): Promise<{
    plugins: any[];
    errors: any[];
    filesScanned: number;
  }> {
    const plugins: any[] = [];
    const errors: any[] = [];
    let filesScanned = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = path.join(dirPath, entry.name);
          try {
            const manifest = await this.loadPluginManifest(subDirPath);
            if (manifest) {
              const plugin = await this.validatePluginStructure(subDirPath, manifest);
              plugins.push(plugin);
            }
          } catch (error) {
            errors.push({
              path: subDirPath,
              message: `Failed to load plugin: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
          filesScanned++;
        }
      }
    } catch (error) {
      errors.push({
        path: dirPath,
        message: `Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return { plugins, errors, filesScanned };
  }

  /**
   * Load plugin manifest file
   */
  private async loadPluginManifest(pluginPath: string): Promise<PluginManifest | null> {
    const manifestPath = path.join(pluginPath, 'plugin.json');

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // Validate required fields
      if (!manifest.metadata || !manifest.main) {
        throw new Error('Invalid manifest: missing required fields');
      }

      return manifest;
    } catch (error) {
      // Try package.json as fallback
      const packageJsonPath = path.join(pluginPath, 'package.json');
      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);

        if (packageJson.umrPlugin) {
          return {
            metadata: packageJson.umrPlugin.metadata || packageJson,
            main: packageJson.main || 'index.js',
            capabilities: packageJson.umrPlugin.capabilities,
            configSchema: packageJson.umrPlugin.configSchema,
            permissions: packageJson.umrPlugin.permissions,
            resources: packageJson.umrPlugin.resources
          };
        }
      } catch {
        // Ignore package.json errors
      }

      return null;
    }
  }

  /**
   * Validate plugin structure
   */
  private async validatePluginStructure(pluginPath: string, manifest: PluginManifest): Promise<any> {
    const entryPointPath = path.join(pluginPath, manifest.main);

    // Check if entry point exists
    try {
      await fs.access(entryPointPath);
    } catch {
      throw new Error(`Entry point not found: ${manifest.main}`);
    }

    return {
      path: pluginPath,
      metadata: manifest.metadata,
      manifestPath: path.join(pluginPath, 'plugin.json'),
      entryPoint: manifest.main,
      valid: true,
      errors: []
    };
  }

  /**
   * Load a plugin from path
   */
  async loadPlugin(pluginPath: string): Promise<string> {
    const manifest = await this.loadPluginManifest(pluginPath);
    if (!manifest) {
      throw new Error('Plugin manifest not found');
    }

    const validation = await this.validatePlugin(pluginPath, manifest);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
    }

    const entryPointPath = path.join(pluginPath, manifest.main);

    try {
      // Import the plugin module
      const pluginModule = await import(entryPointPath);
      const pluginInstance: Plugin = pluginModule.default || pluginModule;

      if (!pluginInstance.metadata || !pluginInstance.capabilities || !pluginInstance.lifecycle) {
        throw new Error('Invalid plugin structure');
      }

      // Create plugin context
      const context = this.createPluginContext(pluginInstance, manifest);

      // Create registry entry
      const entry: PluginRegistryEntry = {
        plugin: pluginInstance,
        status: 'loaded',
        context,
        loadedAt: new Date()
      };

      this.registry.set(pluginInstance.metadata.id, entry);

      // Execute onLoad lifecycle hook
      if (pluginInstance.lifecycle.onLoad) {
        await pluginInstance.lifecycle.onLoad(context);
      }

      this.eventEmitter.emit('plugin:loaded', pluginInstance);
      return pluginInstance.metadata.id;
    } catch (error) {
      throw new Error(`Failed to load plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Activate a loaded plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.status !== 'loaded') {
      throw new Error(`Plugin not in loaded state: ${entry.status}`);
    }

    try {
      entry.status = 'activating';

      // Register plugin capabilities
      await this.registerPluginCapabilities(entry);

      // Execute onActivate lifecycle hook
      if (entry.plugin.lifecycle.onActivate) {
        await entry.plugin.lifecycle.onActivate(entry.context);
      }

      entry.status = 'active';
      entry.activatedAt = new Date();

      this.eventEmitter.emit('plugin:activated', entry.plugin);
    } catch (error) {
      entry.status = 'error';
      entry.error = error instanceof Error ? error : new Error('Unknown error');
      this.eventEmitter.emit('plugin:error', entry.plugin, entry.error);
      throw error;
    }
  }

  /**
   * Deactivate an active plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.status !== 'active') {
      throw new Error(`Plugin not active: ${entry.status}`);
    }

    try {
      entry.status = 'deactivating';

      // Unregister plugin capabilities
      await this.unregisterPluginCapabilities(entry);

      // Execute onDeactivate lifecycle hook
      if (entry.plugin.lifecycle.onDeactivate) {
        await entry.plugin.lifecycle.onDeactivate(entry.context);
      }

      entry.status = 'loaded';
      delete entry.activatedAt;

      this.eventEmitter.emit('plugin:deactivated', entry.plugin);
    } catch (error) {
      entry.status = 'error';
      entry.error = error instanceof Error ? error : new Error('Unknown error');
      this.eventEmitter.emit('plugin:error', entry.plugin, entry.error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Deactivate if active
    if (entry.status === 'active') {
      await this.deactivatePlugin(pluginId);
    }

    try {
      // Execute onUnload lifecycle hook
      if (entry.plugin.lifecycle.onUnload) {
        await entry.plugin.lifecycle.onUnload(entry.context);
      }

      this.registry.delete(pluginId);
      this.eventEmitter.emit('plugin:unloaded', entry.plugin);
    } catch (error) {
      entry.status = 'error';
      entry.error = error instanceof Error ? error : new Error('Unknown error');
      this.eventEmitter.emit('plugin:error', entry.plugin, entry.error);
      throw error;
    }
  }

  /**
   * Execute hooks for an event
   */
  async executeHooks(event: HookEvent, data: any): Promise<any> {
    const eventHooks = this.hooks.get(event) || [];

    // Sort by priority (higher first)
    const sortedHooks = eventHooks.sort((a, b) => b.priority - a.priority);

    let currentData = data;

    for (const hook of sortedHooks) {
      try {
        const result: HookResult = await hook.handler(currentData, this.getPluginContext(hook.pluginId));

        if (result.continue === false) {
          break;
        }

        if (result.data !== undefined) {
          currentData = result.data;
        }
      } catch (error) {
        console.error(`Hook execution failed for plugin ${hook.pluginId}:`, error);
      }
    }

    return currentData;
  }

  /**
   * Get list of all plugins
   */
  getPlugins(): PluginRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginRegistryEntry | undefined {
    return this.registry.get(pluginId);
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): PluginRegistryEntry[] {
    return this.getPlugins().filter(entry => entry.status === 'active');
  }

  /**
   * Install plugin from source
   */
  async installPlugin(options: PluginInstallOptions): Promise<string> {
    // Implementation would depend on installation source
    throw new Error('Plugin installation not implemented');
  }

  /**
   * Validate plugin security and structure
   */
  private async validatePlugin(pluginPath: string, manifest: PluginManifest): Promise<PluginValidationResult> {
    const result: PluginValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      security: {
        score: 100,
        issues: [],
        recommendations: []
      }
    };

    // Basic structure validation
    if (!manifest.metadata.id) {
      result.errors.push('Plugin ID is required');
    }

    if (!manifest.metadata.version) {
      result.errors.push('Plugin version is required');
    }

    if (!manifest.main) {
      result.errors.push('Plugin entry point is required');
    }

    // Security validation would go here
    // ...

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Create plugin execution context
   */
  private createPluginContext(plugin: Plugin, manifest: PluginManifest): PluginContext {
    return {
      metadata: plugin.metadata,
      config: {}, // Would load from configuration
      logger: this.createPluginLogger(plugin.metadata.id),
      events: this.createPluginEventEmitter(plugin.metadata.id),
      storage: this.createPluginStorage(plugin.metadata.id),
      api: this.createPluginApiAccess()
    };
  }

  /**
   * Create plugin logger
   */
  private createPluginLogger(pluginId: string): PluginLogger {
    return {
      debug: (message, meta) => console.debug(`[${pluginId}] ${message}`, meta),
      info: (message, meta) => console.info(`[${pluginId}] ${message}`, meta),
      warn: (message, meta) => console.warn(`[${pluginId}] ${message}`, meta),
      error: (message, meta) => console.error(`[${pluginId}] ${message}`, meta)
    };
  }

  /**
   * Create plugin event emitter
   */
  private createPluginEventEmitter(pluginId: string): PluginEventEmitter {
    return {
      on: (event, listener) => this.eventEmitter.on(`${pluginId}:${event}`, listener),
      off: (event, listener) => this.eventEmitter.off(`${pluginId}:${event}`, listener),
      emit: (event, ...args) => this.eventEmitter.emit(`${pluginId}:${event}`, ...args)
    };
  }

  /**
   * Create plugin storage interface
   */
  private createPluginStorage(pluginId: string): PluginStorage {
    const storage = new Map<string, any>();

    return {
      get: async (key) => storage.get(`${pluginId}:${key}`) || null,
      set: async (key, value) => { storage.set(`${pluginId}:${key}`, value); },
      delete: async (key) => { storage.delete(`${pluginId}:${key}`); },
      clear: async () => {
        for (const key of storage.keys()) {
          if (key.startsWith(`${pluginId}:`)) {
            storage.delete(key);
          }
        }
      },
      keys: async () => {
        return Array.from(storage.keys())
          .filter(key => key.startsWith(`${pluginId}:`))
          .map(key => key.substring(pluginId.length + 1));
      }
    };
  }

  /**
   * Create plugin API access
   */
  private createPluginApiAccess(): PluginApiAccess {
    return {
      validation: {
        validate: async (modulePath, rules) => {
          // Would integrate with ValidationService
          return [];
        },
        registerRule: (rule) => {
          this.validationRules.set(rule.id, rule);
        }
      },
      reporting: {
        generateReport: async (results, format) => {
          // Would integrate with ReportingService
          return '';
        }
      },
      fs: {
        readFile: async (path) => fs.readFile(path, 'utf-8'),
        writeFile: async (path, content) => fs.writeFile(path, content),
        exists: async (path) => {
          try {
            await fs.access(path);
            return true;
          } catch {
            return false;
          }
        },
        glob: async (pattern, cwd) => {
          // Would implement glob functionality
          return [];
        }
      }
    };
  }

  /**
   * Register plugin capabilities
   */
  private async registerPluginCapabilities(entry: PluginRegistryEntry): Promise<void> {
    const { plugin } = entry;
    const { capabilities } = plugin;

    // Register validation rules
    if (capabilities.validationRules) {
      for (const ruleExt of capabilities.validationRules) {
        this.validationRules.set(ruleExt.rule.id, ruleExt.rule);
      }
    }

    // Register hooks
    if (capabilities.hooks) {
      for (const hookExt of capabilities.hooks) {
        const eventHooks = this.hooks.get(hookExt.event) || [];
        eventHooks.push({
          pluginId: plugin.metadata.id,
          handler: hookExt.handler,
          priority: hookExt.priority || 0
        });
        this.hooks.set(hookExt.event, eventHooks);
      }
    }

    // Register CLI commands, report generators, etc. would go here
  }

  /**
   * Unregister plugin capabilities
   */
  private async unregisterPluginCapabilities(entry: PluginRegistryEntry): Promise<void> {
    const { plugin } = entry;

    // Remove validation rules
    if (plugin.capabilities.validationRules) {
      for (const ruleExt of plugin.capabilities.validationRules) {
        this.validationRules.delete(ruleExt.rule.id);
      }
    }

    // Remove hooks
    if (plugin.capabilities.hooks) {
      for (const hookExt of plugin.capabilities.hooks) {
        const eventHooks = this.hooks.get(hookExt.event) || [];
        const filtered = eventHooks.filter(h => h.pluginId !== plugin.metadata.id);
        this.hooks.set(hookExt.event, filtered);
      }
    }
  }

  /**
   * Get plugin context by ID
   */
  private getPluginContext(pluginId: string): PluginContext {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    return entry.context;
  }
}