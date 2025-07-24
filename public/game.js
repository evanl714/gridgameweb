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

// Import controllers
import { InputController } from './js/controllers/InputController.js';

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

    // Initialize input controller after other components
    this.inputController = new InputController(this.gameState, this.turnManager, this.uiManager, this);

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
    // Only render to canvas if canvas exists
    if (this.ctx) {
      this.clearCanvas();
      this.drawGrid();
      this.drawHover();
      this.drawSelection();
      this.drawMovementRange();
      this.drawMovementPreview();
      this.drawResourceNodes();
      this.drawBases();
      this.drawUnits();
      this.drawUnitSelection();
    }
    // Grid rendering will be handled by the adapter in HTML
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    // Fill entire canvas with dark tactical background
    this.ctx.fillStyle = UI_COLORS.GRID_BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw alternating tactical grid pattern with StarCraft 2 aesthetic
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        // Determine if this square should be light or dark
        const isLight = (x + y) % 2 === 0;
        this.ctx.fillStyle = isLight ? UI_COLORS.GRID_LIGHT : UI_COLORS.GRID_DARK;
        
        // Draw base cell
        this.ctx.fillRect(
          x * this.cellSize,
          y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
        
        // Add subtle inner glow effect for strategic feel
        if (isLight) {
          this.ctx.fillStyle = UI_COLORS.GRID_ACCENT;
          this.ctx.fillRect(
            x * this.cellSize + 1,
            y * this.cellSize + 1,
            this.cellSize - 2,
            this.cellSize - 2
          );
        }
      }
    }
    
    // Draw tactical grid lines with enhanced visibility
    this.ctx.strokeStyle = UI_COLORS.GRID_LINE;
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.8;
    
    // Draw vertical lines
    for (let i = 0; i <= this.gridSize; i++) {
      const x = i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= this.gridSize; i++) {
      const y = i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    
    // Draw enhanced border lines every 5 cells for tactical reference
    this.ctx.strokeStyle = UI_COLORS.GRID_BORDER_GLOW;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.6;
    
    for (let i = 0; i <= this.gridSize; i += 5) {
      const pos = i * this.cellSize;
      
      // Vertical tactical lines
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, this.canvas.height);
      this.ctx.stroke();
      
      // Horizontal tactical lines
      this.ctx.beginPath();
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(this.canvas.width, pos);
      this.ctx.stroke();
    }
    
    // Reset alpha for other drawing operations
    this.ctx.globalAlpha = 1.0;
  }

  drawHover() {
    const hoveredCell = this.inputController ? this.inputController.getHoveredCell() : null;
    if (hoveredCell) {
      this.ctx.fillStyle = UI_COLORS.HOVER;
      this.ctx.fillRect(
        hoveredCell.x * this.cellSize,
        hoveredCell.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }
  }

  drawSelection() {
    const selectedCell = this.inputController ? this.inputController.getSelectedCell() : null;
    if (selectedCell) {
      this.ctx.fillStyle = UI_COLORS.SELECTION;
      this.ctx.fillRect(
        selectedCell.x * this.cellSize,
        selectedCell.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );

      this.ctx.strokeStyle = UI_COLORS.SELECTION_BORDER;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(
        selectedCell.x * this.cellSize,
        selectedCell.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }
  }

  drawResourceNodes() {
    const resourceInfo = this.resourceManager.getResourceNodeInfo();
    resourceInfo.forEach(nodeInfo => {
      const node = nodeInfo.position;
      // Draw resource node as a filled circle
      const centerX = node.x * this.cellSize + this.cellSize / 2;
      const centerY = node.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize * 0.3;

      // Check if this node is gatherable by selected worker
      const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
      const isGatherable = selectedUnit &&
                               selectedUnit.type === 'worker' &&
                               this.gameState.currentPhase === 'resource' &&
                               nodeInfo.value > 0 &&
                               Math.abs(node.x - selectedUnit.position.x) <= 1 &&
                               Math.abs(node.y - selectedUnit.position.y) <= 1;

      // Highlight gatherable nodes
      if (isGatherable) {
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; // Gold highlight
        this.ctx.fillRect(
          node.x * this.cellSize,
          node.y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }

      // Color based on resource availability
      const efficiency = nodeInfo.efficiency;
      const alpha = 0.3 + (efficiency * 0.7); // More transparent when depleted
      this.ctx.fillStyle = `rgba(50, 205, 50, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();

      // Add border - gold for gatherable, dark green for normal
      this.ctx.strokeStyle = isGatherable ? '#FFD700' : '#228B22';
      this.ctx.lineWidth = isGatherable ? 3 : 2;
      this.ctx.stroke();

      // Draw resource value text
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        nodeInfo.value.toString(),
        centerX,
        centerY
      );
    });
  }

  drawBases() {
    Array.from(this.gameState.bases.values()).forEach(base => {
      if (base.isDestroyed) return; // Don't draw destroyed bases

      const centerX = base.position.x * this.cellSize + this.cellSize / 2;
      const centerY = base.position.y * this.cellSize + this.cellSize / 2;

      // Get player color and base character
      const color = PLAYER_COLORS[base.playerId] || '#666666';
      const character = ENTITY_CHARACTERS.base || '⬛';

      // Set font for Unicode character rendering
      const fontSize = this.cellSize * 0.8; // Slightly larger than units
      this.ctx.font = `${fontSize}px serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // Add subtle text shadow for better visibility
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;
      this.ctx.shadowBlur = 2;

      // Draw base character
      this.ctx.fillStyle = color;
      this.ctx.fillText(character, centerX, centerY);

      // Reset shadow
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.shadowBlur = 0;

      // Draw health bar for bases if damaged
      if (base.health < base.maxHealth) {
        const barWidth = this.cellSize * 0.8;
        const barHeight = 4;
        const barX = base.position.x * this.cellSize + (this.cellSize - barWidth) / 2;
        const barY = base.position.y * this.cellSize + this.cellSize - 8;

        // Background
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health portion
        const healthPercent = base.health / base.maxHealth;
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }
    });
  }

  drawUnits() {
    Array.from(this.gameState.units.values()).forEach(unit => {
      const centerX = unit.position.x * this.cellSize + this.cellSize / 2;
      const centerY = unit.position.y * this.cellSize + this.cellSize / 2;

      // Get player color and Unicode character
      const color = PLAYER_COLORS[unit.playerId] || '#666666';
      const character = UNIT_CHARACTERS[unit.type] || '?';

      // Set font for Unicode character rendering
      const fontSize = this.cellSize * 0.6; // Slightly smaller than full cell
      this.ctx.font = `${fontSize}px serif`; // Serif fonts typically have better Unicode support
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // Add subtle text shadow for better visibility
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;
      this.ctx.shadowBlur = 2;

      // Draw Unicode character
      this.ctx.fillStyle = color;
      this.ctx.fillText(character, centerX, centerY);

      // Reset shadow
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.shadowBlur = 0;

      // Draw health bar above the unit
      const healthBarY = centerY - fontSize / 2 - 8;
      this.drawUnitHealthBar(unit, centerX, healthBarY);

      // Draw action indicator
      const indicatorX = centerX + fontSize / 2;
      const indicatorY = centerY - fontSize / 2;
      if (unit.actionsUsed >= unit.maxActions) {
        this.drawActionIndicator(indicatorX, indicatorY, 'exhausted');
      } else if (unit.actionsUsed > 0) {
        this.drawActionIndicator(indicatorX, indicatorY, 'partial');
      }
    });
  }

  drawUnitHealthBar(unit, centerX, y) {
    const barWidth = this.cellSize * 0.6;
    const barHeight = 4;
    const healthPercent = unit.health / unit.maxHealth;

    // Background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(centerX - barWidth/2, y, barWidth, barHeight);

    // Health bar
    const healthColor = healthPercent > 0.6 ? '#4CAF50' :
      healthPercent > 0.3 ? '#FF9800' : '#F44336';
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(centerX - barWidth/2, y, barWidth * healthPercent, barHeight);
  }

  drawActionIndicator(x, y, status) {
    const size = 6;
    const color = status === 'exhausted' ? '#F44336' : '#FF9800';

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size/2, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  drawUnitSelection() {
    const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
    if (selectedUnit) {
      const centerX = selectedUnit.position.x * this.cellSize + this.cellSize / 2;
      const centerY = selectedUnit.position.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize * 0.4;

      // Draw selection ring
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  drawMovementRange() {
    const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
    const showMovementRange = this.inputController ? this.inputController.getShowMovementRange() : false;
    if (selectedUnit && showMovementRange) {
      const validMoves = this.gameState.getValidMovePositions(selectedUnit.id);

      for (const move of validMoves) {
        const x = move.x * this.cellSize;
        const y = move.y * this.cellSize;

        // Draw valid move highlight
        this.ctx.fillStyle = MOVEMENT_COLORS.VALID_MOVE;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // Draw border
        this.ctx.strokeStyle = MOVEMENT_COLORS.VALID_MOVE_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // Draw movement cost indicator
        if (move.cost > 1) {
          this.ctx.fillStyle = MOVEMENT_COLORS.MOVEMENT_COST;
          this.ctx.font = '12px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(
            move.cost.toString(),
            x + this.cellSize / 2,
            y + this.cellSize / 2
          );
        }
      }
    }
  }

  drawMovementPreview() {
    const movementPreview = this.inputController ? this.inputController.getMovementPreview() : null;
    const selectedUnit = this.inputController ? this.inputController.getSelectedUnit() : null;
    if (movementPreview && selectedUnit) {
      const x = movementPreview.x * this.cellSize;
      const y = movementPreview.y * this.cellSize;

      // Draw preview highlight
      this.ctx.fillStyle = MOVEMENT_COLORS.PATH_PREVIEW;
      this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

      // Draw border
      this.ctx.strokeStyle = MOVEMENT_COLORS.PATH_PREVIEW_BORDER;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

      // Draw movement cost
      this.ctx.fillStyle = MOVEMENT_COLORS.MOVEMENT_COST;
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        `${movementPreview.cost}`,
        x + this.cellSize / 2,
        y + this.cellSize / 2 + 8
      );
    }
  }

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
