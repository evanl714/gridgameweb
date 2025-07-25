// Import constants and state management from shared modules
import {
  GAME_CONFIG,
  UI_COLORS,
  RESOURCE_CONFIG,
  GAME_STATES,
  PLAYER_COLORS,
  UNIT_TYPES,
  UNIT_CHARACTERS,
  ENTITY_CHARACTERS,
  BASE_CONFIG,
  MOVEMENT_COLORS
} from './shared/constants.js';

import { GameState } from './gameState.js';
import { TurnManager } from './turnManager.js';
import { ResourceManager } from './resourceManager.js';
import { PersistenceManager } from './persistence.js';

// Import lazy loading system
import { lazyLoader } from './js/patterns/LazyLoader.js';
import { UIContextLoader, UILoadingStrategies } from './js/patterns/UILazyLoader.js';
import { performanceMonitor } from './js/services/PerformanceMonitor.js';

// Import service bootstrap
import ServiceBootstrap from './js/services/ServiceBootstrap.js';

// Import game interfaces
import { GameActions } from './js/interfaces/GameActions.js';

// Import design patterns
import {
  PatternIntegrator,
  GameEventTypes
} from './js/patterns/index.js';

class Game {
  constructor() {
    // Canvas is optional for grid-based UI
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.gridSize = GAME_CONFIG.GRID_SIZE; // 25x25
    this.cellSize = GAME_CONFIG.CELL_SIZE; // 32 pixels per cell

    // Initialize game state management
    this.gameState = new GameState();
    this.turnManager = new TurnManager(this.gameState);
    this.resourceManager = new ResourceManager(this.gameState);
    this.persistenceManager = new PersistenceManager();

    // Initialize performance monitoring
    this.performanceMonitor = performanceMonitor;
    
    // UI components will be loaded lazily
    this.uiManager = null;
    this.victoryScreen = null;
    this.uiStateManager = null;
    this.renderer = null;
    this.inputController = null;

    // Pattern-related properties will be initialized async
    this.commandManager = null;
    this.entityFactory = null;
    this.actionHandlers = null;

    // UI loading strategy (can be changed via settings)
    this.uiLoadingStrategy = 'progressive'; // progressive, eager, smart

    // Game instance will be managed by ServiceContainer
    // No global assignment - use dependency injection instead
  }

  /**
   * Async initialization with lazy loading and performance monitoring
   */
  async initialize() {
    try {
      // Start performance monitoring
      this.performanceMonitor.startFrame();
      
      console.log('Starting game initialization with lazy loading...');

      // Initialize design patterns asynchronously
      const patterns = await this.performanceMonitor.profileOperation(
        'pattern-setup',
        () => PatternIntegrator.setupPatterns(this)
      );
      this.commandManager = patterns.commandManager;
      this.entityFactory = patterns.entityFactory;
      this.actionHandlers = await PatternIntegrator.createActionHandlers(this, this.commandManager);

      // Load UI components based on strategy
      await this.performanceMonitor.profileOperation(
        'ui-loading',
        () => this.loadUIComponents()
      );

      // Initialize input controller after all components are ready
      const InputController = await lazyLoader.load('InputController');
      const gameActions = new GameActions(this);
      this.inputController = new InputController(
        this.gameState, 
        this.turnManager, 
        this.uiManager, 
        this.renderer,
        gameActions
      );

      // Complete initialization
      this.finishInitialization();

      this.performanceMonitor.endFrame();
      
      // Log performance metrics
      const report = this.performanceMonitor.getPerformanceReport();
      console.log('Game initialization completed. Performance report:', report);
      
      console.log('Grid Strategy Game initialized with lazy loading');
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.performanceMonitor.endFrame();
      throw error;
    }
  }

  /**
   * Load UI components based on selected strategy
   */
  async loadUIComponents() {
    const strategy = UILoadingStrategies[this.uiLoadingStrategy];
    
    if (!strategy) {
      console.warn(`Unknown UI loading strategy: ${this.uiLoadingStrategy}, falling back to progressive`);
      await UILoadingStrategies.progressive.execute();
    } else {
      console.log(`Loading UI with strategy: ${strategy.name}`);
      await strategy.execute(this.gameState);
    }

    // Load critical UI components that are always needed
    await this.loadCriticalUIComponents();
  }

  /**
   * Load critical UI components that are always needed
   */
  async loadCriticalUIComponents() {
    // Load essential UI managers
    const UIManager = await lazyLoader.load('UIManager');
    this.uiManager = new UIManager(this.gameState, this.turnManager);

    const UIStateManager = await lazyLoader.load('UIStateManager');
    // Create basic services for UIStateManager compatibility
    const basicDOMProvider = {
      get: (id) => document.getElementById(id),
      updateContent: (id, content, isHTML = false) => {
        const element = document.getElementById(id);
        if (element) {
          if (isHTML) {
            element.innerHTML = content;
          } else {
            element.textContent = content;
          }
        }
      },
      createElement: (tag, attrs, content) => {
        const el = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
          if (key === 'textContent') {
            el.textContent = value;
          } else {
            el.setAttribute(key, value);
          }
        });
        if (content) el.textContent = content;
        return el;
      }
    };
    const basicNotificationService = {
      show: (message, type) => console.log(`${type}: ${message}`)
    };

    // Create EventEmitter bridge for gameStateManager mock
    const gameStateManagerBridge = {
      getCurrentPlayer: () => this.gameState.getCurrentPlayer(),
      getState: () => this.gameState,
      initialized: true,
      // EventEmitter interface
      _listeners: new Map(),
      on: function(event, callback) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return this;
      },
      emit: function(event, ...args) {
        if (this._listeners.has(event)) {
          this._listeners.get(event).forEach(callback => {
            try {
              callback(...args);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        }
        return this;
      },
      off: function(event, callback) {
        if (this._listeners.has(event)) {
          const listeners = this._listeners.get(event);
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
          if (listeners.length === 0) {
            this._listeners.delete(event);
          }
        }
        return this;
      }
    };

    // Create EventEmitter bridge for turnManager mock
    const turnManagerBridge = {
      // Copy existing turnManager functionality
      ...this.turnManager,
      // EventEmitter interface
      _listeners: new Map(),
      on: function(event, callback) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return this;
      },
      emit: function(event, ...args) {
        if (this._listeners.has(event)) {
          this._listeners.get(event).forEach(callback => {
            try {
              callback(...args);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        }
        return this;
      },
      off: function(event, callback) {
        if (this._listeners.has(event)) {
          const listeners = this._listeners.get(event);
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
          if (listeners.length === 0) {
            this._listeners.delete(event);
          }
        }
        return this;
      }
    };

    this.uiStateManager = new UIStateManager(
      gameStateManagerBridge,
      turnManagerBridge,
      basicDOMProvider,
      basicNotificationService
    );

    const GameRenderer = await lazyLoader.load('GameRenderer');
    this.renderer = new GameRenderer(this.gameState, this.resourceManager);

    console.log('Critical UI components loaded');
  }

  /**
   * Load UI component on demand with caching
   */
  async loadUIComponent(componentName) {
    try {
      const Component = await lazyLoader.load(componentName);
      console.log(`UI component '${componentName}' loaded on demand`);
      return Component;
    } catch (error) {
      console.error(`Failed to load UI component '${componentName}':`, error);
      throw error;
    }
  }

  /**
   * Load victory screen when needed
   */
  async showVictoryScreen() {
    if (!this.victoryScreen) {
      const VictoryScreen = await this.loadUIComponent('VictoryScreen');
      this.victoryScreen = new VictoryScreen(this.gameState);
    }
    
    // Show the victory screen
    if (this.victoryScreen && typeof this.victoryScreen.show === 'function') {
      this.victoryScreen.show();
    }
  }

  /**
   * Load build panel when needed
   */
  async showBuildPanel() {
    const BuildPanelSidebar = await this.loadUIComponent('BuildPanelSidebar');
    
    // Initialize if needed
    if (!this.buildPanelSidebar) {
      this.buildPanelSidebar = new BuildPanelSidebar(this.gameState, this.turnManager);
    }
    
    return this.buildPanelSidebar;
  }

  /**
   * Load unit info panel when needed
   */
  async showUnitInfo(unit) {
    const UnitInfoSidebar = await this.loadUIComponent('UnitInfoSidebar');
    
    // Initialize if needed
    if (!this.unitInfoSidebar) {
      this.unitInfoSidebar = new UnitInfoSidebar(this.gameState);
    }
    
    // Update with current unit info
    if (this.unitInfoSidebar && typeof this.unitInfoSidebar.updateUnit === 'function') {
      this.unitInfoSidebar.updateUnit(unit);
    }
    
    return this.unitInfoSidebar;
  }

  finishInitialization() {
    this.setupGameEventListeners();
    this.updateCanvasSize();
    this.render();
    this.updateUI();
  }

  cleanupGameEventListeners() {
    // Remove all game state event listeners to prevent memory leaks
    if (this.gameState) {
      this.gameState.removeAllListeners('gameStarted');
      this.gameState.removeAllListeners('turnStarted');
      this.gameState.removeAllListeners('turnEnded');
      this.gameState.removeAllListeners('phaseChanged');
      this.gameState.removeAllListeners('unitCreated');
      this.gameState.removeAllListeners('unitMoved');
      this.gameState.removeAllListeners('resourcesGathered');
    }
  }

  setupGameEventListeners() {
    // Clean up existing listeners first to prevent accumulation
    this.cleanupGameEventListeners();

    // Listen to game state events
    this.gameState.on('gameStarted', () => {
      this.updateUI();
      console.log('Game started');
    });

    this.gameState.on('turnStarted', (data) => {
      this.updateUI();
      console.log(`Turn ${data.turnNumber} started for Player ${data.player}`);
    });

    this.gameState.on('turnEnded', (data) => {
      this.updateUI();
      console.log(`Turn ended: Player ${data.previousPlayer} → Player ${data.nextPlayer}`);
    });

    this.gameState.on('phaseChanged', (data) => {
      this.updateUI();
      console.log(`Phase changed to ${data.phase} for Player ${data.player}`);
    });

    this.gameState.on('unitCreated', (data) => {
      this.render();
      console.log(`Unit created: ${data.unit.type} at (${data.unit.position.x}, ${data.unit.position.y})`);
    });

    this.gameState.on('unitMoved', (data) => {
      this.render();
      console.log(`Unit moved from (${data.from.x}, ${data.from.y}) to (${data.to.x}, ${data.to.y})`);
    });

    this.gameState.on('resourcesGathered', (data) => {
      this.render();
      this.updateUI();
      console.log(`Player ${data.playerId} gathered ${data.amount} resources`);
    });
  }

  // Event listeners now handled by InputController

  updateCanvasSize() {
    if (this.canvas) {
      const totalSize = this.gridSize * this.cellSize;
      this.canvas.width = totalSize;
      this.canvas.height = totalSize;
    }
  }

  // Input handling now managed by InputController

  // Cell click handling moved to InputController

  // Unit creation dialog handling moved to InputController

  // Mouse move handling moved to InputController

  // Mouse leave handling moved to InputController

  // Keyboard input handling moved to InputController

  // Grid coordinate calculation moved to InputController

  // Cell selection moved to InputController

  // Public method for external cell click handling (called from HTML grid)
  handleCellClick(x, y) {
    if (this.inputController) {
      this.inputController.handleCellClickExternal(x, y);
    }
  }

  render() {
    // Use unified renderer for both canvas and grid rendering
    if (this.renderer) {
      this.renderer.render(this.inputController);
    }
  }

  // Canvas rendering methods moved to GameRenderer

  // Hover drawing moved to GameRenderer

  // Selection drawing moved to GameRenderer

  // Resource node drawing moved to GameRenderer

  // Base drawing moved to GameRenderer

  // Unit drawing moved to GameRenderer

  // Unit selection drawing moved to GameRenderer

  // Movement range drawing moved to GameRenderer

  // Movement preview drawing moved to GameRenderer

  async newGame() {
    // Clean up existing event listeners first
    this.cleanupGameEventListeners();

    // Clean up existing components
    if (this.uiManager) {
      this.uiManager.destroy();
    }
    if (this.victoryScreen) {
      this.victoryScreen.destroy();
    }
    if (this.turnManager) {
      this.turnManager.destroy();
    }
    if (this.uiStateManager) {
      this.uiStateManager.destroy();
    }
    if (this.commandManager) {
      this.commandManager.clear();
    }
    if (this.resourceManager) {
      // Add cleanup if resourceManager has destroy method
    }

    // Reset state management - create new instances only after cleanup
    this.gameState = new GameState();
    this.turnManager = new TurnManager(this.gameState);
    this.resourceManager = new ResourceManager(this.gameState);

    // Reset UI state
    // Clear selection through InputController
    if (this.inputController) {
      this.inputController.setSelectedUnit(null);
      this.inputController.setSelectedCell(null);
      this.inputController.setShowMovementRange(false);
    }
    this.gameState.emit('unitDeselected');

    // Reinitialize UI system with new game state
    this.uiManager = new UIManager(this.gameState, this.turnManager);
    this.victoryScreen = new VictoryScreen(this.gameState);
    
    // Create basic services for UIStateManager compatibility
    const basicDOMProvider = {
      get: (id) => document.getElementById(id),
      updateContent: (id, content, isHTML = false) => {
        const element = document.getElementById(id);
        if (element) {
          if (isHTML) {
            element.innerHTML = content;
          } else {
            element.textContent = content;
          }
        }
      },
      createElement: (tag, attrs, content) => {
        const el = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
          if (key === 'textContent') {
            el.textContent = value;
          } else {
            el.setAttribute(key, value);
          }
        });
        if (content) el.textContent = content;
        return el;
      }
    };
    const basicNotificationService = {
      show: (message, type) => console.log(`${type}: ${message}`)
    };

    // Create EventEmitter bridge for gameStateManager mock
    const gameStateManagerBridge = {
      getCurrentPlayer: () => this.gameState.getCurrentPlayer(),
      getState: () => this.gameState,
      initialized: true,
      // EventEmitter interface
      _listeners: new Map(),
      on: function(event, callback) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return this;
      },
      emit: function(event, ...args) {
        if (this._listeners.has(event)) {
          this._listeners.get(event).forEach(callback => {
            try {
              callback(...args);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        }
        return this;
      },
      off: function(event, callback) {
        if (this._listeners.has(event)) {
          const listeners = this._listeners.get(event);
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
          if (listeners.length === 0) {
            this._listeners.delete(event);
          }
        }
        return this;
      }
    };

    // Create EventEmitter bridge for turnManager mock
    const turnManagerBridge = {
      // Copy existing turnManager functionality
      ...this.turnManager,
      // EventEmitter interface
      _listeners: new Map(),
      on: function(event, callback) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return this;
      },
      emit: function(event, ...args) {
        if (this._listeners.has(event)) {
          this._listeners.get(event).forEach(callback => {
            try {
              callback(...args);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        }
        return this;
      },
      off: function(event, callback) {
        if (this._listeners.has(event)) {
          const listeners = this._listeners.get(event);
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
          if (listeners.length === 0) {
            this._listeners.delete(event);
          }
        }
        return this;
      }
    };

    this.uiStateManager = new UIStateManager(
      gameStateManagerBridge,
      turnManagerBridge,
      basicDOMProvider,
      basicNotificationService
    );

    // Reinitialize design patterns
    const patterns = await PatternIntegrator.setupPatterns(this);
    this.commandManager = patterns.commandManager;
    this.actionHandlers = await PatternIntegrator.createActionHandlers(this, this.commandManager);

    // Setup event listeners for new game state
    this.setupGameEventListeners();

    // Start the game
    this.gameState.startGame();

    this.render();
    this.updateUI();
    this.updateStatus('New game started');
    console.log('New game started with state management');
  }

  async reset() {
    await this.newGame();
    this.updateStatus('Game reset');
    console.log('Game reset');
  }

  updateUI() {
    // Ensure we have valid game state before updating
    if (!this.gameState || this.gameState.status === 'ended') {
      return;
    }

    // Delegate to UIStateManager for centralized UI updates
    if (this.uiStateManager) {
      this.uiStateManager.updateAllUI();

      // Update unit info with current selection
      const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
      this.uiStateManager.updateUnitInfo(selectedUnit);
      this.uiStateManager.updateControlButtons(selectedUnit, this.resourceManager);
    }
  }

  // Player display now handled by UIStateManager

  // Game info display now handled by UIStateManager

  updateStatus(message) {
    if (this.uiStateManager) {
      this.uiStateManager.updateStatus(message);
    }
  }

  // Enhanced methods using design patterns

  /**
   * Execute a unit move using Command pattern
   * @param {string} unitId Unit ID
   * @param {Object} targetPosition Target position {x, y}
   * @returns {Object} Execution result
   */
  executeUnitMove(unitId, targetPosition) {
    if (this.actionHandlers) {
      return this.actionHandlers.moveUnit(unitId, targetPosition);
    }

    // Fallback to direct method
    return this.gameState.moveUnit(unitId, targetPosition.x, targetPosition.y);
  }

  /**
   * Execute an attack using Command pattern
   * @param {string} attackerUnitId Attacker unit ID
   * @param {Object} targetPosition Target position {x, y}
   * @returns {Object} Execution result
   */
  executeAttack(attackerUnitId, targetPosition) {
    if (this.actionHandlers) {
      return this.actionHandlers.attackTarget(attackerUnitId, targetPosition);
    }

    // Fallback to direct method
    return this.gameState.attackUnit(attackerUnitId, targetPosition.x, targetPosition.y);
  }

  /**
   * Create a unit using Factory pattern
   * @param {string} unitType Unit type
   * @param {number} playerId Player ID
   * @param {Object} position Position {x, y}
   * @returns {Object} Creation result
   */
  createUnitWithFactory(unitType, playerId, position) {
    if (this.entityFactory) {
      const validation = this.entityFactory.validateCreation('unit', {
        unitType,
        playerId,
        x: position.x,
        y: position.y
      });

      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      return this.entityFactory.createEntity('unit', {
        unitType,
        playerId,
        x: position.x,
        y: position.y
      });
    }

    // Fallback to gameState method
    return this.gameState.createUnit(unitType, playerId, position.x, position.y);
  }

  /**
   * Undo the last action
   * @returns {Object} Undo result
   */
  undoLastAction() {
    if (this.actionHandlers) {
      return this.actionHandlers.undo();
    }

    return { success: false, error: 'Undo not available' };
  }

  /**
   * Redo the last undone action
   * @returns {Object} Redo result
   */
  redoLastAction() {
    if (this.actionHandlers) {
      return this.actionHandlers.redo();
    }

    return { success: false, error: 'Redo not available' };
  }

  /**
   * Get command history for debugging
   * @returns {Array} Command history
   */
  getCommandHistory() {
    if (this.commandManager) {
      return this.commandManager.getHistory();
    }

    return [];
  }

  /**
   * Get pattern usage statistics
   * @returns {Object} Pattern statistics
   */
  getPatternStatistics() {
    const stats = {
      commandManager: null,
      gameStateEvents: null,
      uiStateEvents: null
    };

    if (this.commandManager) {
      stats.commandManager = this.commandManager.getStatistics();
    }

    if (this.gameState && typeof this.gameState.getStatistics === 'function') {
      stats.gameStateEvents = this.gameState.getStatistics();
    }

    if (this.uiStateManager && typeof this.uiStateManager.getStatistics === 'function') {
      stats.uiStateEvents = this.uiStateManager.getStatistics();
    }

    return stats;
  }

  endTurn() {
    // Disable turn actions if game has ended
    if (this.gameState.status === GAME_STATES.ENDED) {
      return;
    }

    this.turnManager.forceEndTurn();
    // Clear selection through InputController
    if (this.inputController) {
      this.inputController.setSelectedUnit(null);
      this.inputController.setSelectedCell(null);
    }
    this.gameState.emit('unitDeselected');
    this.updateUI();
  }

  nextPhase() {
    // Disable phase changes if game has ended
    if (this.gameState.status === GAME_STATES.ENDED) {
      return;
    }

    this.turnManager.nextPhase();
    this.updateUI();
  }

  gatherResources() {
    // Disable resource gathering if game has ended
    if (this.gameState.status === GAME_STATES.ENDED) {
      return;
    }

    const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
    if (selectedUnit && selectedUnit.type === 'worker') {
      const result = this.resourceManager.gatherResources(selectedUnit.id);
      if (result.success) {
        this.updateStatus(`Gathered ${result.amount} resources`);
      } else {
        this.updateStatus(`Cannot gather: ${result.reason}`);
      }
      this.updateUI();
    } else {
      this.updateStatus('Select a worker unit to gather resources');
    }
  }

  surrender() {
    // Disable surrender if game has ended
    if (this.gameState.status === GAME_STATES.ENDED) {
      return;
    }

    // Confirm surrender action
    if (confirm(`Player ${this.gameState.currentPlayer}, are you sure you want to surrender?`)) {
      this.gameState.playerSurrender(this.gameState.currentPlayer);
      this.updateStatus(`Player ${this.gameState.currentPlayer} surrendered!`);
      this.updateUI();
    }
  }

  offerDraw() {
    // Disable draw offer if game has ended
    if (this.gameState.status === GAME_STATES.ENDED) {
      return;
    }

    // Confirm draw offer
    if (confirm('Do you want to offer a draw to your opponent?')) {
      // In a real multiplayer game, this would send the offer to the other player
      // For now, we'll assume the other player accepts
      if (confirm('The other player accepts the draw. End the game in a draw?')) {
        this.gameState.declareDraw();
        this.updateStatus('Game ended in a draw by mutual agreement');
        this.updateUI();
      } else {
        this.updateStatus('Draw offer declined');
      }
    }
  }

  saveGame() {
    const result = this.persistenceManager.saveGame(this.gameState, this.resourceManager);
    if (result.success) {
      this.updateStatus('Game saved successfully');
    } else {
      this.updateStatus(`Save failed: ${result.error}`);
    }
  }

  async loadGame() {
    const result = this.persistenceManager.loadGame();
    if (result.success) {
      // Clean up existing instances before loading
      if (this.turnManager) {
        this.turnManager.destroy();
      }
      if (this.commandManager) {
        this.commandManager.clear();
      }

      this.gameState = result.gameState;
      this.turnManager = new TurnManager(this.gameState);
      this.resourceManager = result.resourceManager;

      // Reinitialize patterns after loading
      const patterns = await PatternIntegrator.setupPatterns(this);
      this.commandManager = patterns.commandManager;
      this.actionHandlers = await PatternIntegrator.createActionHandlers(this, this.commandManager);

      this.setupGameEventListeners();
      this.render();
      this.updateUI();
      this.updateStatus('Game loaded successfully');
    } else {
      this.updateStatus(`Load failed: ${result.error}`);
    }
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Starting complete game initialization...');
    
    // Step 1: Create game instance
    const game = new Game();
    await game.initialize();
    console.log('✅ Core game initialized');
    
    // Step 2: Initialize ServiceBootstrap with component system
    const bootstrap = new ServiceBootstrap();
    const services = await bootstrap.initialize(game, {
      enableDebugMode: true,
      strictMode: false
    });
    
    console.log('✅ ServiceBootstrap initialized with components');
    console.log('✅ Game fully initialized with modular UI architecture');
    
    // Make services available globally for debugging
    window.services = services;
    
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
    
    // Show error to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    errorDiv.textContent = `Game initialization failed: ${error.message}`;
    document.body.appendChild(errorDiv);
  }
});
