import ServiceContainer from './ServiceContainer.js';
import DOMProvider from './DOMProvider.js';
import GameStateManager from './GameStateManager.js';
import TurnManagerService from './TurnManagerService.js';
import NotificationService from './NotificationService.js';
import UIStateManager from '../managers/UIStateManagerRefactored.js';
import { EventHandlerService } from './EventHandlerService.js';
import { EventEmitter } from '../patterns/Observer.js';
import { ComponentManager } from '../managers/ComponentManager.js';

/**
 * ServiceBootstrap - Application dependency injection bootstrap
 *
 * Initializes all services and eliminates the need for global state access
 * Provides a clean, testable architecture with proper dependency injection
 */
class ServiceBootstrap {
  constructor() {
    this.container = new ServiceContainer();
    this.isInitialized = false;
    this.services = {};

    // Bootstrap configuration
    this.config = {
      initializationTimeout: 10000, // 10 seconds
      enableDebugMode: false,
      strictMode: true // Fail fast on dependency errors
    };

    this.initializationPromise = null;
  }

  /**
     * Initialize all services and dependencies
     * @param {Object} gameInstance - Optional existing game instance for backward compatibility
     * @param {Object} options - Bootstrap options
     * @returns {Promise<Object>} Initialized services
     */
  async initialize(gameInstance = null, options = {}) {
    if (this.isInitialized) {
      console.warn('ServiceBootstrap already initialized');
      return this.services;
    }

    // Merge configuration
    Object.assign(this.config, options);

    console.log('🚀 Initializing ServiceBootstrap...');

    try {
      // Create initialization promise with timeout
      this.initializationPromise = this.performInitialization(gameInstance);

      if (this.config.initializationTimeout > 0) {
        this.services = await Promise.race([
          this.initializationPromise,
          this.createTimeoutPromise()
        ]);
      } else {
        this.services = await this.initializationPromise;
      }

      this.isInitialized = true;
      console.log('✅ ServiceBootstrap initialization complete');

      return this.services;

    } catch (error) {
      console.error('❌ ServiceBootstrap initialization failed:', error);
      throw new Error(`Service initialization failed: ${error.message}`);
    }
  }

  /**
     * Perform the actual service initialization
     * @param {Object} gameInstance - Game instance
     * @returns {Promise<Object>} Services object
     */
  async performInitialization(gameInstance) {
    // Phase 1: Register core services
    console.log('📋 Phase 1: Registering core services...');
    await this.registerCoreServices();

    // Phase 2: Register application services
    console.log('📋 Phase 2: Registering application services...');
    await this.registerApplicationServices();

    // Phase 3: Register UI services
    console.log('📋 Phase 3: Registering UI services...');
    await this.registerUIServices();

    // Phase 4: Register UI components
    console.log('📋 Phase 4: Registering UI components...');
    await this.registerUIComponents();

    // Phase 5: Initialize services
    console.log('📋 Phase 5: Initializing services...');
    await this.initializeServices();

    // Phase 6: Connect to existing game instance (backward compatibility)
    if (gameInstance) {
      console.log('📋 Phase 6: Connecting to existing game instance...');
      await this.connectGameInstance(gameInstance);
    }

    // Phase 7: Initialize UI components
    console.log('📋 Phase 7: Initializing UI components...');
    await this.initializeUIComponents();

    // Phase 8: Validate dependencies
    console.log('📋 Phase 8: Validating dependencies...');
    await this.validateServices();

    // Return service access object
    return this.createServiceAccess();
  }

  /**
     * Register core services (EventEmitter, DOMProvider, etc.)
     */
  async registerCoreServices() {
    // EventEmitter - Central event system
    this.container.register('eventEmitter', (container) => {
      return new EventEmitter();
    }, { singleton: true });

    // DOMProvider - DOM abstraction layer
    this.container.register('domProvider', (container) => {
      const provider = new DOMProvider();
      provider.initializeCommonElements();
      return provider;
    }, { singleton: true });

    // NotificationService - User notifications
    this.container.register('notificationService', (container) => {
      const domProvider = container.get('domProvider');
      return new NotificationService(domProvider);
    }, {
      singleton: true,
      dependencies: ['domProvider']
    });
  }

  /**
     * Register application services (GameStateManager, TurnManager, etc.)
     */
  async registerApplicationServices() {
    // GameStateManager - Centralized game state
    this.container.register('gameStateManager', (container) => {
      const eventEmitter = container.get('eventEmitter');
      return new GameStateManager(eventEmitter);
    }, {
      singleton: true,
      dependencies: ['eventEmitter']
    });

    // TurnManagerService - Turn and phase management
    this.container.register('turnManagerService', (container) => {
      const gameStateManager = container.get('gameStateManager');
      const eventEmitter = container.get('eventEmitter');
      return new TurnManagerService(gameStateManager, eventEmitter);
    }, {
      singleton: true,
      dependencies: ['gameStateManager', 'eventEmitter']
    });
  }

  /**
     * Register UI components (ComponentManager, etc.)
     */
  async registerUIComponents() {
    // ComponentManager - UI component lifecycle management
    this.container.register('componentManager', (container) => {
      return new ComponentManager(container);
    }, {
      singleton: true,
      dependencies: []
    });
  }

  /**
     * Register UI services (UIStateManager, EventHandlerService, etc.)
     */
  async registerUIServices() {
    // UIStateManager - UI state management
    this.container.register('uiStateManager', (container) => {
      const gameStateManager = container.get('gameStateManager');
      const turnManagerService = container.get('turnManagerService');
      const domProvider = container.get('domProvider');
      const notificationService = container.get('notificationService');
      const componentManager = container.get('componentManager');

      return new UIStateManager(
        gameStateManager,
        turnManagerService,
        domProvider,
        notificationService,
        componentManager
      );
    }, {
      singleton: true,
      dependencies: ['gameStateManager', 'turnManagerService', 'domProvider', 'notificationService', 'componentManager']
    });

    // EventHandlerService - Centralized event handling
    this.container.register('eventHandlerService', (container) => {
      return new EventHandlerService(container);
    }, {
      singleton: true,
      dependencies: ['uiStateManager'] // Depends on UIStateManager being available
    });
  }

  /**
     * Initialize all registered services
     */
  async initializeServices() {
    // Validate dependencies before initialization
    const issues = this.container.validateDependencies();
    if (issues.length > 0) {
      throw new Error(`Dependency validation failed: ${issues.join(', ')}`);
    }

    // Initialize container (creates all singleton instances)
    this.container.initialize();

    // Wait for DOM to be ready
    await this.waitForDOM();

    // Perform post-initialization setup
    await this.postInitializationSetup();
  }

  /**
     * Initialize UI components
     */
  async initializeUIComponents() {
    try {
      const componentManager = this.container.get('componentManager');
      await componentManager.initialize();
      console.log('✅ UI components initialized successfully');
    } catch (error) {
      console.error('❌ UI component initialization failed:', error);
      if (this.config.strictMode) {
        throw error;
      }
    }
  }

  /**
     * Connect to existing game instance for backward compatibility
     * @param {Object} gameInstance - Existing game instance
     */
  async connectGameInstance(gameInstance) {
    try {
      // Register game instance in ServiceContainer for dependency injection
      this.container.register('game', gameInstance);
      console.log('🔗 Game instance registered in ServiceContainer');
      
      const gameStateManager = this.container.get('gameStateManager');
      gameStateManager.initialize(gameInstance);

      console.log('🔗 Connected to existing game instance');
    } catch (error) {
      console.warn('⚠️ Failed to connect to game instance:', error.message);
      if (this.config.strictMode) {
        throw error;
      }
    }
  }

  /**
     * Validate that all services are working correctly
     */
  async validateServices() {
    const validations = [
      { name: 'eventEmitter', test: () => this.container.get('eventEmitter').emit },
      { name: 'domProvider', test: () => typeof this.container.get('domProvider').get === 'function' },
      { name: 'notificationService', test: () => this.container.get('notificationService').show },
      { name: 'gameStateManager', test: () => this.container.get('gameStateManager').getState },
      { name: 'turnManagerService', test: () => this.container.get('turnManagerService').getCurrentTurnInfo },
      { name: 'uiStateManager', test: () => this.container.get('uiStateManager').updateAllUI },
      { name: 'eventHandlerService', test: () => this.container.get('eventHandlerService').initialize },
      { name: 'componentManager', test: () => this.container.get('componentManager').getComponent }
    ];

    for (const validation of validations) {
      try {
        if (typeof validation.test() !== 'function') {
          throw new Error(`Service ${validation.name} validation failed`);
        }
      } catch (error) {
        const message = `Service validation failed for ${validation.name}: ${error.message}`;
        console.error(message);

        if (this.config.strictMode) {
          throw new Error(message);
        }
      }
    }
  }

  /**
     * Post-initialization setup
     */
  async postInitializationSetup() {
    // Setup cross-service event wiring
    this.setupEventWiring();

    // Initialize UI if DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      await this.initializeUI();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeUI();
      });
    }
  }

  /**
     * Setup event wiring between services
     */
  setupEventWiring() {
    const eventEmitter = this.container.get('eventEmitter');
    const gameStateManager = this.container.get('gameStateManager');
    const turnManagerService = this.container.get('turnManagerService');
    const uiStateManager = this.container.get('uiStateManager');

    // Wire game state changes to UI updates
    gameStateManager.on('stateChanged', () => {
      uiStateManager.scheduleUIUpdate();
    });

    // Wire turn changes to UI updates
    turnManagerService.on('turnStarted', () => {
      uiStateManager.scheduleUIUpdate();
    });

    // Add global error handling
    this.setupErrorHandling();
  }

  /**
     * Setup global error handling
     */
  setupErrorHandling() {
    const notificationService = this.container.get('notificationService');

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      notificationService.error('An unexpected error occurred');

      if (this.config.enableDebugMode) {
        notificationService.error(`Debug: ${event.reason.message}`, { duration: 10000 });
      }
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('JavaScript error:', event.error);
      notificationService.error('An unexpected error occurred');

      if (this.config.enableDebugMode) {
        notificationService.error(`Debug: ${event.error.message}`, { duration: 10000 });
      }
    });
  }

  /**
     * Initialize UI components
     */
  async initializeUI() {
    try {
      const uiStateManager = this.container.get('uiStateManager');
      const eventHandlerService = this.container.get('eventHandlerService');
      const notificationService = this.container.get('notificationService');

      // Initialize UI
      uiStateManager.updateAllUI();

      // Initialize event handlers (replaces inline HTML handlers)
      eventHandlerService.initialize();

      // Show initialization complete message
      if (this.config.enableDebugMode) {
        notificationService.success('Game services initialized', { duration: 2000 });
      }

    } catch (error) {
      console.error('UI initialization failed:', error);

      if (this.config.strictMode) {
        throw error;
      }
    }
  }

  /**
     * Wait for DOM to be ready
     * @returns {Promise<void>}
     */
  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
     * Create timeout promise for initialization
     * @returns {Promise<never>}
     */
  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Service initialization timed out after ${this.config.initializationTimeout}ms`));
      }, this.config.initializationTimeout);
    });
  }

  /**
     * Create service access object
     * @returns {Object} Service access object
     */
  createServiceAccess() {
    return {
      // Direct service access
      container: this.container,

      // Convenience accessors
      get eventEmitter() { return this.container.get('eventEmitter'); },
      get domProvider() { return this.container.get('domProvider'); },
      get notificationService() { return this.container.get('notificationService'); },
      get gameStateManager() { return this.container.get('gameStateManager'); },
      get turnManagerService() { return this.container.get('turnManagerService'); },
      get uiStateManager() { return this.container.get('uiStateManager'); },
      get eventHandlerService() { return this.container.get('eventHandlerService'); },
      get componentManager() { return this.container.get('componentManager'); },

      // Utility methods
      getService: (name) => this.container.get(name),
      hasService: (name) => this.container.has(name),

      // Status and debugging
      getStatus: () => this.getBootstrapStatus(),
      validate: () => this.validateServices()
    };
  }

  /**
     * Get bootstrap status for debugging
     * @returns {Object} Bootstrap status
     */
  getBootstrapStatus() {
    return {
      initialized: this.isInitialized,
      serviceCount: this.container.getServiceNames().length,
      services: this.container.getServiceNames(),
      config: { ...this.config },
      containerStatus: {
        servicesRegistered: this.container.getServiceNames().length,
        singletonsCreated: Object.keys(this.container.singletons || {}).length
      }
    };
  }

  /**
     * Create a new service or replace existing one
     * @param {string} name - Service name
     * @param {Function} factory - Service factory
     * @param {Object} options - Service options
     */
  addService(name, factory, options = {}) {
    if (this.isInitialized) {
      console.warn(`Adding service '${name}' after initialization`);
    }

    this.container.register(name, factory, options);
  }

  /**
     * Restart services (useful for testing)
     */
  async restart() {
    console.log('🔄 Restarting ServiceBootstrap...');

    this.dispose();
    this.container = new ServiceContainer();
    this.isInitialized = false;
    this.services = {};

    return this.initialize();
  }

  /**
     * Dispose of all services and cleanup
     */
  dispose() {
    if (!this.isInitialized) return;

    console.log('🧹 Disposing ServiceBootstrap...');

    try {
      // Dispose services in reverse order
      const services = ['componentManager', 'eventHandlerService', 'uiStateManager', 'turnManagerService', 'gameStateManager', 'notificationService', 'domProvider', 'eventEmitter'];

      services.forEach(serviceName => {
        try {
          const service = this.container.get(serviceName);
          if (service && typeof service.dispose === 'function') {
            service.dispose();
          }
        } catch (error) {
          console.warn(`Failed to dispose service ${serviceName}:`, error.message);
        }
      });

      // Clear container
      this.container.clear();

    } catch (error) {
      console.error('Error during disposal:', error);
    } finally {
      this.isInitialized = false;
      this.services = {};
      console.log('✅ ServiceBootstrap disposed');
    }
  }

  /**
     * Global service access (for migration period)
     * @deprecated Use dependency injection instead
     */
  static getInstance() {
    if (!ServiceBootstrap._instance) {
      ServiceBootstrap._instance = new ServiceBootstrap();
    }
    return ServiceBootstrap._instance;
  }
}

// Export both class and convenience function
export default ServiceBootstrap;

/**
 * Convenience function to initialize services
 * @param {Object} gameInstance - Optional game instance
 * @param {Object} options - Bootstrap options
 * @returns {Promise<Object>} Initialized services
 */
export async function initializeServices(gameInstance = null, options = {}) {
  const bootstrap = new ServiceBootstrap();
  return bootstrap.initialize(gameInstance, options);
}

/**
 * Global services access (migration helper)
 * @deprecated Use proper dependency injection
 */
export function getGlobalServices() {
  const instance = ServiceBootstrap.getInstance();
  if (!instance.isInitialized) {
    throw new Error('Services not initialized. Call initializeServices() first.');
  }
  return instance.services;
}
