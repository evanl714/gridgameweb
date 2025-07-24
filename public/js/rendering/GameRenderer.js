/**
 * GameRenderer - Unified rendering system for both canvas and DOM grid
 * Eliminates dual rendering system by providing a single rendering interface
 */

import {
  GAME_CONFIG,
  UI_COLORS,
  PLAYER_COLORS,
  MOVEMENT_COLORS,
  ENTITY_CHARACTERS
} from '../../shared/constants.js';

export class GameRenderer {
  constructor(gameState, resourceManager) {
    this.gameState = gameState;
    this.resourceManager = resourceManager;
    this.gridSize = GAME_CONFIG.GRID_SIZE;
    this.cellSize = GAME_CONFIG.CELL_SIZE;
    
    // Canvas setup (optional)
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    
    // Grid setup (DOM-based rendering)
    this.gridContainer = document.querySelector('.grid-container');
    this.gridCells = [];
    
    // Rendering mode: 'canvas', 'grid', or 'auto'
    this.renderMode = this.detectRenderMode();
    
    this.initializeRenderer();
  }

  detectRenderMode() {
    // Detect which rendering mode to use based on available elements
    const hasCanvas = this.canvas && this.ctx;
    const hasGrid = this.gridContainer && document.querySelectorAll('.grid-cell').length > 0;
    
    if (hasGrid) {
      return 'grid';
    } else if (hasCanvas) {
      return 'canvas';
    } else {
      console.warn('No rendering target found, defaulting to grid mode');
      return 'grid';
    }
  }

  initializeRenderer() {
    if (this.renderMode === 'canvas' && this.canvas) {
      this.updateCanvasSize();
    } else if (this.renderMode === 'grid') {
      this.cacheGridCells();
    }
    
    console.log(`GameRenderer initialized in ${this.renderMode} mode`);
  }

  updateCanvasSize() {
    if (this.canvas) {
      const totalSize = this.gridSize * this.cellSize;
      this.canvas.width = totalSize;
      this.canvas.height = totalSize;
    }
  }

  cacheGridCells() {
    // Cache grid cells for efficient DOM rendering
    this.gridCells = Array.from(document.querySelectorAll('.grid-cell'));
    if (this.gridCells.length === 0) {
      console.warn('No grid cells found for caching');
    }
  }

  render(inputController = null) {
    try {
      if (this.renderMode === 'canvas') {
        this.renderToCanvas(inputController);
      } else {
        this.renderToGrid(inputController);
      }
    } catch (error) {
      console.error('Rendering error:', error);
    }
  }

  renderToCanvas(inputController) {
    if (!this.ctx) return;

    this.clearCanvas();
    this.drawGrid();
    this.drawHover(inputController);
    this.drawSelection(inputController);
    this.drawMovementRange(inputController);
    this.drawMovementPreview(inputController);
    this.drawResourceNodes(inputController);
    this.drawBases();
    this.drawUnits();
    this.drawUnitSelection(inputController);
  }

  renderToGrid(inputController) {
    if (this.gridCells.length === 0) {
      this.cacheGridCells();
    }

    // Clear existing state from grid cells
    this.clearGridCells();

    // Apply rendering layers
    this.renderHoverToGrid(inputController);
    this.renderSelectionToGrid(inputController);
    this.renderMovementRangeToGrid(inputController);
    this.renderResourceNodesToGrid();
    this.renderBasesToGrid();
    this.renderUnitsToGrid();
    this.renderUnitSelectionToGrid(inputController);
  }

  // Canvas rendering methods (consolidated from game.js)
  clearCanvas() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawGrid() {
    if (!this.ctx) return;

    // Fill entire canvas with dark tactical background
    this.ctx.fillStyle = UI_COLORS.GRID_BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw alternating tactical grid pattern
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const isLight = (x + y) % 2 === 0;
        this.ctx.fillStyle = isLight ? UI_COLORS.GRID_LIGHT : UI_COLORS.GRID_DARK;
        
        this.ctx.fillRect(
          x * this.cellSize,
          y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
        
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
    
    // Draw grid lines
    this.ctx.strokeStyle = UI_COLORS.GRID_LINE;
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.8;
    
    for (let i = 0; i <= this.gridSize; i++) {
      const pos = i * this.cellSize;
      
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, this.canvas.height);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(this.canvas.width, pos);
      this.ctx.stroke();
    }
    
    // Enhanced border lines every 5 cells
    this.ctx.strokeStyle = UI_COLORS.GRID_BORDER_GLOW;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.6;
    
    for (let i = 0; i <= this.gridSize; i += 5) {
      const pos = i * this.cellSize;
      
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, this.canvas.height);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(this.canvas.width, pos);
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1.0;
  }

  drawHover(inputController) {
    if (!this.ctx || !inputController) return;
    
    const hoveredCell = inputController.getHoveredCell();
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

  drawSelection(inputController) {
    if (!this.ctx || !inputController) return;
    
    const selectedCell = inputController.getSelectedCell();
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

  drawMovementRange(inputController) {
    if (!this.ctx || !inputController) return;
    
    const selectedUnit = inputController.getSelectedUnit();
    const showMovementRange = inputController.getShowMovementRange();
    
    if (selectedUnit && showMovementRange) {
      const validMoves = this.gameState.getValidMovePositions(selectedUnit.id);

      for (const move of validMoves) {
        const x = move.x * this.cellSize;
        const y = move.y * this.cellSize;

        this.ctx.fillStyle = MOVEMENT_COLORS.VALID_MOVE;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        this.ctx.strokeStyle = MOVEMENT_COLORS.VALID_MOVE_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // Draw movement cost
        this.ctx.fillStyle = MOVEMENT_COLORS.MOVEMENT_COST;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          move.cost.toString(),
          x + this.cellSize / 2,
          y + this.cellSize / 2 - 8
        );
      }
    }
  }

  drawMovementPreview(inputController) {
    if (!this.ctx || !inputController) return;
    
    const movementPreview = inputController.getMovementPreview();
    const selectedUnit = inputController.getSelectedUnit();
    
    if (movementPreview && selectedUnit) {
      const x = movementPreview.x * this.cellSize;
      const y = movementPreview.y * this.cellSize;

      this.ctx.fillStyle = MOVEMENT_COLORS.PATH_PREVIEW;
      this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

      this.ctx.strokeStyle = MOVEMENT_COLORS.PATH_PREVIEW_BORDER;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

      this.ctx.fillStyle = MOVEMENT_COLORS.MOVEMENT_COST;
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        `${movementPreview.cost}`,
        x + this.cellSize / 2,
        y + this.cellSize / 2 + 8
      );
    }
  }

  drawResourceNodes(inputController) {
    if (!this.ctx) return;
    
    const resourceInfo = this.resourceManager.getResourceNodeInfo();
    const selectedUnit = inputController ? inputController.getSelectedUnit() : null;
    
    resourceInfo.forEach(nodeInfo => {
      const node = nodeInfo.position;
      const centerX = node.x * this.cellSize + this.cellSize / 2;
      const centerY = node.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize * 0.3;

      // Check if gatherable
      const isGatherable = selectedUnit &&
                          selectedUnit.type === 'worker' &&
                          this.gameState.currentPhase === 'resource' &&
                          nodeInfo.value > 0 &&
                          Math.abs(node.x - selectedUnit.position.x) <= 1 &&
                          Math.abs(node.y - selectedUnit.position.y) <= 1;

      if (isGatherable) {
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        this.ctx.fillRect(
          node.x * this.cellSize,
          node.y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }

      const efficiency = nodeInfo.efficiency;
      const alpha = 0.3 + (efficiency * 0.7);
      this.ctx.fillStyle = `rgba(50, 205, 50, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.strokeStyle = isGatherable ? '#FFD700' : '#228B22';
      this.ctx.lineWidth = isGatherable ? 3 : 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(nodeInfo.value.toString(), centerX, centerY);
    });
  }

  drawBases() {
    if (!this.ctx) return;
    
    Array.from(this.gameState.bases.values()).forEach(base => {
      if (base.isDestroyed) return;

      const centerX = base.position.x * this.cellSize + this.cellSize / 2;
      const centerY = base.position.y * this.cellSize + this.cellSize / 2;
      const size = this.cellSize * 0.8;

      this.ctx.fillStyle = PLAYER_COLORS[base.playerId];
      this.ctx.fillRect(
        centerX - size / 2,
        centerY - size / 2,
        size,
        size
      );

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        centerX - size / 2,
        centerY - size / 2,
        size,
        size
      );

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('⬛', centerX, centerY);
    });
  }

  drawUnits() {
    if (!this.ctx) return;
    
    Array.from(this.gameState.units.values()).forEach(unit => {
      const centerX = unit.position.x * this.cellSize + this.cellSize / 2;
      const centerY = unit.position.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize * 0.3;

      this.ctx.fillStyle = PLAYER_COLORS[unit.playerId];
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(ENTITY_CHARACTERS[unit.type] || '?', centerX, centerY);
    });
  }

  drawUnitSelection(inputController) {
    if (!this.ctx || !inputController) return;
    
    const selectedUnit = inputController.getSelectedUnit();
    if (selectedUnit) {
      const centerX = selectedUnit.position.x * this.cellSize + this.cellSize / 2;
      const centerY = selectedUnit.position.y * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize * 0.4;

      this.ctx.strokeStyle = UI_COLORS.SELECTION_BORDER;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }

  // Grid rendering methods (consolidated from index.html)
  clearGridCells() {
    this.gridCells.forEach(cell => {
      if (cell) {
        // Remove all rendering classes
        cell.classList.remove('selected', 'hovered', 'unit', 'base', 'player1', 'player2', 
                             'player1-base', 'player2-base', 'movement-range', 'movement-preview');
        
        // Remove existing displays
        const existingDisplays = cell.querySelectorAll('.unit-display, .base-display, .resource-display');
        existingDisplays.forEach(display => display.remove());
        
        // Clear inline styles except for layout
        if (cell.style.background && 
            (cell.style.background.includes('#4CAF50') || cell.style.background.includes('#F44336'))) {
          cell.style.background = '';
        }
      }
    });
  }

  renderHoverToGrid(inputController) {
    if (!inputController) return;
    
    const hoveredCell = inputController.getHoveredCell();
    if (hoveredCell) {
      const hoveredIndex = hoveredCell.y * this.gridSize + hoveredCell.x;
      const hoveredElement = this.gridCells[hoveredIndex];
      if (hoveredElement) {
        hoveredElement.classList.add('hovered');
      }
    }
  }

  renderSelectionToGrid(inputController) {
    if (!inputController) return;
    
    const selectedCell = inputController.getSelectedCell();
    if (selectedCell) {
      const selectedIndex = selectedCell.y * this.gridSize + selectedCell.x;
      const selectedElement = this.gridCells[selectedIndex];
      if (selectedElement) {
        selectedElement.classList.add('selected');
      }
    }
  }

  renderMovementRangeToGrid(inputController) {
    if (!inputController) return;
    
    const selectedUnit = inputController.getSelectedUnit();
    const showMovementRange = inputController.getShowMovementRange();
    
    if (selectedUnit && showMovementRange) {
      const validMoves = this.gameState.getValidMovePositions(selectedUnit.id);
      
      validMoves.forEach(move => {
        const moveIndex = move.y * this.gridSize + move.x;
        const moveElement = this.gridCells[moveIndex];
        if (moveElement) {
          moveElement.classList.add('movement-range');
          
          // Add cost indicator
          const costIndicator = document.createElement('div');
          costIndicator.className = 'movement-cost-indicator';
          costIndicator.textContent = move.cost.toString();
          costIndicator.style.cssText = `
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 1px 3px;
            border-radius: 2px;
            z-index: 10;
          `;
          moveElement.appendChild(costIndicator);
        }
      });
    }
  }

  renderResourceNodesToGrid() {
    const resourceInfo = this.resourceManager.getResourceNodeInfo();
    
    resourceInfo.forEach(nodeInfo => {
      const node = nodeInfo.position;
      const nodeIndex = node.y * this.gridSize + node.x;
      const nodeElement = this.gridCells[nodeIndex];
      
      if (nodeElement) {
        const resourceDisplay = document.createElement('div');
        resourceDisplay.className = 'resource-display';
        resourceDisplay.textContent = '🟢';
        resourceDisplay.style.cssText = `
          position: absolute;
          font-size: 20px;
          z-index: 3;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: ${0.3 + (nodeInfo.efficiency * 0.7)};
        `;
        
        // Add value indicator
        const valueIndicator = document.createElement('div');
        valueIndicator.className = 'resource-value';
        valueIndicator.textContent = nodeInfo.value.toString();
        valueIndicator.style.cssText = `
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 8px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 1px 2px;
          border-radius: 2px;
          z-index: 11;
        `;
        
        nodeElement.appendChild(resourceDisplay);
        nodeElement.appendChild(valueIndicator);
      }
    });
  }

  renderBasesToGrid() {
    Array.from(this.gameState.bases.values()).forEach(base => {
      if (base.isDestroyed) return;

      const baseIndex = base.position.y * this.gridSize + base.position.x;
      const baseCell = this.gridCells[baseIndex];
      
      if (baseCell) {
        const baseDisplay = document.createElement('div');
        baseDisplay.className = 'base-display';
        baseDisplay.textContent = '🏛️';
        baseDisplay.style.cssText = `
          position: absolute;
          font-size: 20px;
          z-index: 4;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        `;
        
        baseCell.appendChild(baseDisplay);
        baseCell.classList.add('base', `player${base.playerId}-base`);
        baseCell.style.background = base.playerId === 1 ? '#4CAF50' : '#F44336';
      }
    });
  }

  renderUnitsToGrid() {
    Array.from(this.gameState.units.values()).forEach(unit => {
      const unitIndex = unit.position.y * this.gridSize + unit.position.x;
      const unitCell = this.gridCells[unitIndex];
      
      if (unitCell) {
        const unitDisplay = document.createElement('div');
        unitDisplay.className = 'unit-display';
        unitDisplay.textContent = this.getUnitSymbol(unit.type);
        unitDisplay.style.cssText = `
          position: absolute;
          font-size: 16px;
          font-weight: bold;
          color: ${unit.playerId === 1 ? '#00aaff' : '#F44336'};
          z-index: 5;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        `;
        
        unitCell.appendChild(unitDisplay);
        unitCell.classList.add('unit', `player${unit.playerId}`);
      }
    });
  }

  renderUnitSelectionToGrid(inputController) {
    if (!inputController) return;
    
    const selectedUnit = inputController.getSelectedUnit();
    if (selectedUnit) {
      const unitIndex = selectedUnit.position.y * this.gridSize + selectedUnit.position.x;
      const unitCell = this.gridCells[unitIndex];
      
      if (unitCell) {
        unitCell.classList.add('unit-selected');
        
        // Add selection ring
        const selectionRing = document.createElement('div');
        selectionRing.className = 'unit-selection-ring';
        selectionRing.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          border: 3px solid ${UI_COLORS.SELECTION_BORDER};
          border-radius: 50%;
          z-index: 6;
          pointer-events: none;
        `;
        
        unitCell.appendChild(selectionRing);
      }
    }
  }

  getUnitSymbol(unitType) {
    return ENTITY_CHARACTERS[unitType] || '?';
  }

  // Utility methods
  switchRenderMode(mode) {
    if (['canvas', 'grid', 'auto'].includes(mode)) {
      this.renderMode = mode === 'auto' ? this.detectRenderMode() : mode;
      this.initializeRenderer();
      console.log(`Switched to ${this.renderMode} rendering mode`);
    }
  }

  getRenderMode() {
    return this.renderMode;
  }

  destroy() {
    // Clean up any event listeners or resources
    this.gridCells = [];
    this.canvas = null;
    this.ctx = null;
  }
}