import { GameEventTypes } from '../patterns/Observer.js';

/**
 * UIStateManager (Refactored) - Dependency injection enabled UI management
 *
 * Eliminates hardcoded DOM element access and global state dependencies
 * Uses injectable services for DOM access, game state, and turn management
 */
export class UIStateManager {
  constructor(gameStateManager, turnManagerService, domProvider, notificationService) {
    this.gameStateManager = gameStateManager;
    this.turnManagerService = turnManagerService;
    this.domProvider = domProvider;
    this.notificationService = notificationService;

    // UI state tracking
    this.uiState = {
      isUpdating: false,
      lastUpdate: Date.now(),
      updateQueue: [],
      cachedValues: new Map()
    };

    // Element name mappings (no hardcoded IDs)
    this.elementNames = {
      // Player and game state displays
      currentPlayer: 'currentPlayer',
      gameStatus: 'gameStatus',
      turnNumber: 'turnNumber',
      turnDisplay: 'turnDisplay',
      gamePhase: 'gamePhase',
      phaseDisplay: 'phaseDisplay',

      // Player info displays
      playerEnergy: 'playerEnergy',
      playerActions: 'playerActions',
      playerUnits: 'playerUnits',
      selectedUnit: 'selectedUnit',

      // Control buttons
      gatherBtn: 'gatherBtn',
      newGameBtn: 'newGameBtn',
      nextPhaseBtn: 'nextPhaseBtn',
      surrenderBtn: 'surrenderBtn',

      // Optional elements
      playerResources: 'playerResources',
      territoryControl: 'territoryControl',
      territoryBar: 'territoryBar'
    };

    this.setupUIListeners();
    this.scheduleUIUpdate();
  }

  /**
     * Setup event listeners for automatic UI updates
     */
  setupUIListeners() {
    // Listen to GameStateManager events
    if (this.gameStateManager) {
      this.gameStateManager.on(GameEventTypes.GAME_STARTED, () => this.scheduleUIUpdate());
      this.gameStateManager.on('stateChanged', () => this.scheduleUIUpdate());
      this.gameStateManager.on('playerChanged', () => this.updatePlayerDisplay());
      this.gameStateManager.on('turnChanged', () => this.updateGameInfo());
      this.gameStateManager.on('phaseChanged', () => this.updateGameInfo());
    }

    // Listen to TurnManagerService events
    if (this.turnManagerService) {
      this.turnManagerService.on(GameEventTypes.TURN_STARTED, () => this.scheduleUIUpdate());
      this.turnManagerService.on(GameEventTypes.TURN_ENDED, () => this.scheduleUIUpdate());
      this.turnManagerService.on(GameEventTypes.PHASE_CHANGED, () => this.scheduleUIUpdate());
    }
  }

  /**
     * Schedule a UI update (debounced for performance)
     */
  scheduleUIUpdate() {
    if (this.uiState.isUpdating) {
      return;
    }

    // Debounce rapid updates
    const now = Date.now();
    if (now - this.uiState.lastUpdate < 16) { // ~60fps limit
      return;
    }

    requestAnimationFrame(() => {
      this.updateAllUI();
    });
  }

  /**
     * Update all UI elements
     */
  updateAllUI() {
    if (!this.gameStateManager.initialized) {
      return;
    }

    this.uiState.isUpdating = true;

    try {
      this.updatePlayerDisplay();
      this.updateGameInfo();
      this.updateUnitInfo();
      this.updateControlButtons();
      this.uiState.lastUpdate = Date.now();
    } catch (error) {
      console.error('UI update failed:', error);
      this.notificationService?.show('UI update failed', 'error');
    } finally {
      this.uiState.isUpdating = false;
    }
  }

  /**
     * Update player display information
     */
  updatePlayerDisplay() {
    const currentPlayer = this.gameStateManager.getCurrentPlayer();

    if (currentPlayer) {
      // Update current player display
      this.domProvider.updateContent(
        this.elementNames.currentPlayer,
        `Player ${currentPlayer.id}'s Turn`
      );

      // Add visual indication for current player
      const playerElement = this.domProvider.get(this.elementNames.currentPlayer);
      if (playerElement) {
        playerElement.className = `current-player player-${currentPlayer.id}`;
      }
    }
  }

  /**
     * Update game information displays
     */
  updateGameInfo() {
    const turnInfo = this.turnManagerService.getCurrentTurnInfo();
    const gameState = this.gameStateManager.getState();

    // Update turn number displays
    this.domProvider.updateContent(
      this.elementNames.turnNumber,
      `Turn: ${turnInfo.turn}`
    );

    this.domProvider.updateContent(
      this.elementNames.turnDisplay,
      turnInfo.turn.toString()
    );

    // Update phase displays
    this.domProvider.updateContent(
      this.elementNames.gamePhase,
      `Phase: ${turnInfo.phase}`
    );

    this.domProvider.updateContent(
      this.elementNames.phaseDisplay,
      turnInfo.phase
    );

    // Update player-specific info
    const currentPlayer = turnInfo.player;
    if (currentPlayer) {
      this.updatePlayerStats(currentPlayer);
      this.updatePlayerResources(currentPlayer);
      this.updateTerritoryControl(currentPlayer);
    }
  }

  /**
     * Update player statistics
     * @param {Object} player - Current player object
     */
  updatePlayerStats(player) {
    if (!player) return;

    // Update energy display
    this.domProvider.updateContent(
      this.elementNames.playerEnergy,
      `Energy: ${player.energy || 0}`
    );

    // Update actions display
    this.domProvider.updateContent(
      this.elementNames.playerActions,
      `Actions: ${player.actionsRemaining || 0}`
    );

    // Update units count
    const unitsCount = player.unitsOwned ? player.unitsOwned.size : 0;
    this.domProvider.updateContent(
      this.elementNames.playerUnits,
      `Units: ${unitsCount}`
    );
  }

  /**
     * Update player resource information
     * @param {Object} player - Current player object
     */
  updatePlayerResources(player) {
    if (!player) return;

    const resources = this.gameStateManager.getPlayerResources(player.id);
    this.domProvider.updateContent(
      this.elementNames.playerResources,
      resources.toString()
    );
  }

  /**
     * Update territory control display
     * @param {Object} player - Current player object
     */
  updateTerritoryControl(player) {
    if (!player) return;

    const territoryPercent = this.calculateTerritoryControl(player.id);

    // Update territory control text
    this.domProvider.updateContent(
      this.elementNames.territoryControl,
      `${territoryPercent}%`
    );

    // Update territory bar width
    const territoryBar = this.domProvider.get(this.elementNames.territoryBar);
    if (territoryBar) {
      territoryBar.style.width = `${territoryPercent}%`;
    }
  }

  /**
     * Update unit information display
     * @param {Object} selectedUnit - Currently selected unit
     */
  updateUnitInfo(selectedUnit = null) {
    if (selectedUnit) {
      const stats = selectedUnit.getStats();
      const unitInfo = `
                <strong>${stats.name}</strong><br>
                Health: ${selectedUnit.health}/${selectedUnit.maxHealth}<br>
                Actions: ${selectedUnit.actionsUsed}/${selectedUnit.maxActions}
            `;

      this.domProvider.updateContent(
        this.elementNames.selectedUnit,
        unitInfo,
        true // HTML content
      );
    } else {
      this.domProvider.updateContent(
        this.elementNames.selectedUnit,
        'No unit selected'
      );
    }
  }

  /**
     * Update control button states
     * @param {Object} selectedUnit - Currently selected unit
     * @param {Object} resourceManager - Resource manager instance
     */
  updateControlButtons(selectedUnit = null, resourceManager = null) {
    this.updateGatherButton(selectedUnit, resourceManager);
    this.updatePhaseButton();
    this.updateGameControlButtons();
  }

  /**
     * Update gather button state
     * @param {Object} selectedUnit - Selected unit
     * @param {Object} resourceManager - Resource manager
     */
  updateGatherButton(selectedUnit, resourceManager) {
    const turnInfo = this.turnManagerService.getCurrentTurnInfo();
    const gatherBtn = this.domProvider.get(this.elementNames.gatherBtn);

    if (!gatherBtn) return;

    const canGather = selectedUnit &&
                         selectedUnit.type === 'worker' &&
                         turnInfo.phase === 'resources' &&
                         selectedUnit.canAct() &&
                         resourceManager &&
                         resourceManager.canGatherAtPosition(selectedUnit.id);

    gatherBtn.disabled = !canGather;

    // Update button text based on state
    let buttonText = 'Gather Resources (G)';

    if (!selectedUnit) {
      buttonText = 'Select Worker';
    } else if (selectedUnit.type !== 'worker') {
      buttonText = 'Worker Only';
    } else if (turnInfo.phase !== 'resources') {
      buttonText = 'Resource Phase Only';
    } else if (!selectedUnit.canAct()) {
      buttonText = 'No Actions Left';
    } else if (!canGather) {
      buttonText = 'No Resources Nearby';
    }

    gatherBtn.textContent = buttonText;
  }

  /**
     * Update phase transition button
     */
  updatePhaseButton() {
    const turnInfo = this.turnManagerService.getCurrentTurnInfo();
    const phaseBtn = this.domProvider.get(this.elementNames.nextPhaseBtn);

    if (phaseBtn) {
      phaseBtn.disabled = turnInfo.isProcessing;
      phaseBtn.textContent = turnInfo.isProcessing ?
        'Processing...' :
        `Next Phase (${turnInfo.phase})`;
    }
  }

  /**
     * Update game control buttons (new game, surrender, etc.)
     */
  updateGameControlButtons() {
    const gameStatus = this.gameStateManager.getGameStatus();
    const isGameActive = this.gameStateManager.isGameActive();

    // Update new game button
    const newGameBtn = this.domProvider.get(this.elementNames.newGameBtn);
    if (newGameBtn) {
      newGameBtn.disabled = false;
      newGameBtn.textContent = isGameActive ? 'Restart Game' : 'New Game';
    }

    // Update surrender button
    const surrenderBtn = this.domProvider.get(this.elementNames.surrenderBtn);
    if (surrenderBtn) {
      surrenderBtn.disabled = !isGameActive;
      surrenderBtn.textContent = isGameActive ? 'Surrender' : 'Game Not Active';
    }
  }

  /**
     * Update status message
     * @param {string} message - Status message
     */
  updateStatus(message) {
    this.domProvider.updateContent(this.elementNames.gameStatus, message);
  }

  /**
     * Show temporary message to user
     * @param {string} message - Message text
     * @param {string} type - Message type (info, success, warning, error)
     */
  showMessage(message, type = 'info') {
    if (this.notificationService) {
      this.notificationService.show(message, type);
    } else {
      // Fallback to creating notification manually
      this.createTemporaryMessage(message, type);
    }
  }

  /**
     * Create temporary message element (fallback)
     * @param {string} message - Message text
     * @param {string} type - Message type
     */
  createTemporaryMessage(message, type) {
    const messageDiv = this.domProvider.createElement('div', {
      className: `ui-message ui-message-${type}`,
      textContent: message
    });

    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 12px 16px;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            transition: all 0.3s ease;
        `;

    document.body.appendChild(messageDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
          }
        }, 300);
      }
    }, 3000);
  }

  /**
     * Calculate territory control percentage
     * @param {string|number} playerId - Player ID
     * @returns {number} Territory control percentage
     */
  calculateTerritoryControl(playerId) {
    const gameState = this.gameStateManager.getState();

    if (!gameState.units || !gameState.bases) return 0;

    // Calculate based on units and bases owned
    const playerUnits = gameState.units.filter(unit => unit.playerId === playerId).length;
    const playerBases = gameState.bases.filter(base =>
      base.playerId === playerId && !base.isDestroyed
    ).length;

    const totalUnits = gameState.units.length;
    const totalBases = gameState.bases.filter(base => !base.isDestroyed).length;

    if (totalUnits + totalBases === 0) return 0;

    return Math.round(((playerUnits + playerBases * 2) / (totalUnits + totalBases * 2)) * 100);
  }

  /**
     * Button state management methods
     */
  enableButton(buttonName) {
    const element = this.domProvider.get(this.elementNames[buttonName]);
    if (element) {
      element.disabled = false;
      this.domProvider.removeClass(this.elementNames[buttonName], 'disabled');
    }
  }

  disableButton(buttonName) {
    const element = this.domProvider.get(this.elementNames[buttonName]);
    if (element) {
      element.disabled = true;
      this.domProvider.addClass(this.elementNames[buttonName], 'disabled');
    }
  }

  setButtonText(buttonName, text) {
    this.domProvider.updateContent(this.elementNames[buttonName], text);
  }

  /**
     * Game state query methods (delegated to services)
     */
  isGameEnded() {
    return this.gameStateManager.getGameStatus() === 'ended';
  }

  getCurrentPlayer() {
    return this.gameStateManager.getCurrentPlayer();
  }

  getCurrentPhase() {
    return this.turnManagerService.getCurrentTurnInfo().phase;
  }

  getCurrentTurn() {
    return this.turnManagerService.getCurrentTurnInfo().turn;
  }

  /**
     * Element visibility management
     */
  showElement(elementName) {
    this.domProvider.setVisible(this.elementNames[elementName], true);
  }

  hideElement(elementName) {
    this.domProvider.setVisible(this.elementNames[elementName], false);
  }

  /**
     * Batch update multiple UI elements
     * @param {Object} updates - Map of element names to content
     */
  batchUpdate(updates) {
    Object.entries(updates).forEach(([elementName, content]) => {
      if (this.elementNames[elementName]) {
        this.domProvider.updateContent(this.elementNames[elementName], content);
      }
    });
  }

  /**
     * Get UI state for debugging
     * @returns {Object} Current UI state
     */
  getUIState() {
    return {
      ...this.uiState,
      elementNames: { ...this.elementNames },
      serviceStatus: {
        gameStateManager: this.gameStateManager.getStatus(),
        turnManagerService: this.turnManagerService.getStatus(),
        domProvider: this.domProvider.getRegistryInfo()
      }
    };
  }

  /**
     * Cleanup method - removes event listeners and clears state
     */
  destroy() {
    // Remove event listeners from services
    if (this.gameStateManager) {
      this.gameStateManager.removeAllListeners();
    }

    if (this.turnManagerService) {
      this.turnManagerService.removeAllListeners();
    }

    // Clear UI state
    this.uiState.cachedValues.clear();
    this.uiState.updateQueue = [];

    console.log('UIStateManager destroyed');
  }
}

export default UIStateManager;
