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
} from '../shared/constants.js';

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

// Import controllers and rendering
import { InputController } from './js/controllers/InputController.js';
import { GameRenderer } from './js/rendering/GameRenderer.js';

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

    // Initialize rendering system
    this.renderer = new GameRenderer(this.gameState, this.resourceManager);

    // Initialize input controller after other components
    this.inputController = new InputController(this.gameState, this.turnManager, this.uiManager, this.renderer);

    // Make game accessible globally for victory screen buttons
    window.game = this;

    this.init();
  }

  init() {
    this.setupGameEventListeners();
    this.updateCanvasSize();
    this.render();
    this.updateUI();
    console.log('Grid Strategy Game initialized with state management and InputController');
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

  newGame() {
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

    // Setup event listeners for new game state
    this.setupGameEventListeners();

    // Start the game
    this.gameState.startGame();

    this.render();
    this.updateUI();
    this.updateStatus('New game started');
    console.log('New game started with state management');
  }

  reset() {
    this.newGame();
    this.updateStatus('Game reset');
    console.log('Game reset');
  }

  updateUI() {
    // Ensure we have valid game state before updating
    if (!this.gameState || this.gameState.status === 'ended') {
      return;
    }

    // Legacy UI update - keeping for compatibility
    this.updatePlayerDisplay();
    this.updateGameInfo();

    // New UI system updates are handled automatically via event listeners
    // UI components subscribe to game state events and update themselves
  }

  updatePlayerDisplay() {
    const playerElement = document.getElementById('currentPlayer');
    if (playerElement && this.gameState) {
      const currentPlayer = this.gameState.getCurrentPlayer();
      if (currentPlayer) {
        playerElement.textContent = `Player ${currentPlayer.id}'s Turn`;
        // Add visual indication for current player
        playerElement.className = `current-player player-${currentPlayer.id}`;
      }
    }
  }

  updateGameInfo() {
    // Update turn number display (both header and sidebar)
    const turnElement = document.getElementById('turnNumber');
    if (turnElement) {
      turnElement.textContent = `Turn: ${this.gameState.turnNumber}`;
    }
    
    const headerTurnElement = document.getElementById('turnDisplay');
    if (headerTurnElement) {
      headerTurnElement.textContent = this.gameState.turnNumber;
    }

    // Update phase display (both header and sidebar)
    const phaseElement = document.getElementById('gamePhase');
    if (phaseElement) {
      phaseElement.textContent = `Phase: ${this.gameState.currentPhase}`;
    }
    
    const headerPhaseElement = document.getElementById('phaseDisplay');
    if (headerPhaseElement) {
      headerPhaseElement.textContent = this.gameState.currentPhase;
    }

    // Update player info
    const player = this.gameState.getCurrentPlayer();
    if (player) {
      const energyElement = document.getElementById('playerEnergy');
      if (energyElement) {
        energyElement.textContent = `Energy: ${player.energy}`;
      }

      const actionsElement = document.getElementById('playerActions');
      if (actionsElement) {
        actionsElement.textContent = `Actions: ${player.actionsRemaining}`;
      }

      const unitsElement = document.getElementById('playerUnits');
      if (unitsElement) {
        unitsElement.textContent = `Units: ${player.unitsOwned.size}`;
      }
    }

    // Update selected unit info
    const selectedUnitElement = document.getElementById('selectedUnit');
    if (selectedUnitElement) {
      const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
      if (selectedUnit) {
        const stats = selectedUnit.getStats();
        selectedUnitElement.innerHTML = `
                    <strong>${stats.name}</strong><br>
                    Health: ${selectedUnit.health}/${selectedUnit.maxHealth}<br>
                    Actions: ${selectedUnit.actionsUsed}/${selectedUnit.maxActions}
                `;
      } else {
        selectedUnitElement.innerHTML = 'No unit selected';
      }
    }

    // Update gather button state
    const gatherBtn = document.getElementById('gatherBtn');
    if (gatherBtn) {
      const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
      const canGather = selectedUnit &&
                             selectedUnit.type === 'worker' &&
                             this.gameState.currentPhase === 'resource' &&
                             selectedUnit.canAct() &&
                             this.resourceManager.canGatherAtPosition(selectedUnit.id);

      gatherBtn.disabled = !canGather;

      if (canGather) {
        gatherBtn.textContent = 'Gather Resources (G)';
      } else if (!selectedUnit) {
        gatherBtn.textContent = 'Select Worker';
      } else if (selectedUnit.type !== 'worker') {
        gatherBtn.textContent = 'Worker Only';
      } else if (this.gameState.currentPhase !== 'resource') {
        gatherBtn.textContent = 'Resource Phase Only';
      } else if (!selectedUnit.canAct()) {
        gatherBtn.textContent = 'No Actions Left';
      } else {
        gatherBtn.textContent = 'No Resources Nearby';
      }
    }
  }

  updateStatus(message) {
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
      statusElement.textContent = message;
    }
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

  loadGame() {
    const result = this.persistenceManager.loadGame();
    if (result.success) {
      // Clean up existing instances before loading
      if (this.turnManager) {
        this.turnManager.destroy();
      }
      
      this.gameState = result.gameState;
      this.turnManager = new TurnManager(this.gameState);
      this.resourceManager = result.resourceManager;

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
document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
