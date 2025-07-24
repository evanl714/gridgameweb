/**
 * GameBoardComponent - Handles grid cell click interactions
 * Extracts grid cell interaction logic from HTML into a proper component
 */

import { UIComponent } from './UIComponent.js';

export class GameBoardComponent extends UIComponent {
  constructor(container, gameInstance, options = {}) {
    super(container, options);
    this.gameInstance = gameInstance;
    this.lastClickedCell = null;
    this.isEventDelegationActive = false;
  }

  /**
   * Create the component's DOM structure
   */
  async onCreate() {
    // Find or wait for the game board element
    if (typeof this.container === 'string') {
      this.element = await this.waitForElement(this.container);
    } else {
      this.element = this.container;
    }

    if (!this.element) {
      throw new Error('GameBoardComponent: Could not find game board element');
    }
  }

  /**
   * Mount the component and set up event delegation
   */
  async onMount() {
    this.setupEventDelegation();
    this.setupGameInstanceWatcher();
    this.emit('mounted');
    console.log('✅ GameBoardComponent: Event delegation activated');
  }

  /**
   * Set up event delegation for grid cell clicks
   * Uses event delegation to handle clicks on dynamically created cells
   */
  setupEventDelegation() {
    if (this.isEventDelegationActive) return;

    // Add click listener using event delegation
    this.addEventListener(this.element, 'click', this.handleBoardClick);
    this.isEventDelegationActive = true;
  }

  /**
   * Handle clicks on the game board using event delegation
   */
  handleBoardClick(event) {
    // Find the closest grid cell element
    const cell = event.target.closest('.grid-cell');
    
    if (!cell) {
      // Click was not on a grid cell
      return;
    }

    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    
    // Validate coordinates
    if (isNaN(x) || isNaN(y)) {
      console.warn('GameBoardComponent: Invalid cell coordinates', { x, y });
      return;
    }

    this.lastClickedCell = { x, y, element: cell };

    // Emit cell click event
    this.emit('cellClicked', {
      x,
      y,
      element: cell,
      timestamp: Date.now()
    });

    // Handle the click based on available game instance
    if (this.gameInstance && typeof this.gameInstance.handleCellClick === 'function') {
      try {
        this.gameInstance.handleCellClick(x, y);
        console.log(`🎯 Game handled cell click at (${x}, ${y})`);
      } catch (error) {
        console.error('Error handling cell click through game instance:', error);
        this.handleFallbackClick(x, y, cell);
      }
    } else {
      // Fallback handling when game instance is not available
      this.handleFallbackClick(x, y, cell);
    }
  }

  /**
   * Fallback click handling for demo/debugging purposes
   */
  handleFallbackClick(x, y, cell) {
    console.log(`🔄 Fallback: Clicked cell at (${x}, ${y})`);
    
    // Update unit info sidebar as in original implementation
    this.updateUnitInfoSidebar(x, y, cell);
    
    // Emit fallback event
    this.emit('fallbackClick', { x, y, cell });
  }

  /**
   * Update unit info sidebar (backward compatibility)
   */
  updateUnitInfoSidebar(x, y, cell) {
    const unitInfo = document.getElementById('unitInfoSidebar');
    if (!unitInfo) return;

    const hasResource = cell.querySelector('.resource-node');
    const cellType = hasResource ? 'Resource' : 'Empty';

    unitInfo.innerHTML = `
      <div class="info-row">
        <span class="info-label">Position</span>
        <span class="info-value">${x},${y}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Type</span>
        <span class="info-value">${cellType}</span>
      </div>
    `;

    this.emit('sidebarUpdated', { x, y, cellType });
  }

  /**
   * Set up watcher for game instance availability
   */
  setupGameInstanceWatcher() {
    // If game instance is not available, watch for it
    if (!this.gameInstance && window) {
      const checkInterval = setInterval(() => {
        if (window.game) {
          this.gameInstance = window.game;
          console.log('✅ GameBoardComponent: Game instance detected');
          clearInterval(checkInterval);
          this.emit('gameInstanceConnected', { gameInstance: this.gameInstance });
        }
      }, 100);

      // Stop checking after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.gameInstance) {
          console.warn('GameBoardComponent: Game instance not found after timeout');
        }
      }, 10000);
    }
  }

  /**
   * Manually set the game instance
   */
  setGameInstance(gameInstance) {
    this.gameInstance = gameInstance;
    this.emit('gameInstanceSet', { gameInstance });
    console.log('✅ GameBoardComponent: Game instance manually set');
  }

  /**
   * Get the last clicked cell information
   */
  getLastClickedCell() {
    return this.lastClickedCell;
  }

  /**
   * Programmatically trigger a cell click
   */
  simulateCellClick(x, y) {
    const cell = this.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
      // Create a synthetic event
      const syntheticEvent = {
        target: cell,
        currentTarget: this.element
      };
      
      this.handleBoardClick(syntheticEvent);
      return true;
    }
    return false;
  }

  /**
   * Get all grid cells within the component
   */
  getGridCells() {
    return this.querySelectorAll('.grid-cell');
  }

  /**
   * Get specific cell by coordinates
   */
  getCell(x, y) {
    return this.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
  }

  /**
   * Highlight a specific cell
   */
  highlightCell(x, y, className = 'highlighted') {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.classList.add(className);
      this.emit('cellHighlighted', { x, y, className });
      return true;
    }
    return false;
  }

  /**
   * Remove highlight from a cell
   */
  unhighlightCell(x, y, className = 'highlighted') {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.classList.remove(className);
      this.emit('cellUnhighlighted', { x, y, className });
      return true;
    }
    return false;
  }

  /**
   * Clear all cell highlights
   */
  clearAllHighlights(className = 'highlighted') {
    const cells = this.querySelectorAll(`.grid-cell.${className}`);
    cells.forEach(cell => {
      cell.classList.remove(className);
    });
    
    this.emit('allHighlightsCleared', { className, count: cells.length });
  }

  /**
   * Update component state
   */
  update(data) {
    super.update(data);
    
    if (data && data.gameInstance) {
      this.setGameInstance(data.gameInstance);
    }
  }

  /**
   * Component cleanup
   */
  onDestroy() {
    this.isEventDelegationActive = false;
    this.lastClickedCell = null;
    this.gameInstance = null;
  }
}