/**
 * RenderStrategy - Base interface for rendering strategies
 * Implements Strategy pattern for different rendering modes
 */

export class RenderStrategy {
  constructor(gameState, resourceManager, gridSize, cellSize) {
    this.gameState = gameState;
    this.resourceManager = resourceManager;
    this.gridSize = gridSize;
    this.cellSize = cellSize;
  }

  /**
   * Initialize the renderer
   * @abstract
   */
  initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Render the game state
   * @abstract
   * @param {Object} inputController - Input controller for state information
   */
  render(inputController) {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Clean up resources
   * @abstract
   */
  destroy() {
    throw new Error('destroy() must be implemented by subclass');
  }

  /**
   * Update canvas/grid size if needed
   * @abstract
   */
  updateSize() {
    throw new Error('updateSize() must be implemented by subclass');
  }

  /**
   * Get the rendering mode name
   * @abstract
   * @returns {string}
   */
  getMode() {
    throw new Error('getMode() must be implemented by subclass');
  }
}