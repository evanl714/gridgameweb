/**
 * GameRenderer - Unified rendering system using Strategy pattern
 * Delegates rendering to specific strategy implementations
 */

import { GAME_CONFIG } from '../../shared/constants.js';
import { CanvasRenderStrategy } from './CanvasRenderStrategy.js';
import { GridRenderStrategy } from './GridRenderStrategy.js';

export class GameRenderer {
  constructor(gameState, resourceManager, renderMode = 'auto') {
    this.gameState = gameState;
    this.resourceManager = resourceManager;
    this.gridSize = GAME_CONFIG.GRID_SIZE;
    this.cellSize = GAME_CONFIG.CELL_SIZE;

    // Determine and set rendering strategy
    this.renderMode = renderMode === 'auto' ? this.detectRenderMode() : renderMode;
    this.strategy = this.createRenderStrategy();

    this.initializeRenderer();
  }

  detectRenderMode() {
    // Detect which rendering mode to use based on available elements
    const hasCanvas = document.getElementById('gameCanvas');
    const hasGrid = document.querySelector('.grid-container') && document.querySelectorAll('.grid-cell').length > 0;

    if (hasGrid) {
      return 'grid';
    } else if (hasCanvas) {
      return 'canvas';
    } else {
      console.warn('No rendering target found, defaulting to grid mode');
      return 'grid';
    }
  }

  createRenderStrategy() {
    switch (this.renderMode) {
    case 'canvas':
      return new CanvasRenderStrategy(this.gameState, this.resourceManager, this.gridSize, this.cellSize);
    case 'grid':
      return new GridRenderStrategy(this.gameState, this.resourceManager, this.gridSize, this.cellSize);
    default:
      throw new Error(`Unknown render mode: ${this.renderMode}`);
    }
  }

  initializeRenderer() {
    try {
      this.strategy.initialize();
      console.log(`GameRenderer initialized in ${this.renderMode} mode`);
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
      // Fallback to grid mode if canvas fails
      if (this.renderMode === 'canvas') {
        this.renderMode = 'grid';
        this.strategy = this.createRenderStrategy();
        this.strategy.initialize();
      }
    }
  }

  render(inputController = null) {
    try {
      this.strategy.render(inputController);
    } catch (error) {
      console.error('Rendering error:', error);
    }
  }

  updateSize() {
    this.strategy.updateSize();
  }

  // Utility methods
  switchRenderMode(mode) {
    if (['canvas', 'grid', 'auto'].includes(mode)) {
      const newMode = mode === 'auto' ? this.detectRenderMode() : mode;
      if (newMode !== this.renderMode) {
        this.strategy.destroy();
        this.renderMode = newMode;
        this.strategy = this.createRenderStrategy();
        this.initializeRenderer();
        console.log(`Switched to ${this.renderMode} rendering mode`);
      }
    }
  }

  getRenderMode() {
    return this.renderMode;
  }

  destroy() {
    if (this.strategy) {
      this.strategy.destroy();
    }
  }
}
