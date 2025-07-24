/**
 * InputController - Handles all user input and interaction logic
 * Extracted from monolithic Game class to improve separation of concerns
 */

import { GAME_STATES, GAME_CONFIG } from '../../shared/constants.js';
import { GameActions } from '../interfaces/GameActions.js';

export class InputController {
  constructor(gameState, turnManager, uiManager, renderer, gameActions = null) {
    this.gameState = gameState;
    this.turnManager = turnManager;
    this.uiManager = uiManager;
    this.renderer = renderer;
    this.gameActions = gameActions || new GameActions(window.game); // Fallback for backward compatibility
    
    // UI state for input handling
    this.selectedCell = null;
    this.hoveredCell = null;
    this.selectedUnit = null;
    this.movementPreview = null;
    this.showMovementRange = false;
    
    // Canvas reference for coordinate calculations
    this.canvas = document.getElementById('gameCanvas');
    this.cellSize = GAME_CONFIG.CELL_SIZE;
    this.gridSize = GAME_CONFIG.GRID_SIZE;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Canvas event listeners (only if canvas exists)
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => this.handleClick(e));
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Button event listeners
    this.setupButtonListeners();

    // Window resize for canvas
    window.addEventListener('resize', () => this.updateCanvasSize());
  }

  setupButtonListeners() {
    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => this.handleNewGame());
    }

    const nextPhaseBtn = document.getElementById('nextPhaseBtn');
    if (nextPhaseBtn) {
      nextPhaseBtn.addEventListener('click', () => this.handleNextPhase());
    }

    const gatherBtn = document.getElementById('gatherBtn');
    if (gatherBtn) {
      gatherBtn.addEventListener('click', () => this.handleGatherResources());
    }

    const surrenderBtn = document.getElementById('surrenderBtn');
    if (surrenderBtn) {
      surrenderBtn.addEventListener('click', () => this.handleSurrender());
    }

    const drawBtn = document.getElementById('drawBtn');
    if (drawBtn) {
      drawBtn.addEventListener('click', () => this.handleOfferDraw());
    }

    const loadBtn = document.getElementById('loadBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.handleLoadGame());
    }
  }

  handleClick(event) {
    const coords = this.getGridCoordinates(event);
    if (coords) {
      this.handleCellClick(coords.x, coords.y);
    }
  }

  handleCellClick(x, y) {
    // Disable all actions if game has ended
    if (this.gameState.status === GAME_STATES.ENDED) {
      this.updateStatus(`Game Over! Player ${this.gameState.winner} wins!`);
      return;
    }

    const unit = this.gameState.getUnitAt(x, y);

    if (this.selectedUnit) {
      this.handleSelectedUnitAction(x, y, unit);
    } else if (unit && unit.playerId === this.gameState.currentPlayer) {
      // Select unit and show movement range
      this.selectUnit(unit, x, y);
    } else {
      // Deselect or try to create unit
      this.handleCellSelection(x, y);
    }

    this.refreshDisplay();
  }

  handleSelectedUnitAction(x, y, unit) {
    // Only allow actions for units owned by current player
    if (this.selectedUnit.playerId !== this.gameState.currentPlayer) {
      return;
    }

    const canAttack = this.gameState.currentPhase === 'action' && 
                     this.gameState.canUnitAttack(this.selectedUnit.id, x, y);
    
    if (canAttack) {
      this.handleAttackAction(x, y);
    } else {
      this.handleMoveOrSelectAction(x, y, unit);
    }
  }

  handleAttackAction(x, y) {
    const targetEntity = this.gameState.getEntityAt(x, y);
    const attacked = this.gameState.attackUnit(this.selectedUnit.id, x, y);
    
    if (attacked) {
      this.turnManager.usePlayerAction();
      this.clearSelection();
      this.gameState.emit('unitDeselected');
      this.updateStatus(`Attack successful! Target: ${targetEntity.type}`);
    }
  }

  handleMoveOrSelectAction(x, y, unit) {
    const canMove = this.gameState.canUnitMoveTo(this.selectedUnit.id, x, y);
    
    if (canMove) {
      this.handleMoveAction(x, y);
    } else if (unit && unit.playerId === this.gameState.currentPlayer) {
      // Select different unit
      this.selectUnit(unit, x, y);
    } else {
      // Invalid move or attack - provide feedback
      this.provideMoveAttackFeedback(x, y);
    }
  }

  handleMoveAction(x, y) {
    const movementCost = this.gameState.calculateMovementCost(this.selectedUnit.id, x, y);
    const moved = this.gameState.moveUnit(this.selectedUnit.id, x, y);
    
    if (moved) {
      this.turnManager.usePlayerAction();
      this.clearSelection();
      this.gameState.emit('unitDeselected');
      this.updateStatus(`Unit moved (cost: ${movementCost})`);
    }
  }

  selectUnit(unit, x, y) {
    this.selectedUnit = unit;
    this.selectedCell = { x, y };
    this.showMovementRange = true;
    this.gameState.emit('unitSelected', unit);
    this.updateStatus(`Unit selected: ${unit.type} (${unit.maxActions - unit.actionsUsed} actions left)`);
  }

  clearSelection() {
    this.selectedUnit = null;
    this.selectedCell = null;
    this.showMovementRange = false;
    this.movementPreview = null;
  }

  handleCellSelection(x, y) {
    if (this.gameState.currentPhase === 'build' && this.gameState.isPositionEmpty(x, y)) {
      this.selectedCell = { x, y };
      
      // Notify BuildPanelSidebar of selected position for building
      if (this.uiManager && this.uiManager.buildPanelSidebar) {
        this.uiManager.buildPanelSidebar.setSelectedPosition({ x, y });
      }
      
      // Emit event for other components
      this.gameState.emit('cellSelected', { position: { x, y } });
      
      this.showUnitCreationDialog(x, y);
    } else {
      this.selectedCell = { x, y };
      
      // Notify BuildPanelSidebar of selected position for building
      if (this.gameState.isPositionEmpty(x, y) && this.uiManager && this.uiManager.buildPanelSidebar) {
        this.uiManager.buildPanelSidebar.setSelectedPosition({ x, y });
      }
      
      // Emit event for other components
      this.gameState.emit('cellSelected', { position: { x, y } });
      this.clearSelection();
      this.gameState.emit('unitDeselected');
      this.updateStatus(`Selected cell: (${x}, ${y})`);
    }
  }

  provideMoveAttackFeedback(x, y) {
    const distance = this.gameState.getMovementDistance(
      this.selectedUnit.position.x, 
      this.selectedUnit.position.y, 
      x, y
    );
    const remaining = this.selectedUnit.maxActions - this.selectedUnit.actionsUsed;
    
    if (distance > remaining) {
      this.updateStatus(`Cannot move: distance ${distance} > ${remaining} actions remaining`);
    } else if (!this.gameState.isPositionEmpty(x, y)) {
      const targetEntity = this.gameState.getEntityAt(x, y);
      if (targetEntity && targetEntity.entity.playerId === this.selectedUnit.playerId) {
        this.updateStatus('Cannot attack: friendly unit/base');
      } else {
        this.updateStatus('Cannot attack: target out of range (must be adjacent)');
      }
    }
  }

  showUnitCreationDialog(x, y) {
    // Use the new build panel instead of prompt dialog
    const buildPanel = this.uiManager.getComponent('build');
    if (buildPanel) {
      buildPanel.show({ x, y });
    }
  }

  handleMouseMove(event) {
    const coords = this.getGridCoordinates(event);
    if (coords) {
      if (!this.hoveredCell || this.hoveredCell.x !== coords.x || this.hoveredCell.y !== coords.y) {
        this.hoveredCell = coords;

        // Update movement preview
        if (this.selectedUnit && this.showMovementRange) {
          const movementCost = this.gameState.calculateMovementCost(this.selectedUnit.id, coords.x, coords.y);
          if (movementCost > 0) {
            this.movementPreview = { x: coords.x, y: coords.y, cost: movementCost };
          } else {
            this.movementPreview = null;
          }
        } else {
          this.movementPreview = null;
        }

        this.refreshDisplay();
      }
    }
  }

  handleMouseLeave() {
    if (this.hoveredCell) {
      this.hoveredCell = null;
      this.movementPreview = null;
      this.refreshDisplay();
    }
  }

  handleKeyDown(event) {
    // Disable all keyboard actions if game has ended
    if (this.gameState.status === GAME_STATES.ENDED) {
      return;
    }

    switch(event.key) {
      case 'r':
      case 'R':
        // Toggle movement range display
        this.handleToggleMovementRange();
        break;
      case 'g':
      case 'G':
        // Gather resources with selected worker
        this.handleGatherKeypress();
        break;
      case 'Escape':
        // Deselect unit
        this.handleEscapeKey();
        break;
    }
  }

  handleToggleMovementRange() {
    if (this.selectedUnit) {
      this.showMovementRange = !this.showMovementRange;
      if (!this.showMovementRange) {
        this.movementPreview = null;
      }
      this.refreshDisplay();
      this.updateStatus(this.showMovementRange ? 'Movement range shown' : 'Movement range hidden');
    }
  }

  handleGatherKeypress() {
    if (this.selectedUnit && this.selectedUnit.type === 'worker' &&
        this.gameState.currentPhase === 'resource') {
      this.handleGatherResources();
    } else if (!this.selectedUnit) {
      this.updateStatus('Select a worker unit first to gather resources');
    } else if (this.selectedUnit.type !== 'worker') {
      this.updateStatus('Only worker units can gather resources');
    } else if (this.gameState.currentPhase !== 'resource') {
      this.updateStatus('Can only gather during Resource phase');
    }
  }

  handleEscapeKey() {
    this.clearSelection();
    this.gameState.emit('unitDeselected');
    this.refreshDisplay();
    this.updateStatus('Unit deselected');
  }

  getGridCoordinates(event) {
    if (!this.canvas) return null;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Account for canvas scaling
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const adjustedX = x * scaleX;
    const adjustedY = y * scaleY;

    const gridX = Math.floor(adjustedX / this.cellSize);
    const gridY = Math.floor(adjustedY / this.cellSize);

    if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
      return { x: gridX, y: gridY };
    }
    return null;
  }

  updateCanvasSize() {
    if (this.canvas) {
      const totalSize = this.gridSize * this.cellSize;
      this.canvas.width = totalSize;
      this.canvas.height = totalSize;
    }
  }

  // Button handler methods - delegate to game actions
  handleNewGame() {
    this.gameActions.newGame();
  }

  handleNextPhase() {
    this.gameActions.nextPhase();
  }

  handleGatherResources() {
    this.gameActions.gatherResources();
  }

  handleSurrender() {
    this.gameActions.surrender();
  }

  handleOfferDraw() {
    this.gameActions.offerDraw();
  }

  handleLoadGame() {
    this.gameActions.loadGame();
  }

  // Utility methods
  updateStatus(message) {
    this.gameActions.updateStatus(message);
  }

  refreshDisplay() {
    if (this.renderer && typeof this.renderer.render === 'function') {
      this.renderer.render();
    } else {
      this.gameActions.render();
    }
    
    this.gameActions.updateUI();
  }

  // Getters for accessing state
  getSelectedCell() {
    return this.selectedCell;
  }

  getSelectedUnit() {
    return this.selectedUnit;
  }

  getHoveredCell() {
    return this.hoveredCell;
  }

  getMovementPreview() {
    return this.movementPreview;
  }

  getShowMovementRange() {
    return this.showMovementRange;
  }

  // Setters for external control
  setSelectedCell(cell) {
    this.selectedCell = cell;
  }

  setSelectedUnit(unit) {
    this.selectedUnit = unit;
  }

  setShowMovementRange(show) {
    this.showMovementRange = show;
  }

  // Public method for external cell click handling (from HTML grid)
  handleCellClickExternal(x, y) {
    this.handleCellClick(x, y);
  }
}