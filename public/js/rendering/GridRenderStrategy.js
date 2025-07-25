/**
 * GridRenderStrategy - Optimized DOM grid-based rendering implementation
 * Uses dirty region tracking and object pooling for improved performance
 */

import { RenderStrategy } from './RenderStrategy.js';
import {
  UI_COLORS,
  ENTITY_CHARACTERS
} from '../../shared/constants.js';
import { RENDERING_CONSTANTS } from '../config/RenderingConstants.js';
import { DirtyRegionTracker } from './DirtyRegionTracker.js';
import { domElementPool } from '../utils/ObjectPool.js';
import { performanceMonitor } from '../services/PerformanceMonitor.js';

export class GridRenderStrategy extends RenderStrategy {
  constructor(gameState, resourceManager, gridSize, cellSize) {
    super(gameState, resourceManager, gridSize, cellSize);

    this.gridContainer = document.querySelector('.grid-container');
    this.gridCells = [];
    
    // Initialize dirty region tracking
    this.dirtyTracker = new DirtyRegionTracker(gridSize, cellSize);
    
    // Track previous render state for change detection
    this.previousRenderState = new Map();
    
    // Performance optimization flags
    this.optimizationsEnabled = {
      dirtyRegionTracking: true,
      objectPooling: true,
      stateChangeDetection: true,
      regionCoalescing: true
    };
    
    // Statistics tracking
    this.renderStats = {
      totalRenders: 0,
      optimizedRenders: 0,
      fullRepaints: 0,
      dirtyRegionsUsed: 0
    };
  }

  initialize() {
    const cached = this.cacheGridCells();
    if (cached) {
      console.log(`Grid renderer initialized with ${this.gridCells.length} cells`);
    } else {
      console.log('Grid renderer initialized, grid cells will be cached when available');
    }
  }

  render(inputController) {
    return performanceMonitor.profileOperation('grid-render', () => {
      this.renderStats.totalRenders++;
      
      if (this.gridCells.length === 0) {
        this.cacheGridCells();
      }

      // Detect changes and mark dirty regions
      this.detectChanges(inputController);

      // Check if any rendering is needed
      if (!this.dirtyTracker.hasDirtyRegions() && !this.shouldForceFullRender()) {
        return; // No changes, skip render
      }

      // Optimize dirty regions before rendering
      if (this.optimizationsEnabled.regionCoalescing) {
        this.dirtyTracker.optimizeRegions();
      }

      // Determine rendering strategy
      const dirtyRegions = this.dirtyTracker.getDirtyRegions();
      const useOptimizedRender = this.optimizationsEnabled.dirtyRegionTracking &&
                                dirtyRegions.length > 0 &&
                                dirtyRegions.length < 20; // Full repaint if too many regions

      if (useOptimizedRender) {
        this.renderOptimized(inputController, dirtyRegions);
        this.renderStats.optimizedRenders++;
        this.renderStats.dirtyRegionsUsed += dirtyRegions.length;
      } else {
        this.renderFull(inputController);
        this.renderStats.fullRepaints++;
      }

      // Track performance metrics
      performanceMonitor.trackRenderMetrics({
        dirtyRegions: dirtyRegions.length,
        fullRepaints: useOptimizedRender ? 0 : 1
      });

      // Complete the frame
      this.dirtyTracker.commitFrame();
    });
  }

  /**
   * Optimized render that only updates dirty regions
   */
  renderOptimized(inputController, dirtyRegions) {
    dirtyRegions.forEach(region => {
      // Clear only the dirty region
      this.clearRegion(region);

      // Render layers for this region
      this.renderRegionLayers(region, inputController);
    });
  }

  /**
   * Full render for when optimized rendering isn't suitable
   */
  renderFull(inputController) {
    // Clear all grid cells
    this.clearGridCells();

    // Apply all rendering layers
    this.renderHoverToGrid(inputController);
    this.renderSelectionToGrid(inputController);
    this.renderMovementRangeToGrid(inputController);
    this.renderResourceNodesToGrid();
    this.renderBasesToGrid();
    this.renderUnitsToGrid();
    this.renderUnitSelectionToGrid(inputController);
  }

  /**
   * Detect changes since last render and mark dirty regions
   */
  detectChanges(inputController) {
    if (!this.optimizationsEnabled.stateChangeDetection) {
      this.dirtyTracker.markFullRepaint('change-detection-disabled');
      return;
    }

    // Check for hover changes
    this.detectHoverChanges(inputController);
    
    // Check for selection changes
    this.detectSelectionChanges(inputController);
    
    // Check for unit changes
    this.detectUnitChanges();
    
    // Check for base changes
    this.detectBaseChanges();
    
    // Check for resource changes
    this.detectResourceChanges();
  }

  /**
   * Detect hover changes
   */
  detectHoverChanges(inputController) {
    const currentHover = inputController ? inputController.getHoveredCell() : null;
    const previousHover = this.previousRenderState.get('hover');

    if (!this.positionsEqual(currentHover, previousHover)) {
      // Mark old hover position dirty
      if (previousHover) {
        this.dirtyTracker.markCellDirty(previousHover.x, previousHover.y, 'hover-removed');
      }
      
      // Mark new hover position dirty
      if (currentHover) {
        this.dirtyTracker.markCellDirty(currentHover.x, currentHover.y, 'hover-added');
      }
      
      this.previousRenderState.set('hover', currentHover ? { ...currentHover } : null);
    }
  }

  /**
   * Detect selection changes
   */
  detectSelectionChanges(inputController) {
    const currentSelection = inputController ? inputController.getSelectedCell() : null;
    const previousSelection = this.previousRenderState.get('selection');

    if (!this.positionsEqual(currentSelection, previousSelection)) {
      // Mark old selection dirty
      if (previousSelection) {
        this.dirtyTracker.markCellDirty(previousSelection.x, previousSelection.y, 'selection-removed');
      }
      
      // Mark new selection dirty
      if (currentSelection) {
        this.dirtyTracker.markCellDirty(currentSelection.x, currentSelection.y, 'selection-added');
      }

      this.previousRenderState.set('selection', currentSelection ? { ...currentSelection } : null);
    }

    // Check for movement range changes
    this.detectMovementRangeChanges(inputController);
  }

  /**
   * Detect movement range changes
   */
  detectMovementRangeChanges(inputController) {
    const selectedUnit = inputController ? inputController.getSelectedUnit() : null;
    const showRange = inputController ? inputController.getShowMovementRange() : false;
    const previousUnitId = this.previousRenderState.get('selectedUnitId');
    const previousShowRange = this.previousRenderState.get('showMovementRange');

    const currentUnitId = selectedUnit ? selectedUnit.id : null;

    if (currentUnitId !== previousUnitId || showRange !== previousShowRange) {
      // Clear old movement range
      if (previousUnitId && previousShowRange) {
        const oldMoves = this.previousRenderState.get('movementRange') || [];
        oldMoves.forEach(move => {
          this.dirtyTracker.markCellDirty(move.x, move.y, 'movement-range-removed');
        });
      }

      // Mark new movement range
      if (selectedUnit && showRange) {
        const validMoves = this.gameState.getValidMovePositions(selectedUnit.id);
        validMoves.forEach(move => {
          this.dirtyTracker.markCellDirty(move.x, move.y, 'movement-range-added');
        });
        this.previousRenderState.set('movementRange', validMoves);
      } else {
        this.previousRenderState.set('movementRange', []);
      }

      this.previousRenderState.set('selectedUnitId', currentUnitId);
      this.previousRenderState.set('showMovementRange', showRange);
    }
  }

  /**
   * Detect unit changes
   */
  detectUnitChanges() {
    const currentUnits = this.gameState.units || [];
    const previousUnits = this.previousRenderState.get('units') || [];

    // Create maps for efficient comparison
    const currentUnitMap = new Map();
    const previousUnitMap = new Map();

    currentUnits.forEach(unit => currentUnitMap.set(unit.id, unit));
    previousUnits.forEach(unit => previousUnitMap.set(unit.id, unit));

    // Check for removed units
    previousUnitMap.forEach((unit, id) => {
      if (!currentUnitMap.has(id)) {
        this.dirtyTracker.markCellDirty(unit.x, unit.y, 'unit-removed');
      }
    });

    // Check for new or changed units
    currentUnitMap.forEach((unit, id) => {
      const previousUnit = previousUnitMap.get(id);
      
      if (!previousUnit) {
        // New unit
        this.dirtyTracker.markCellDirty(unit.x, unit.y, 'unit-added');
      } else if (unit.x !== previousUnit.x || unit.y !== previousUnit.y || 
                 unit.health !== previousUnit.health) {
        // Moved or changed unit
        if (unit.x !== previousUnit.x || unit.y !== previousUnit.y) {
          this.dirtyTracker.markCellDirty(previousUnit.x, previousUnit.y, 'unit-moved-from');
        }
        this.dirtyTracker.markCellDirty(unit.x, unit.y, 'unit-moved-to');
      }
    });

    // Store current state for next comparison
    this.previousRenderState.set('units', currentUnits.map(unit => ({ ...unit })));
  }

  /**
   * Detect base changes
   */
  detectBaseChanges() {
    const currentBases = this.gameState.bases || [];
    const previousBases = this.previousRenderState.get('bases') || [];

    if (currentBases.length !== previousBases.length) {
      // Base count changed, mark all base positions dirty
      [...currentBases, ...previousBases].forEach(base => {
        this.dirtyTracker.markCellDirty(base.x, base.y, 'base-changed');
      });
    } else {
      // Check individual bases for changes
      currentBases.forEach((base, index) => {
        const previousBase = previousBases[index];
        if (!previousBase || 
            base.x !== previousBase.x || 
            base.y !== previousBase.y ||
            base.playerId !== previousBase.playerId) {
          this.dirtyTracker.markCellDirty(base.x, base.y, 'base-modified');
        }
      });
    }

    this.previousRenderState.set('bases', currentBases.map(base => ({ ...base })));
  }

  /**
   * Detect resource changes
   */
  detectResourceChanges() {
    const currentResources = this.resourceManager.getResourceNodeInfo();
    const previousResources = this.previousRenderState.get('resources') || [];

    // Simple comparison - mark all resource positions dirty if count changed
    if (currentResources.length !== previousResources.length) {
      [...currentResources, ...previousResources].forEach(resource => {
        const pos = resource.position || resource;
        this.dirtyTracker.markCellDirty(pos.x, pos.y, 'resource-changed');
      });
    }

    this.previousRenderState.set('resources', [...currentResources]);
  }

  /**
   * Check if two positions are equal
   */
  positionsEqual(pos1, pos2) {
    if (!pos1 && !pos2) return true;
    if (!pos1 || !pos2) return false;
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  /**
   * Check if a full render should be forced
   */
  shouldForceFullRender() {
    // Force full render periodically to prevent accumulated errors
    return this.renderStats.totalRenders % 100 === 0;
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
      console.log('Grid cells not yet available, will cache on first render');
      return false;
    }
    return true;
  }

  clearGridCells() {
    this.gridCells.forEach(cell => {
      if (cell) {
        this.clearCell(cell);
      }
    });
  }

  /**
   * Clear a single cell using object pooling
   */
  clearCell(cell) {
    // Remove all rendering classes
    cell.classList.remove('selected', 'hovered', 'unit', 'base', 'player1', 'player2',
      'player1-base', 'player2-base', 'movement-range', 'movement-preview');

    // Remove existing displays and return them to object pool
    const existingDisplays = cell.querySelectorAll('.unit-display, .base-display, .resource-display');
    existingDisplays.forEach(display => {
      if (this.optimizationsEnabled.objectPooling) {
        // Determine display type and return to appropriate pool
        if (display.classList.contains('unit-display')) {
          domElementPool.release('unit-display', display);
        } else if (display.classList.contains('base-display')) {
          domElementPool.release('base-display', display);
        } else if (display.classList.contains('resource-display')) {
          domElementPool.release('resource-display', display);
        }
      } else {
        display.remove();
      }
    });

    // Clear inline styles except for layout
    if (cell.style.background &&
        (cell.style.background.includes('#4CAF50') || cell.style.background.includes('#F44336'))) {
      cell.style.background = '';
    }
  }

  /**
   * Clear only cells within a specific region
   */
  clearRegion(region) {
    for (let x = region.x; x < region.x + region.width; x++) {
      for (let y = region.y; y < region.y + region.height; y++) {
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
          const cellIndex = y * this.gridSize + x;
          if (this.gridCells[cellIndex]) {
            this.clearCell(this.gridCells[cellIndex]);
          }
        }
      }
    }
  }

  /**
   * Render all layers for a specific region
   */
  renderRegionLayers(region, inputController) {
    // Render layers that might affect this region
    this.renderHoverToRegion(region, inputController);
    this.renderSelectionToRegion(region, inputController);
    this.renderMovementRangeToRegion(region, inputController);
    this.renderResourceNodesToRegion(region);
    this.renderBasesToRegion(region);
    this.renderUnitsToRegion(region);
    this.renderUnitSelectionToRegion(region, inputController);
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

  // Region-specific rendering methods for optimized rendering

  /**
   * Render hover effects only in the specified region
   */
  renderHoverToRegion(region, inputController) {
    if (!inputController) return;

    const hoveredCell = inputController.getHoveredCell();
    if (hoveredCell && this.isPositionInRegion(hoveredCell, region)) {
      const hoveredIndex = hoveredCell.y * this.gridSize + hoveredCell.x;
      const hoveredElement = this.gridCells[hoveredIndex];
      if (hoveredElement) {
        hoveredElement.classList.add('hovered');
      }
    }
  }

  /**
   * Render selection effects only in the specified region
   */
  renderSelectionToRegion(region, inputController) {
    if (!inputController) return;

    const selectedCell = inputController.getSelectedCell();
    if (selectedCell && this.isPositionInRegion(selectedCell, region)) {
      const selectedIndex = selectedCell.y * this.gridSize + selectedCell.x;
      const selectedElement = this.gridCells[selectedIndex];
      if (selectedElement) {
        selectedElement.classList.add('selected');
      }
    }
  }

  /**
   * Render movement range only in the specified region
   */
  renderMovementRangeToRegion(region, inputController) {
    if (!inputController) return;

    const selectedUnit = inputController.getSelectedUnit();
    const showMovementRange = inputController.getShowMovementRange();

    if (selectedUnit && showMovementRange) {
      const validMoves = this.gameState.getValidMovePositions(selectedUnit.id);

      validMoves.forEach(move => {
        if (this.isPositionInRegion(move, region)) {
          const moveIndex = move.y * this.gridSize + move.x;
          const moveElement = this.gridCells[moveIndex];
          if (moveElement) {
            moveElement.classList.add('movement-range');

            // Add cost indicator using object pool
            let costIndicator;
            if (this.optimizationsEnabled.objectPooling) {
              costIndicator = domElementPool.acquire('div');
              costIndicator.className = 'movement-cost-indicator';
            } else {
              costIndicator = document.createElement('div');
              costIndicator.className = 'movement-cost-indicator';
            }

            costIndicator.textContent = move.cost.toString();
            costIndicator.style.cssText = RENDERING_CONSTANTS.DOM_COST_INDICATOR_STYLE;
            moveElement.appendChild(costIndicator);
          }
        }
      });
    }
  }

  /**
   * Render resource nodes only in the specified region
   */
  renderResourceNodesToRegion(region) {
    const resourceInfo = this.resourceManager.getResourceNodeInfo();

    resourceInfo.forEach(nodeInfo => {
      const node = nodeInfo.position;
      if (this.isPositionInRegion(node, region)) {
        const nodeIndex = node.y * this.gridSize + node.x;
        const nodeElement = this.gridCells[nodeIndex];

        if (nodeElement) {
          // Create resource display using object pool
          let resourceDisplay;
          if (this.optimizationsEnabled.objectPooling) {
            resourceDisplay = domElementPool.createResourceDisplay(nodeInfo);
          } else {
            resourceDisplay = document.createElement('div');
            resourceDisplay.className = 'resource-display';
            resourceDisplay.textContent = '💎';
            resourceDisplay.dataset.resourceAmount = nodeInfo.amount;
          }

          nodeElement.appendChild(resourceDisplay);
          nodeElement.classList.add('resource');
        }
      }
    });
  }

  /**
   * Render bases only in the specified region
   */
  renderBasesToRegion(region) {
    this.gameState.bases.forEach(base => {
      if (this.isPositionInRegion(base, region)) {
        const baseIndex = base.y * this.gridSize + base.x;
        const baseElement = this.gridCells[baseIndex];

        if (baseElement) {
          // Create base display using object pool
          let baseDisplay;
          if (this.optimizationsEnabled.objectPooling) {
            baseDisplay = domElementPool.createBaseDisplay(base);
          } else {
            baseDisplay = document.createElement('div');
            baseDisplay.className = 'base-display';
            baseDisplay.textContent = '🏠';
            baseDisplay.classList.add(`player${base.playerId}-base`);
            baseDisplay.dataset.baseId = base.id;
          }

          baseElement.appendChild(baseDisplay);
          baseElement.classList.add('base', `player${base.playerId}`, `player${base.playerId}-base`);
        }
      }
    });
  }

  /**
   * Render units only in the specified region
   */
  renderUnitsToRegion(region) {
    this.gameState.units.forEach(unit => {
      if (this.isPositionInRegion(unit.position, region)) {
        const unitIndex = unit.position.y * this.gridSize + unit.position.x;
        const unitCell = this.gridCells[unitIndex];

        if (unitCell) {
          // Create unit display using object pool
          let unitDisplay;
          if (this.optimizationsEnabled.objectPooling) {
            unitDisplay = domElementPool.createUnitDisplay(unit);
          } else {
            unitDisplay = document.createElement('div');
            unitDisplay.className = 'unit-display';
            unitDisplay.textContent = this.getUnitSymbol(unit.type);
            unitDisplay.classList.add(`player${unit.playerId}`);
            unitDisplay.dataset.unitId = unit.id;
          }

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
      }
    });
  }

  /**
   * Render unit selection only in the specified region
   */
  renderUnitSelectionToRegion(region, inputController) {
    if (!inputController) return;

    const selectedUnit = inputController.getSelectedUnit();
    if (selectedUnit && this.isPositionInRegion(selectedUnit.position, region)) {
      const unitIndex = selectedUnit.position.y * this.gridSize + selectedUnit.position.x;
      const unitCell = this.gridCells[unitIndex];

      if (unitCell) {
        unitCell.classList.add('unit-selected');

        // Add selection ring using object pool
        let selectionRing;
        if (this.optimizationsEnabled.objectPooling) {
          selectionRing = domElementPool.acquire('selection-ring');
        } else {
          selectionRing = document.createElement('div');
          selectionRing.className = 'unit-selection-ring';
        }

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

  /**
   * Check if a position is within the specified region
   */
  isPositionInRegion(position, region) {
    return position.x >= region.x &&
           position.x < region.x + region.width &&
           position.y >= region.y &&
           position.y < region.y + region.height;
  }

  /**
   * Get performance statistics for this renderer
   */
  getPerformanceStatistics() {
    const dirtyStats = this.dirtyTracker.getStatistics();
    const poolStats = domElementPool.getStatistics();

    return {
      renderer: 'GridRenderStrategy',
      renderStats: { ...this.renderStats },
      dirtyRegionStats: dirtyStats,
      objectPoolStats: poolStats,
      optimizationsEnabled: { ...this.optimizationsEnabled }
    };
  }

  /**
   * Enable or disable specific optimizations
   */
  setOptimization(optimizationName, enabled) {
    if (this.optimizationsEnabled.hasOwnProperty(optimizationName)) {
      this.optimizationsEnabled[optimizationName] = enabled;
      console.log(`GridRenderStrategy: ${optimizationName} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      console.warn(`Unknown optimization: ${optimizationName}`);
    }
  }

  /**
   * Reset performance statistics
   */
  resetStatistics() {
    this.renderStats = {
      totalRenders: 0,
      optimizedRenders: 0,
      fullRepaints: 0,
      dirtyRegionsUsed: 0
    };
    
    this.dirtyTracker.resetStatistics();
    console.log('GridRenderStrategy statistics reset');
  }

  /**
   * Enhanced destroy method with cleanup
   */
  destroy() {
    // Clear all pools
    if (this.optimizationsEnabled.objectPooling) {
      domElementPool.clear();
    }

    // Reset tracking
    this.dirtyTracker = null;
    this.previousRenderState.clear();

    // Clear grid references
    this.gridCells = [];
    this.gridContainer = null;

    console.log('GridRenderStrategy destroyed with optimizations cleanup');
  }
}
