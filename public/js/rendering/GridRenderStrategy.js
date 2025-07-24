/**
 * GridRenderStrategy - DOM grid-based rendering implementation
 * Extracted from GameRenderer to implement Strategy pattern
 */

import { RenderStrategy } from './RenderStrategy.js';
import {
  UI_COLORS,
  ENTITY_CHARACTERS
} from '../../shared/constants.js';
import { RENDERING_CONSTANTS } from '../config/RenderingConstants.js';

export class GridRenderStrategy extends RenderStrategy {
  constructor(gameState, resourceManager, gridSize, cellSize) {
    super(gameState, resourceManager, gridSize, cellSize);
    
    this.gridContainer = document.querySelector('.grid-container');
    this.gridCells = [];
  }

  initialize() {
    this.cacheGridCells();
    console.log(`Grid renderer initialized with ${this.gridCells.length} cells`);
  }

  render(inputController) {
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

  updateSize() {
    // Grid size is handled by CSS, no action needed
  }

  getMode() {
    return 'grid';
  }

  destroy() {
    this.gridCells = [];
    this.gridContainer = null;
  }

  cacheGridCells() {
    // Cache grid cells for efficient DOM rendering
    this.gridCells = Array.from(document.querySelectorAll('.grid-cell'));
    if (this.gridCells.length === 0) {
      console.warn('No grid cells found for caching');
    }
  }

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
          costIndicator.style.cssText = RENDERING_CONSTANTS.DOM_COST_INDICATOR_STYLE;
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
          ${RENDERING_CONSTANTS.DOM_CENTERED_ELEMENT_STYLE}
          font-size: ${RENDERING_CONSTANTS.DOM_RESOURCE_ICON_SIZE};
          z-index: ${RENDERING_CONSTANTS.DOM_ELEMENT_Z_INDICES.RESOURCE_DISPLAY};
          opacity: ${0.3 + (nodeInfo.efficiency * 0.7)};
        `;
        
        // Add value indicator
        const valueIndicator = document.createElement('div');
        valueIndicator.className = 'resource-value';
        valueIndicator.textContent = nodeInfo.value.toString();
        valueIndicator.style.cssText = RENDERING_CONSTANTS.DOM_RESOURCE_VALUE_STYLE;
        
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
}