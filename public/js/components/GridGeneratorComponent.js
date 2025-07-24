/**
 * GridGeneratorComponent - Handles dynamic grid creation and resource placement
 * Extracts grid generation logic from HTML into a proper component
 */

import { UIComponent } from './UIComponent.js';

export class GridGeneratorComponent extends UIComponent {
  constructor(container, options = {}) {
    super(container, options);
    
    // Grid configuration
    this.gridSize = options.gridSize || 25;
    this.totalCells = this.gridSize * this.gridSize;
    
    // Resource node positions (as defined in original HTML)
    this.resourcePositions = options.resourcePositions || [
      {row: 4, col: 4}, {row: 12, col: 4}, {row: 20, col: 4},
      {row: 4, col: 12}, {row: 12, col: 12}, {row: 20, col: 12},
      {row: 4, col: 20}, {row: 12, col: 20}, {row: 20, col: 20}
    ];
    
    this.isGenerated = false;
  }

  /**
   * Create the component's DOM structure
   */
  async onCreate() {
    // Find or wait for the game board container
    if (typeof this.container === 'string') {
      this.element = await this.waitForElement(this.container);
    } else {
      this.element = this.container;
    }

    if (!this.element) {
      throw new Error('GridGeneratorComponent: Could not find game board container');
    }
  }

  /**
   * Mount the component and generate the grid
   */
  async onMount() {
    if (!this.isGenerated) {
      await this.generateGrid();
      this.isGenerated = true;
      this.emit('gridGenerated', {
        gridSize: this.gridSize,
        totalCells: this.totalCells,
        resourceCount: this.resourcePositions.length
      });
    }
  }

  /**
   * Generate the complete grid with cells and resource nodes
   */
  async generateGrid() {
    try {
      console.log(`🎯 Generating ${this.gridSize}x${this.gridSize} grid (${this.totalCells} cells)...`);
      
      // Clear existing content
      this.element.innerHTML = '';
      
      // Create grid cells in batches for better performance
      const batchSize = 50;
      const batches = Math.ceil(this.totalCells / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const fragment = document.createDocumentFragment();
        const startIndex = batch * batchSize;
        const endIndex = Math.min(startIndex + batchSize, this.totalCells);
        
        for (let i = startIndex; i < endIndex; i++) {
          const cell = this.createGridCell(i);
          fragment.appendChild(cell);
        }
        
        this.element.appendChild(fragment);
        
        // Allow UI to update between batches
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      console.log(`✅ Grid generation completed: ${this.totalCells} cells with ${this.resourcePositions.length} resource nodes`);
      
    } catch (error) {
      console.error('❌ Error generating grid:', error);
      throw error;
    }
  }

  /**
   * Create a single grid cell with appropriate data attributes
   */
  createGridCell(index) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.index = index;
    
    // Calculate row and column from index
    const row = Math.floor(index / this.gridSize);
    const col = index % this.gridSize;
    cell.dataset.x = col;
    cell.dataset.y = row;
    
    // Add resource node if this position should have one
    if (this.shouldHaveResource(row, col)) {
      const resourceNode = this.createResourceNode();
      cell.appendChild(resourceNode);
    }
    
    return cell;
  }

  /**
   * Create a resource node element
   */
  createResourceNode() {
    const resource = document.createElement('div');
    resource.className = 'resource-node';
    resource.textContent = '100'; // Default resource amount
    return resource;
  }

  /**
   * Check if a position should have a resource node
   */
  shouldHaveResource(row, col) {
    return this.resourcePositions.some(pos => pos.row === row && pos.col === col);
  }

  /**
   * Get all grid cells
   */
  getGridCells() {
    return this.querySelectorAll('.grid-cell');
  }

  /**
   * Get grid cell by coordinates
   */
  getGridCell(x, y) {
    return this.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
  }

  /**
   * Get all resource nodes
   */
  getResourceNodes() {
    return this.querySelectorAll('.resource-node');
  }

  /**
   * Update resource node value
   */
  updateResourceNode(x, y, value) {
    const cell = this.getGridCell(x, y);
    if (cell) {
      const resourceNode = cell.querySelector('.resource-node');
      if (resourceNode) {
        resourceNode.textContent = value;
        this.emit('resourceUpdated', { x, y, value });
      }
    }
  }

  /**
   * Clear all grid content
   */
  clearGrid() {
    if (this.element) {
      this.element.innerHTML = '';
      this.isGenerated = false;
      this.emit('gridCleared');
    }
  }

  /**
   * Regenerate the grid
   */
  async regenerateGrid() {
    this.clearGrid();
    await this.generateGrid();
  }

  /**
   * Get grid statistics
   */
  getGridStats() {
    return {
      gridSize: this.gridSize,
      totalCells: this.totalCells,
      resourcePositions: this.resourcePositions.length,
      generatedCells: this.getGridCells().length,
      resourceNodes: this.getResourceNodes().length,
      isGenerated: this.isGenerated
    };
  }

  /**
   * Update component with new configuration
   */
  update(data) {
    super.update(data);
    
    if (data && data.resourcePositions) {
      this.resourcePositions = data.resourcePositions;
      // Regenerate grid if resource positions changed
      if (this.isGenerated) {
        this.regenerateGrid();
      }
    }
  }

  /**
   * Component cleanup
   */
  onDestroy() {
    this.clearGrid();
  }
}