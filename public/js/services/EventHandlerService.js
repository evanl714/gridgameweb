/**
 * Event Handler Service
 * Centralizes event handling and eliminates inline HTML event handlers
 * Part of the dependency injection system for ISSUE-045
 */

export class EventHandlerService {
  constructor(serviceContainer) {
    this.container = serviceContainer;
    this.handlers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the event handler service
   * This replaces inline HTML event handlers with proper event listeners
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    this.registerUIEventHandlers();
    this.registerGameEventHandlers();
    this.initialized = true;
  }

  /**
   * Register UI event handlers
   */
  registerUIEventHandlers() {
    // Build panel handlers
    this.registerHandler('build-worker', 'click', () => {
      this.container.get('GameService')?.buildUnit('worker');
    });

    this.registerHandler('build-scout', 'click', () => {
      this.container.get('GameService')?.buildUnit('scout');
    });

    this.registerHandler('build-infantry', 'click', () => {
      this.container.get('GameService')?.buildUnit('infantry');
    });

    this.registerHandler('build-heavy', 'click', () => {
      this.container.get('GameService')?.buildUnit('heavy');
    });

    // Turn management handlers
    this.registerHandler('next-phase-btn', 'click', () => {
      this.container.get('TurnManagerService')?.nextPhase();
    });

    this.registerHandler('end-turn-btn', 'click', () => {
      this.container.get('TurnManagerService')?.forceEndTurn();
    });

    // Game control handlers
    this.registerHandler('new-game-btn', 'click', () => {
      this.container.get('GameService')?.startNewGame();
    });

    this.registerHandler('save-game-btn', 'click', () => {
      this.container.get('GameService')?.saveGame();
    });

    this.registerHandler('load-game-btn', 'click', () => {
      this.container.get('GameService')?.loadGame();
    });

    // Unit action handlers
    this.registerHandler('unit-move-btn', 'click', () => {
      this.container.get('UIStateManager')?.enterMovementMode();
    });

    this.registerHandler('unit-attack-btn', 'click', () => {
      this.container.get('UIStateManager')?.enterAttackMode();
    });

    this.registerHandler('unit-gather-btn', 'click', () => {
      this.container.get('GameService')?.gatherResources();
    });
  }

  /**
   * Register game event handlers (canvas clicks, etc.)
   */
  registerGameEventHandlers() {
    const domProvider = this.container.get('domProvider');
    
    // Canvas click handler for grid interactions
    const gameCanvas = domProvider.getElementById('gameCanvas');
    if (gameCanvas) {
      this.registerCanvasHandler(gameCanvas, 'click', (event) => {
        this.handleCanvasClick(event);
      });
    }

    // Canvas mouse movement for hover effects
    if (gameCanvas) {
      this.registerCanvasHandler(gameCanvas, 'mousemove', (event) => {
        this.handleCanvasMouseMove(event);
      });
    }

    // Keyboard shortcuts
    domProvider.getDocument().addEventListener('keydown', (event) => {
      this.handleKeyboardShortcuts(event);
    });
  }

  /**
   * Register a DOM event handler
   */
  registerHandler(elementId, eventType, handler) {
    const domProvider = this.container.get('domProvider');
    const element = domProvider.getElementById(elementId);
    
    if (element) {
      element.addEventListener(eventType, handler);
      
      // Store handler for cleanup
      if (!this.handlers.has(elementId)) {
        this.handlers.set(elementId, []);
      }
      this.handlers.get(elementId).push({ eventType, handler });
    }
  }

  /**
   * Register a canvas event handler with coordinate conversion
   */
  registerCanvasHandler(canvas, eventType, handler) {
    const wrappedHandler = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert pixel coordinates to grid coordinates
      const gridX = Math.floor(x / 32); // CELL_SIZE = 32
      const gridY = Math.floor(y / 32);
      
      handler({ ...event, gridX, gridY });
    };
    
    canvas.addEventListener(eventType, wrappedHandler);
    
    // Store handler for cleanup
    const canvasId = canvas.id || 'gameCanvas';
    if (!this.handlers.has(canvasId)) {
      this.handlers.set(canvasId, []);
    }
    this.handlers.get(canvasId).push({ eventType, handler: wrappedHandler });
  }

  /**
   * Handle canvas click events
   */
  handleCanvasClick(event) {
    const { gridX, gridY } = event;
    const uiStateManager = this.container.get('UIStateManager');
    const gameService = this.container.get('GameService');
    
    if (!uiStateManager || !gameService) {
      return;
    }

    const currentMode = uiStateManager.getCurrentMode();
    
    switch (currentMode) {
      case 'selection':
        this.handleSelectionClick(gridX, gridY);
        break;
      case 'movement':
        this.handleMovementClick(gridX, gridY);
        break;
      case 'attack':
        this.handleAttackClick(gridX, gridY);
        break;
      case 'building':
        this.handleBuildingClick(gridX, gridY);
        break;
      default:
        this.handleDefaultClick(gridX, gridY);
    }
  }

  /**
   * Handle selection mode clicks
   */
  handleSelectionClick(gridX, gridY) {
    const gameService = this.container.get('GameService');
    const uiStateManager = this.container.get('UIStateManager');
    
    const unit = gameService.getUnitAt(gridX, gridY);
    if (unit) {
      uiStateManager.selectUnit(unit.id);
    } else {
      uiStateManager.clearSelection();
    }
  }

  /**
   * Handle movement mode clicks
   */
  handleMovementClick(gridX, gridY) {
    const gameService = this.container.get('GameService');
    const uiStateManager = this.container.get('UIStateManager');
    
    const selectedUnitId = uiStateManager.getSelectedUnit();
    if (selectedUnitId) {
      const success = gameService.moveUnit(selectedUnitId, gridX, gridY);
      if (success) {
        uiStateManager.exitMovementMode();
      }
    }
  }

  /**
   * Handle attack mode clicks
   */
  handleAttackClick(gridX, gridY) {
    const gameService = this.container.get('GameService');
    const uiStateManager = this.container.get('UIStateManager');
    
    const selectedUnitId = uiStateManager.getSelectedUnit();
    if (selectedUnitId) {
      const success = gameService.attackTarget(selectedUnitId, gridX, gridY);
      if (success) {
        uiStateManager.exitAttackMode();
      }
    }
  }

  /**
   * Handle building mode clicks
   */
  handleBuildingClick(gridX, gridY) {
    const gameService = this.container.get('GameService');
    const uiStateManager = this.container.get('UIStateManager');
    
    const unitType = uiStateManager.getBuildingUnitType();
    if (unitType) {
      const success = gameService.buildUnitAt(unitType, gridX, gridY);
      if (success) {
        uiStateManager.exitBuildingMode();
      }
    }
  }

  /**
   * Handle default clicks (selection mode)
   */
  handleDefaultClick(gridX, gridY) {
    this.handleSelectionClick(gridX, gridY);
  }

  /**
   * Handle canvas mouse movement
   */
  handleCanvasMouseMove(event) {
    const { gridX, gridY } = event;
    const uiStateManager = this.container.get('UIStateManager');
    
    if (uiStateManager) {
      uiStateManager.updateHoverPosition(gridX, gridY);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    const turnManagerService = this.container.get('TurnManagerService');
    const uiStateManager = this.container.get('UIStateManager');
    
    switch (event.key) {
      case 'Escape':
        uiStateManager?.clearSelection();
        uiStateManager?.exitCurrentMode();
        break;
      case ' ': // Spacebar
        event.preventDefault();
        turnManagerService?.nextPhase();
        break;
      case 'Enter':
        event.preventDefault();
        turnManagerService?.forceEndTurn();
        break;
      case '1':
        this.container.get('GameService')?.buildUnit('worker');
        break;
      case '2':
        this.container.get('GameService')?.buildUnit('scout');
        break;
      case '3':
        this.container.get('GameService')?.buildUnit('infantry');
        break;
      case '4':
        this.container.get('GameService')?.buildUnit('heavy');
        break;
      case 'm':
      case 'M':
        uiStateManager?.enterMovementMode();
        break;
      case 'a':
      case 'A':
        uiStateManager?.enterAttackMode();
        break;
      case 'g':
      case 'G':
        this.container.get('GameService')?.gatherResources();
        break;
    }
  }

  /**
   * Cleanup all event handlers
   */
  cleanup() {
    const domProvider = this.container.get('domProvider');
    
    for (const [elementId, handlerList] of this.handlers) {
      const element = domProvider.getElementById(elementId);
      if (element) {
        handlerList.forEach(({ eventType, handler }) => {
          element.removeEventListener(eventType, handler);
        });
      }
    }
    
    this.handlers.clear();
    this.initialized = false;
  }

  /**
   * Check if service is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Dispose of the service (for cleanup)
   */
  dispose() {
    this.cleanup();
  }
}