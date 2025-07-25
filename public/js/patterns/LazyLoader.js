/**
 * LazyLoader - Advanced module lazy loading with caching and error handling
 * Provides optimized module loading with performance tracking
 */
import { performanceMonitor } from '../services/PerformanceMonitor.js';

export class LazyLoader {
  constructor() {
    this.moduleCache = new Map();
    this.loadingPromises = new Map();
    this.moduleRegistry = new Map();
    this.loadOrder = [];
    this.statistics = {
      totalLoads: 0,
      cacheHits: 0,
      loadFailures: 0,
      averageLoadTime: 0
    };
  }

  /**
   * Register a module for lazy loading
   * @param {string} moduleName - Unique module identifier
   * @param {Function} moduleLoader - Function that returns import() promise
   * @param {Object} options - Loading options
   */
  register(moduleName, moduleLoader, options = {}) {
    this.moduleRegistry.set(moduleName, {
      loader: moduleLoader,
      priority: options.priority || 0,
      dependencies: options.dependencies || [],
      preload: options.preload || false,
      critical: options.critical || false
    });

    // Auto-preload critical modules
    if (options.preload) {
      this.preloadModule(moduleName);
    }
  }

  /**
   * Load a module with caching and dependency resolution
   * @param {string} moduleName - Module to load
   * @param {Object} options - Loading options
   */
  async load(moduleName, options = {}) {
    // Check cache first
    if (this.moduleCache.has(moduleName)) {
      this.statistics.cacheHits++;
      return this.moduleCache.get(moduleName);
    }

    // Check if already loading
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // Get module configuration
    const moduleConfig = this.moduleRegistry.get(moduleName);
    if (!moduleConfig) {
      throw new Error(`Module '${moduleName}' not registered for lazy loading`);
    }

    // Load dependencies first
    if (moduleConfig.dependencies.length > 0) {
      await this.loadDependencies(moduleConfig.dependencies);
    }

    // Create loading promise
    const loadingPromise = this.performModuleLoad(moduleName, moduleConfig, options);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const moduleExports = await loadingPromise;
      
      // Cache the result
      this.moduleCache.set(moduleName, moduleExports);
      this.loadOrder.push({
        name: moduleName,
        timestamp: Date.now(),
        fromCache: false
      });
      
      this.statistics.totalLoads++;
      
      return moduleExports;
    } catch (error) {
      this.statistics.loadFailures++;
      console.error(`Failed to load module '${moduleName}':`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(moduleName);
    }
  }

  /**
   * Perform the actual module loading with performance tracking
   */
  async performModuleLoad(moduleName, moduleConfig, options) {
    const loadStart = performance.now();
    
    try {
      // Track module loading with performance monitor
      const moduleExports = await performanceMonitor.trackModuleLoad(
        moduleName,
        moduleConfig.loader()
      );
      
      const loadTime = performance.now() - loadStart;
      this.updateLoadTimeStatistics(loadTime);
      
      // Handle different export patterns
      if (moduleExports.default) {
        return moduleExports.default;
      }
      
      return moduleExports;
    } catch (error) {
      console.error(`Module load error for '${moduleName}':`, error);
      throw new Error(`Failed to load module '${moduleName}': ${error.message}`);
    }
  }

  /**
   * Load module dependencies
   */
  async loadDependencies(dependencies) {
    const dependencyPromises = dependencies.map(dep => this.load(dep));
    await Promise.all(dependencyPromises);
  }

  /**
   * Preload a module without blocking
   */
  async preloadModule(moduleName) {
    try {
      await this.load(moduleName);
      console.log(`Module '${moduleName}' preloaded successfully`);
    } catch (error) {
      console.warn(`Failed to preload module '${moduleName}':`, error);
    }
  }

  /**
   * Preload multiple modules with priority ordering
   */
  async preloadModules(moduleNames, options = {}) {
    const { concurrent = 3 } = options;
    
    // Sort by priority if registered
    const sortedModules = moduleNames.sort((a, b) => {
      const configA = this.moduleRegistry.get(a);
      const configB = this.moduleRegistry.get(b);
      return (configB?.priority || 0) - (configA?.priority || 0);
    });

    // Load in batches to avoid overwhelming the browser
    for (let i = 0; i < sortedModules.length; i += concurrent) {
      const batch = sortedModules.slice(i, i + concurrent);
      const batchPromises = batch.map(moduleName => 
        this.preloadModule(moduleName).catch(err => ({
          moduleName,
          error: err
        }))
      );
      
      const results = await Promise.allSettled(batchPromises);
      const failures = results
        .filter(result => result.status === 'rejected' || result.value?.error)
        .map(result => result.value?.moduleName || 'unknown');
      
      if (failures.length > 0) {
        console.warn(`Preload batch failed for modules:`, failures);
      }
    }
  }

  /**
   * Load modules based on user interaction context
   */
  async loadForContext(context, modules = []) {
    const contextModules = this.getModulesForContext(context);
    const allModules = [...contextModules, ...modules];
    
    if (allModules.length === 0) {
      return {};
    }

    console.log(`Loading modules for context '${context}':`, allModules);
    
    const loadPromises = allModules.map(async moduleName => {
      try {
        const moduleExports = await this.load(moduleName);
        return { [moduleName]: moduleExports };
      } catch (error) {
        console.error(`Context load failed for ${moduleName}:`, error);
        return { [moduleName]: null };
      }
    });

    const results = await Promise.all(loadPromises);
    return Object.assign({}, ...results);
  }

  /**
   * Get modules associated with a context
   */
  getModulesForContext(context) {
    const contextMap = {
      'game-start': ['GameRenderer', 'InputController', 'UIManager'],
      'combat': ['CombatResolver', 'AttackCommand', 'HealthDisplay'],
      'building': ['BuildCommand', 'BuildPanelSidebar', 'ResourceValidator'],
      'victory': ['VictoryScreen', 'ScoreCalculator', 'GameStats'],
      'settings': ['SettingsPanel', 'ConfigManager', 'StorageManager']
    };

    return contextMap[context] || [];
  }

  /**
   * Clear module cache and reset statistics
   */
  clearCache() {
    this.moduleCache.clear();
    this.loadingPromises.clear();
    this.loadOrder = [];
    this.statistics = {
      totalLoads: 0,
      cacheHits: 0,
      loadFailures: 0,
      averageLoadTime: 0
    };
    console.log('LazyLoader cache cleared');
  }

  /**
   * Register core game modules
   */
  registerCoreGameModules() {
    // Register additional game modules
    this.register('GameState', () => import('../../gameState.js'), {
      priority: 10,
      critical: true,
      preload: true
    });

    this.register('TurnManager', () => import('../../turnManager.js'), {
      priority: 9,
      critical: true,
      preload: true
    });

    this.register('ResourceManager', () => import('../../resourceManager.js'), {
      priority: 9,
      critical: true,
      preload: true
    });

    this.register('PersistenceManager', () => import('../../persistence.js'), {
      priority: 5,
      critical: false
    });

    console.log('Core game modules registered for lazy loading');
  }

  /**
   * Update load time statistics
   */
  updateLoadTimeStatistics(loadTime) {
    const currentAvg = this.statistics.averageLoadTime;
    const totalLoads = this.statistics.totalLoads;
    
    this.statistics.averageLoadTime = 
      (currentAvg * totalLoads + loadTime) / (totalLoads + 1);
  }

  /**
   * Get loading statistics and performance metrics
   */
  getStatistics() {
    return {
      ...this.statistics,
      cachedModules: this.moduleCache.size,
      registeredModules: this.moduleRegistry.size,
      currentlyLoading: this.loadingPromises.size,
      loadOrder: [...this.loadOrder],
      cacheHitRate: this.statistics.totalLoads > 0 
        ? (this.statistics.cacheHits / this.statistics.totalLoads) * 100 
        : 0
    };
  }

  /**
   * Get detailed performance report
   */
  getPerformanceReport() {
    const stats = this.getStatistics();
    const moduleDetails = [];
    
    for (const [moduleName, config] of this.moduleRegistry) {
      moduleDetails.push({
        name: moduleName,
        cached: this.moduleCache.has(moduleName),
        loading: this.loadingPromises.has(moduleName),
        priority: config.priority,
        dependencies: config.dependencies,
        critical: config.critical
      });
    }

    return {
      statistics: stats,
      modules: moduleDetails,
      performance: {
        averageLoadTime: stats.averageLoadTime,
        failureRate: stats.totalLoads > 0 
          ? (stats.loadFailures / stats.totalLoads) * 100 
          : 0
      }
    };
  }

  /**
   * Check if a module is available (loaded or cached)
   */
  isAvailable(moduleName) {
    return this.moduleCache.has(moduleName);
  }

  /**
   * Check if a module is currently loading
   */
  isLoading(moduleName) {
    return this.loadingPromises.has(moduleName);
  }

  /**
   * Unload a module from cache (for development/testing)
   */
  unload(moduleName) {
    if (this.moduleCache.has(moduleName)) {
      this.moduleCache.delete(moduleName);
      console.log(`Module '${moduleName}' unloaded from cache`);
      return true;
    }
    return false;
  }
}

// Create global lazy loader instance
export const lazyLoader = new LazyLoader();