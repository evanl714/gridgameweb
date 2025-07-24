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

// Import UI components
import { UIManager } from './ui/uiManager.js';
import { ResourceDisplay } from './ui/resourceDisplay.js';
import { TurnInterface } from './ui/turnInterface.js';
import { GameStatus } from './ui/gameStatus.js';
import { UnitDisplay } from './ui/unitDisplay.js';
import { VictoryScreen } from './ui/victoryScreen.js';
import { BuildPanelSidebar } from './ui/buildPanelSidebar.js';
import { UnitInfoSidebar } from './ui/unitInfoSidebar.js';

// Import controllers, rendering, and managers
import { InputController } from './js/controllers/InputController.js';
import { GameRenderer } from './js/rendering/GameRenderer.js';
import { UIStateManager } from './js/managers/UIStateManager.js';

// Import design patterns
import {
  CommandManager,
  EntityFactory,
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

    // Input controller handles UI state and interaction
    this.inputController = null; // Will be initialized after other components

    // Initialize game state management
    this.gameState = new GameState();
    this.turnManager = new TurnManager(this.gameState);
    this.resourceManager = new ResourceManager(this.gameState);
    this.persistenceManager = new PersistenceManager();

    // Initialize UI system
    this.uiManager = new UIManager(this.gameState, this.turnManager);
    this.victoryScreen = new VictoryScreen(this.gameState);

    // Initialize UI state manager
    this.uiStateManager = new UIStateManager(this.gameState, this.turnManager);

    // Initialize rendering system
    this.renderer = new GameRenderer(this.gameState, this.resourceManager);

    // Pattern-related properties will be initialized async
    this.commandManager = null;
    this.entityFactory = null;
    this.actionHandlers = null;

    // Input controller will be initialized after patterns
    this.inputController = null;

    // Make game accessible globally for victory screen buttons
    window.game = this;
  }

  /**
   * Async initialization of patterns and final setup
   */
  async initialize() {
    try {
      // Initialize design patterns asynchronously
      const patterns = await PatternIntegrator.setupPatterns(this);
      this.commandManager = patterns.commandManager;
      this.entityFactory = patterns.entityFactory;
      this.actionHandlers = await PatternIntegrator.createActionHandlers(this, this.commandManager);

      // Initialize input controller after patterns are ready
      this.inputController = new InputController(this.gameState, this.turnManager, this.uiManager, this.renderer);

      // Complete initialization
      this.finishInitialization();

      console.log('Grid Strategy Game initialized with patterns and InputController');
    } catch (error) {
      console.error('Failed to initialize game patterns:', error);
      throw error;
    }
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
    this.uiStateManager = new UIStateManager(this.gameState, this.turnManager);

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
    window.game = new Game();
    await window.game.initialize();
    console.log('Game fully initialized');
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});
