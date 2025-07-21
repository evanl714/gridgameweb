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

class Game {
  constructor() {
    // Canvas is optional for grid-based UI
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.gridSize = GAME_CONFIG.GRID_SIZE; // 25x25
    this.cellSize = GAME_CONFIG.CELL_SIZE; // 32 pixels per cell

    // UI state
    this.selectedCell = null;
    this.hoveredCell = null;
    this.selectedUnit = null;
    this.movementPreview = null; // Stores {x, y, cost} for hover preview
    this.showMovementRange = false; // Toggle for movement range display

    // Initialize game state management
    this.gameState = new GameState();
    this.turnManager = new TurnManager(this.gameState);
    this.resourceManager = new ResourceManager(this.gameState);
    this.persistenceManager = new PersistenceManager();

    // Initialize UI system
    this.uiManager = new UIManager(this.gameState, this.turnManager);
    this.victoryScreen = new VictoryScreen(this.gameState);

    // Make game accessible globally for victory screen buttons
    window.game = this;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupGameEventListeners();
    this.updateCanvasSize();
    this.render();
    this.updateUI();
    console.log('Grid Strategy Game initialized with state management');
  }

  setupGameEventListeners() {
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

  setupEventListeners() {
    // Only set up canvas listeners if canvas exists (grid UI doesn't use canvas)
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => this.handleClick(e));
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());

    // Add additional controls
    const endTurnBtn = document.getElementById('endTurnBtn');
    if (endTurnBtn) {
      endTurnBtn.addEventListener('click', () => this.endTurn());
    }

    const nextPhaseBtn = document.getElementById('nextPhaseBtn');
    if (nextPhaseBtn) {
      nextPhaseBtn.addEventListener('click', () => this.nextPhase());
    }

    const gatherBtn = document.getElementById('gatherBtn');
    if (gatherBtn) {
      gatherBtn.addEventListener('click', () => this.gatherResources());
    }

    const surrenderBtn = document.getElementById('surrenderBtn');
    if (surrenderBtn) {
      surrenderBtn.addEventListener('click', () => this.surrender());
    }

    const drawBtn = document.getElementById('drawBtn');
    if (drawBtn) {
      drawBtn.addEventListener('click', () => this.offerDraw());
    }


    const loadBtn = document.getElementById('loadBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadGame());
    }

    window.addEventListener('resize', () => this.updateCanvasSize());
  }

  updateCanvasSize() {
    if (this.canvas) {
      const totalSize = this.gridSize * this.cellSize;
      this.canvas.width = totalSize;
      this.canvas.height = totalSize;
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
      // Try to attack or move selected unit
      if (this.selectedUnit.playerId === this.gameState.currentPlayer) {
        // Check if this is a valid attack (only during action phase)
        const canAttack = this.gameState.currentPhase === 'action' && this.gameState.canUnitAttack(this.selectedUnit.id, x, y);
        if (canAttack) {
          const targetEntity = this.gameState.getEntityAt(x, y);
          const attacked = this.gameState.attackUnit(this.selectedUnit.id, x, y);
          if (attacked) {
            this.turnManager.usePlayerAction();
            this.selectedUnit = null;
            this.selectedCell = null;
            this.showMovementRange = false;
            this.movementPreview = null;
            this.gameState.emit('unitDeselected');
            this.updateStatus(`Attack successful! Target: ${targetEntity.type}`);
          }
        } else {
          // Try to move selected unit
          const canMove = this.gameState.canUnitMoveTo(this.selectedUnit.id, x, y);
          if (canMove) {
            const movementCost = this.gameState.calculateMovementCost(this.selectedUnit.id, x, y);
            const moved = this.gameState.moveUnit(this.selectedUnit.id, x, y);
            if (moved) {
              this.turnManager.usePlayerAction();
              this.selectedUnit = null;
              this.selectedCell = null;
              this.showMovementRange = false;
              this.movementPreview = null;
              this.gameState.emit('unitDeselected');
              this.updateStatus(`Unit moved (cost: ${movementCost})`);
            }
          } else if (unit && unit.playerId === this.gameState.currentPlayer) {
            // Select different unit
            this.selectedUnit = unit;
            this.selectedCell = { x, y };
            this.showMovementRange = true;
            this.gameState.emit('unitSelected', unit);
            this.updateStatus(`Unit selected: ${unit.type} (${unit.maxActions - unit.actionsUsed} actions left)`);
          } else {
            // Invalid move or attack - provide feedback
            const distance = this.gameState.getMovementDistance(this.selectedUnit.position.x, this.selectedUnit.position.y, x, y);
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
        }
      }
    } else if (unit && unit.playerId === this.gameState.currentPlayer) {
      // Select unit and show movement range
      this.selectedUnit = unit;
      this.selectedCell = { x, y };
      this.showMovementRange = true;
      this.gameState.emit('unitSelected', unit);
      this.updateStatus(`Unit selected: ${unit.type} (${unit.maxActions - unit.actionsUsed} actions left)`);
    } else {
      // Deselect or try to create unit
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
        this.selectedUnit = null;
        this.showMovementRange = false;
        this.movementPreview = null;
        this.gameState.emit('unitDeselected');
        this.updateStatus(`Selected cell: (${x}, ${y})`);
      }
    }

    this.render();
    this.updateUI();
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

        this.render();
      }
    }
  }

  handleMouseLeave() {
    if (this.hoveredCell) {
      this.hoveredCell = null;
      this.movementPreview = null;
      this.render();
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
      if (this.selectedUnit) {
        this.showMovementRange = !this.showMovementRange;
        if (!this.showMovementRange) {
          this.movementPreview = null;
        }
        this.render();
        this.updateStatus(this.showMovementRange ? 'Movement range shown' : 'Movement range hidden');
      }
      break;
    case 'g':
    case 'G':
      // Gather resources with selected worker
      if (this.selectedUnit && this.selectedUnit.type === 'worker' &&
                    this.gameState.currentPhase === 'resource') {
        this.gatherResources();
      } else if (!this.selectedUnit) {
        this.updateStatus('Select a worker unit first to gather resources');
      } else if (this.selectedUnit.type !== 'worker') {
        this.updateStatus('Only worker units can gather resources');
      } else if (this.gameState.currentPhase !== 'resource') {
        this.updateStatus('Can only gather during Resource phase');
      }
      break;
    case 'Escape':
      // Deselect unit
      this.selectedUnit = null;
      this.selectedCell = null;
      this.showMovementRange = false;
      this.movementPreview = null;
      this.gameState.emit('unitDeselected');
      this.render();
      this.updateStatus('Unit deselected');
      break;
    }
  }

  getGridCoordinates(event) {
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

  selectCell(x, y) {
    this.selectedCell = { x, y };
    this.render();
    this.updateStatus(`Selected cell: (${x}, ${y})`);
    console.log(`Cell selected: (${x}, ${y})`);
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
    if (this.hoveredCell) {
      this.ctx.fillStyle = UI_COLORS.HOVER;
      this.ctx.fillRect(
        this.hoveredCell.x * this.cellSize,
        this.hoveredCell.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }
  }

  drawSelection() {
    if (this.selectedCell) {
      this.ctx.fillStyle = UI_COLORS.SELECTION;
      this.ctx.fillRect(
        this.selectedCell.x * this.cellSize,
        this.selectedCell.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );

      this.ctx.strokeStyle = UI_COLORS.SELECTION_BORDER;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(
        this.selectedCell.x * this.cellSize,
        this.selectedCell.y * this.cellSize,
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
      const isGatherable = this.selectedUnit &&
                               this.selectedUnit.type === 'worker' &&
                               this.gameState.currentPhase === 'resource' &&
                               nodeInfo.value > 0 &&
                               Math.abs(node.x - this.selectedUnit.position.x) <= 1 &&
                               Math.abs(node.y - this.selectedUnit.position.y) <= 1;

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
    if (this.selectedUnit) {
      const centerX = this.selectedUnit.position.x * this.cellSize + this.cellSize / 2;
      const centerY = this.selectedUnit.position.y * this.cellSize + this.cellSize / 2;
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
    if (this.selectedUnit && this.showMovementRange) {
      const validMoves = this.gameState.getValidMovePositions(this.selectedUnit.id);

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
    if (this.movementPreview && this.selectedUnit) {
      const x = this.movementPreview.x * this.cellSize;
      const y = this.movementPreview.y * this.cellSize;

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
        `${this.movementPreview.cost}`,
        x + this.cellSize / 2,
        y + this.cellSize / 2 + 8
      );
    }
  }

  newGame() {
    // Clean up existing UI components
    if (this.uiManager) {
      this.uiManager.destroy();
    }
    if (this.victoryScreen) {
      this.victoryScreen.destroy();
    }

    // Reset state management
    this.gameState = new GameState();
    this.turnManager = new TurnManager(this.gameState);
    this.resourceManager = new ResourceManager(this.gameState);

    // Reset UI state
    this.selectedCell = null;
    this.hoveredCell = null;
    this.selectedUnit = null;
    this.movementPreview = null;
    this.showMovementRange = false;
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
      if (this.selectedUnit) {
        const stats = this.selectedUnit.getStats();
        selectedUnitElement.innerHTML = `
                    <strong>${stats.name}</strong><br>
                    Health: ${this.selectedUnit.health}/${this.selectedUnit.maxHealth}<br>
                    Actions: ${this.selectedUnit.actionsUsed}/${this.selectedUnit.maxActions}
                `;
      } else {
        selectedUnitElement.innerHTML = 'No unit selected';
      }
    }

    // Update gather button state
    const gatherBtn = document.getElementById('gatherBtn');
    if (gatherBtn) {
      const canGather = this.selectedUnit &&
                             this.selectedUnit.type === 'worker' &&
                             this.gameState.currentPhase === 'resource' &&
                             this.selectedUnit.canAct() &&
                             this.resourceManager.canGatherAtPosition(this.selectedUnit.id);

      gatherBtn.disabled = !canGather;

      if (canGather) {
        gatherBtn.textContent = 'Gather Resources (G)';
      } else if (!this.selectedUnit) {
        gatherBtn.textContent = 'Select Worker';
      } else if (this.selectedUnit.type !== 'worker') {
        gatherBtn.textContent = 'Worker Only';
      } else if (this.gameState.currentPhase !== 'resource') {
        gatherBtn.textContent = 'Resource Phase Only';
      } else if (!this.selectedUnit.canAct()) {
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
    this.selectedUnit = null;
    this.selectedCell = null;
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

    if (this.selectedUnit && this.selectedUnit.type === 'worker') {
      const result = this.resourceManager.gatherResources(this.selectedUnit.id);
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
