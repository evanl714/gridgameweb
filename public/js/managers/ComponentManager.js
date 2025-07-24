/**
 * ComponentManager - Coordinates UI component lifecycle and management
 * Manages component registration, initialization, and cleanup
 */

import { Observable } from '../patterns/Observer.js';
import { GridGeneratorComponent } from '../components/GridGeneratorComponent.js';
import { BuildPanelComponent } from '../components/BuildPanelComponent.js';
import { GameBoardComponent } from '../components/GameBoardComponent.js';
import { ControlPanelComponent } from '../components/ControlPanelComponent.js';

export class ComponentManager extends Observable {
  constructor(serviceContainer) {
    super();
    this.serviceContainer = serviceContainer;
    this.components = new Map();
    this.componentRegistry = new Map();
    this.isInitialized = false;
    
    // Register built-in components
    this.registerBuiltInComponents();
  }

  /**
   * Register built-in UI components
   */
  registerBuiltInComponents() {
    this.componentRegistry.set('gridGenerator', {
      class: GridGeneratorComponent,
      dependencies: [],
      autoInitialize: true
    });

    this.componentRegistry.set('buildPanel', {
      class: BuildPanelComponent,
      dependencies: ['gameStateManager'],
      autoInitialize: true
    });

    this.componentRegistry.set('gameBoard', {
      class: GameBoardComponent,
      dependencies: [],
      autoInitialize: true
    });

    this.componentRegistry.set('controlPanel', {
      class: ControlPanelComponent,
      dependencies: [],
      autoInitialize: true
    });
  }

  /**
   * Initialize all registered components
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🚀 ComponentManager: Initializing UI components...');
      
      // Initialize components in dependency order
      const initializationOrder = this.calculateInitializationOrder();
      
      for (const componentName of initializationOrder) {
        await this.initializeComponent(componentName);
      }

      this.setupInterComponentCommunication();
      this.isInitialized = true;
      
      console.log(`✅ ComponentManager: Initialized ${this.components.size} components`);
      this.emit('initialized', {
        componentCount: this.components.size,
        componentNames: Array.from(this.components.keys())
      });

    } catch (error) {
      console.error('❌ ComponentManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize a specific component
   */
  async initializeComponent(componentName) {
    const registration = this.componentRegistry.get(componentName);
    if (!registration) {
      throw new Error(`Component ${componentName} not registered`);
    }

    if (this.components.has(componentName)) {
      console.warn(`Component ${componentName} already initialized`);
      return this.components.get(componentName);
    }

    try {
      // Resolve dependencies
      const dependencies = this.resolveDependencies(registration.dependencies);
      
      // Create component instance based on type
      const component = await this.createComponentInstance(componentName, registration, dependencies);
      
      // Initialize the component
      await component.initialize();
      
      // Store component
      this.components.set(componentName, component);
      
      console.log(`✅ ComponentManager: Initialized ${componentName}`);
      this.emit('componentInitialized', { componentName, component });
      
      return component;

    } catch (error) {
      console.error(`❌ Failed to initialize component ${componentName}:`, error);
      throw error;
    }
  }

  /**
   * Create component instance with appropriate dependencies
   */
  async createComponentInstance(componentName, registration, dependencies) {
    const ComponentClass = registration.class;
    
    switch (componentName) {
      case 'gridGenerator':
        return new ComponentClass('#gameBoard', {
          gridSize: 25,
          resourcePositions: [
            {row: 4, col: 4}, {row: 12, col: 4}, {row: 20, col: 4},
            {row: 4, col: 12}, {row: 12, col: 12}, {row: 20, col: 12},
            {row: 4, col: 20}, {row: 12, col: 20}, {row: 20, col: 20}
          ]
        });

      case 'buildPanel':
        const gameState = dependencies.gameStateManager;
        return new ComponentClass(document.body, gameState, {
          selector: '.unit-card'
        });

      case 'gameBoard':
        // Wait for grid to be generated first
        await this.waitForGridGeneration();
        return new ComponentClass('#gameBoard', window.game, {
          useEventDelegation: true
        });

      case 'controlPanel':
        return new ComponentClass(document.body, window.game, {
          watchForGameInstance: true
        });

      default:
        return new ComponentClass(...dependencies);
    }
  }

  /**
   * Wait for grid generation to complete
   */
  async waitForGridGeneration() {
    const gridGenerator = this.components.get('gridGenerator');
    if (gridGenerator) {
      return new Promise((resolve) => {
        if (gridGenerator.isGenerated) {
          resolve();
        } else {
          gridGenerator.once('gridGenerated', resolve);
        }
      });
    }
  }

  /**
   * Resolve component dependencies
   */
  resolveDependencies(dependencyNames) {
    const dependencies = [];
    
    for (const depName of dependencyNames) {
      if (this.serviceContainer && this.serviceContainer.has(depName)) {
        dependencies.push(this.serviceContainer.get(depName));
      } else {
        console.warn(`ComponentManager: Dependency ${depName} not found in service container`);
        dependencies.push(null);
      }
    }
    
    return dependencies;
  }

  /**
   * Calculate proper initialization order based on dependencies
   */
  calculateInitializationOrder() {
    const order = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (componentName) => {
      if (visited.has(componentName)) return;
      if (visiting.has(componentName)) {
        throw new Error(`Circular dependency detected involving ${componentName}`);
      }

      visiting.add(componentName);
      
      const registration = this.componentRegistry.get(componentName);
      if (registration && registration.dependencies) {
        for (const dep of registration.dependencies) {
          // Only visit if it's a component dependency
          if (this.componentRegistry.has(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(componentName);
      visited.add(componentName);
      order.push(componentName);
    };

    // Visit all registered components
    for (const componentName of this.componentRegistry.keys()) {
      visit(componentName);
    }

    return order;
  }

  /**
   * Set up communication between components
   */
  setupInterComponentCommunication() {
    const buildPanel = this.components.get('buildPanel');
    const gameBoard = this.components.get('gameBoard');
    const controlPanel = this.components.get('controlPanel');

    // Build panel -> Game board communication
    if (buildPanel && gameBoard) {
      buildPanel.on('unitSelected', (data) => {
        gameBoard.emit('unitTypeSelected', data);
      });
    }

    // Game board -> Build panel communication
    if (gameBoard && buildPanel) {
      gameBoard.on('cellClicked', (data) => {
        buildPanel.emit('cellSelected', data);
      });
    }

    // Global game state changes
    if (controlPanel) {
      controlPanel.on('buttonClicked', (data) => {
        this.broadcast('gameActionTriggered', data);
      });
    }

    console.log('✅ ComponentManager: Inter-component communication established');
  }

  /**
   * Broadcast event to all components
   */
  broadcast(eventName, data) {
    this.components.forEach((component, name) => {
      try {
        component.emit(eventName, data);
      } catch (error) {
        console.warn(`Error broadcasting ${eventName} to ${name}:`, error);
      }
    });
  }

  /**
   * Get a specific component
   */
  getComponent(componentName) {
    return this.components.get(componentName);
  }

  /**
   * Get all components
   */
  getAllComponents() {
    return new Map(this.components);
  }

  /**
   * Register a new component type
   */
  registerComponent(name, componentClass, options = {}) {
    this.componentRegistry.set(name, {
      class: componentClass,
      dependencies: options.dependencies || [],
      autoInitialize: options.autoInitialize !== false
    });

    this.emit('componentRegistered', { name, componentClass });
  }

  /**
   * Update all components
   */
  updateAllComponents(data) {
    this.components.forEach((component, name) => {
      try {
        component.update(data);
      } catch (error) {
        console.warn(`Error updating component ${name}:`, error);
      }
    });
  }

  /**
   * Destroy a specific component
   */
  destroyComponent(componentName) {
    const component = this.components.get(componentName);
    if (component) {
      try {
        component.destroy();
        this.components.delete(componentName);
        this.emit('componentDestroyed', { componentName });
        console.log(`✅ ComponentManager: Destroyed ${componentName}`);
      } catch (error) {
        console.error(`Error destroying component ${componentName}:`, error);
      }
    }
  }

  /**
   * Destroy all components
   */
  destroyAllComponents() {
    const componentNames = Array.from(this.components.keys());
    
    for (const componentName of componentNames) {
      this.destroyComponent(componentName);
    }
    
    this.isInitialized = false;
    console.log('✅ ComponentManager: All components destroyed');
    this.emit('allComponentsDestroyed');
  }

  /**
   * Get component statistics
   */
  getStatistics() {
    const stats = {
      totalRegistered: this.componentRegistry.size,
      totalInitialized: this.components.size,
      isInitialized: this.isInitialized,
      components: {}
    };

    this.components.forEach((component, name) => {
      stats.components[name] = {
        isInitialized: component.isInitialized,
        isDestroyed: component.isDestroyed,
        eventListeners: component.listenerCount ? component.listenerCount() : 0
      };
    });

    return stats;
  }

  /**
   * Clean shutdown
   */
  shutdown() {
    console.log('🔄 ComponentManager: Shutting down...');
    this.destroyAllComponents();
    this.componentRegistry.clear();
    this.removeAllListeners();
    console.log('✅ ComponentManager: Shutdown complete');
  }
}