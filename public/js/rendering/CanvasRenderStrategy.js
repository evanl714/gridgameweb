/**
 * CanvasRenderStrategy - Canvas-based rendering implementation
 * Extracted from GameRenderer to implement Strategy pattern
 */

import { RenderStrategy } from './RenderStrategy.js';
import {
  UI_COLORS,
  PLAYER_COLORS,
  MOVEMENT_COLORS,
  ENTITY_CHARACTERS
} from '../../shared/constants.js';
import { 
  RENDERING_CONSTANTS, 
  getResourceNodeColor, 
  calculateResourceNodeAlpha 
} from '../config/RenderingConstants.js';

export class CanvasRenderStrategy extends RenderStrategy {
  constructor(gameState, resourceManager, gridSize, cellSize) {
    super(gameState, resourceManager, gridSize, cellSize);
    
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
  }

  initialize() {
    if (this.canvas) {
      this.updateSize();
      console.log('Canvas renderer initialized');
    } else {
      throw new Error('Canvas element not found');
    }
  }

  render(inputController) {
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

  updateSize() {
    if (this.canvas) {
      const totalSize = this.gridSize * this.cellSize;
      this.canvas.width = totalSize;
      this.canvas.height = totalSize;
    }
  }

  getMode() {
    return 'canvas';
  }

  destroy() {
    this.canvas = null;
    this.ctx = null;
  }

  // Canvas rendering methods
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
            x * this.cellSize + RENDERING_CONSTANTS.GRID_LIGHT_DARK_OFFSET,
            y * this.cellSize + RENDERING_CONSTANTS.GRID_LIGHT_DARK_OFFSET,
            this.cellSize - RENDERING_CONSTANTS.GRID_ACCENT_PADDING,
            this.cellSize - RENDERING_CONSTANTS.GRID_ACCENT_PADDING
          );
        }
      }
    }
    
    // Draw grid lines
    this.ctx.strokeStyle = UI_COLORS.GRID_LINE;
    this.ctx.lineWidth = RENDERING_CONSTANTS.GRID_LINE_WIDTH;
    this.ctx.globalAlpha = RENDERING_CONSTANTS.GRID_LINE_ALPHA;
    
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
    
    // Enhanced border lines every N cells
    this.ctx.strokeStyle = UI_COLORS.GRID_BORDER_GLOW;
    this.ctx.lineWidth = RENDERING_CONSTANTS.GRID_BORDER_WIDTH;
    this.ctx.globalAlpha = RENDERING_CONSTANTS.GRID_BORDER_ALPHA;
    
    for (let i = 0; i <= this.gridSize; i += RENDERING_CONSTANTS.GRID_BORDER_INTERVAL) {
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
      this.ctx.lineWidth = RENDERING_CONSTANTS.SELECTION_BORDER_WIDTH;
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
      const radius = this.cellSize * RENDERING_CONSTANTS.RESOURCE_NODE_RADIUS_FACTOR;

      // Check if gatherable
      const isGatherable = selectedUnit &&
                          selectedUnit.type === 'worker' &&
                          this.gameState.currentPhase === 'resource' &&
                          nodeInfo.value > 0 &&
                          Math.abs(node.x - selectedUnit.position.x) <= 1 &&
                          Math.abs(node.y - selectedUnit.position.y) <= 1;

      if (isGatherable) {
        this.ctx.fillStyle = RENDERING_CONSTANTS.RESOURCE_HIGHLIGHT_COLOR;
        this.ctx.fillRect(
          node.x * this.cellSize,
          node.y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }

      const efficiency = nodeInfo.efficiency;
      const alpha = calculateResourceNodeAlpha(efficiency);
      this.ctx.fillStyle = getResourceNodeColor(alpha);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.strokeStyle = isGatherable ? RENDERING_CONSTANTS.RESOURCE_GATHERABLE_BORDER : RENDERING_CONSTANTS.RESOURCE_NORMAL_BORDER;
      this.ctx.lineWidth = isGatherable ? RENDERING_CONSTANTS.SELECTION_BORDER_WIDTH : RENDERING_CONSTANTS.UNIT_STROKE_WIDTH;
      this.ctx.stroke();

      this.ctx.fillStyle = RENDERING_CONSTANTS.RESOURCE_VALUE_TEXT_COLOR;
      this.ctx.font = RENDERING_CONSTANTS.MOVEMENT_COST_FONT;
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
      const size = this.cellSize * RENDERING_CONSTANTS.BASE_SIZE_FACTOR;

      this.ctx.fillStyle = PLAYER_COLORS[base.playerId];
      this.ctx.fillRect(
        centerX - size / 2,
        centerY - size / 2,
        size,
        size
      );

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = RENDERING_CONSTANTS.BASE_STROKE_WIDTH;
      this.ctx.strokeRect(
        centerX - size / 2,
        centerY - size / 2,
        size,
        size
      );

      this.ctx.fillStyle = RENDERING_CONSTANTS.UNIT_TEXT_COLOR;
      this.ctx.font = RENDERING_CONSTANTS.UNIT_FONT;
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
      const radius = this.cellSize * RENDERING_CONSTANTS.UNIT_RADIUS_FACTOR;

      this.ctx.fillStyle = PLAYER_COLORS[unit.playerId];
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = RENDERING_CONSTANTS.UNIT_STROKE_WIDTH;
      this.ctx.stroke();

      this.ctx.fillStyle = RENDERING_CONSTANTS.UNIT_TEXT_COLOR;
      this.ctx.font = RENDERING_CONSTANTS.UNIT_FONT;
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
      const radius = this.cellSize * RENDERING_CONSTANTS.UNIT_SELECTION_RADIUS_FACTOR;

      this.ctx.strokeStyle = UI_COLORS.SELECTION_BORDER;
      this.ctx.lineWidth = RENDERING_CONSTANTS.SELECTION_BORDER_WIDTH;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }
}