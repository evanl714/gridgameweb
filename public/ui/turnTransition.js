class TurnTransition {
  constructor(gameState) {
    this.gameState = gameState;
    this.element = null;
    this.isVisible = false;
    this.transitionCallback = null;
    this.hideTimeout = null;
    this.eventListeners = [];
    this.lastTurnEventTime = 0; // For event deduplication
    this.eventDeduplicationDelay = 1000; // 1 second minimum between events
    this.emergencyHideTimeout = null;
    this.init();
    this.setupEmergencyControls();
  }

  init() {
    this.createElement();
    this.setupEventListeners();
  }

  createElement() {
    const overlay = document.createElement('div');
    overlay.className = 'turn-transition-overlay hidden';

    overlay.innerHTML = `
      <div class="turn-transition-modal" style="
        background: #2c3e50;
        border-radius: 12px;
        padding: 32px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        color: white;
        font-family: 'Segoe UI', sans-serif;
      ">
        <div class="transition-header" style="margin-bottom: 24px; text-align: center;">
          <h2 class="transition-title" style="font-size: 24px; font-weight: 600; color: #3498db; margin: 0;"></h2>
        </div>
        
        <div class="transition-content" style="margin-bottom: 32px;">
          <div class="turn-summary" style="margin-bottom: 20px;">
            <h3 style="font-size: 18px; margin-bottom: 12px; color: #ecf0f1;">Turn Summary</h3>
            <div class="summary-stats" style="display: grid; gap: 8px;">
              <div class="stat-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #34495e;">
                <span class="stat-label">Actions Used:</span>
                <span class="stat-value" id="actionsUsed" style="color: #e74c3c; font-weight: 600;">0</span>
              </div>
              <div class="stat-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #34495e;">
                <span class="stat-label">Energy Remaining:</span>
                <span class="stat-value" id="energyRemaining" style="color: #f39c12; font-weight: 600;">0</span>
              </div>
              <div class="stat-item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #34495e;">
                <span class="stat-label">Units Moved:</span>
                <span class="stat-value" id="unitsMoved" style="color: #2ecc71; font-weight: 600;">0</span>
              </div>
            </div>
          </div>

          <div class="player-handoff" style="text-align: center; padding: 16px; background: #34495e; border-radius: 8px;">
            <div class="handoff-message">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #bdc3c7;">Please pass the device to</p>
              <div class="next-player-info">
                <span class="next-player-name" style="font-size: 20px; font-weight: 600; color: #3498db;"></span>
              </div>
            </div>
            
            <div class="privacy-notice" style="margin-top: 12px;">
              <p style="margin: 0; font-size: 12px; color: #95a5a6;">Game state will be hidden during handoff</p>
            </div>
          </div>
        </div>

        <div class="transition-footer" style="display: flex; gap: 12px; justify-content: center;">
          <button class="transition-btn secondary" id="showGameStateBtn" style="
            padding: 12px 24px;
            border: 2px solid #7f8c8d;
            background: transparent;
            color: #ecf0f1;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
          ">Show Game State</button>
          <button class="transition-btn primary" id="startTurnBtn" style="
            padding: 12px 24px;
            border: none;
            background: #3498db;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
          ">Start Turn</button>
        </div>
      </div>
    `;

    this.element = overlay;
    this.cacheElements();
    this.setupControls();

    // Try inserting into html element instead of body to completely bypass grid layout
    document.documentElement.appendChild(this.element);

    // Force the overlay to be positioned outside any parent containers
    // and override body overflow constraints
    this.element.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 10000 !important;
      background: rgba(0, 0, 0, 0.85) !important;
      backdrop-filter: blur(8px) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: opacity 0.3s ease, visibility 0.3s ease !important;
      transform: translateZ(0) !important;
      overflow: auto !important;
    `;

    // Also ensure body can accommodate the overlay
    const originalBodyOverflow = document.body.style.overflow;
    this.originalBodyOverflow = originalBodyOverflow;
  }

  cacheElements() {
    this.transitionTitle = this.element.querySelector('.transition-title');
    this.nextPlayerName = this.element.querySelector('.next-player-name');
    this.actionsUsed = this.element.querySelector('#actionsUsed');
    this.energyRemaining = this.element.querySelector('#energyRemaining');
    this.unitsMoved = this.element.querySelector('#unitsMoved');
    this.showGameStateBtn = this.element.querySelector('#showGameStateBtn');
    this.startTurnBtn = this.element.querySelector('#startTurnBtn');
    this.transitionModal = this.element.querySelector('.turn-transition-modal');
  }

  setupControls() {
    // Track event listeners for proper cleanup
    const showGameStateHandler = () => this.showGameState();
    const startTurnHandler = () => this.startNextTurn();
    const keydownHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.startNextTurn();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.showGameState();
      }
    };

    this.showGameStateBtn.addEventListener('click', showGameStateHandler);
    this.startTurnBtn.addEventListener('click', startTurnHandler);
    this.element.addEventListener('keydown', keydownHandler);

    // Store references for cleanup
    this.eventListeners.push(
      { element: this.showGameStateBtn, event: 'click', handler: showGameStateHandler },
      { element: this.startTurnBtn, event: 'click', handler: startTurnHandler },
      { element: this.element, event: 'keydown', handler: keydownHandler }
    );
  }

  setupEventListeners() {
    this.gameState.on('turnEnded', (data) => {
      this.showTransitionWithDeduplication(data);
    });
  }

  setupEmergencyControls() {
    // Global emergency hide controls
    const emergencyHandler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        console.log('Emergency overlay hide triggered');
        this.emergencyHide();
      } else if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault();
        this.hide();
      }
    };

    document.addEventListener('keydown', emergencyHandler);
    this.eventListeners.push({
      element: document,
      event: 'keydown',
      handler: emergencyHandler
    });

    // Add console debugging commands
    window.turnTransitionDebug = {
      hide: () => this.emergencyHide(),
      show: () => this.element && console.log('Overlay element:', this.element),
      isVisible: () => this.isVisible,
      element: () => this.element
    };
  }

  showTransitionWithDeduplication(turnData) {
    const now = Date.now();
    if (now - this.lastTurnEventTime < this.eventDeduplicationDelay) {
      console.log('Turn transition event deduplicated - too soon after last event');
      return;
    }

    this.lastTurnEventTime = now;
    this.showTransition(turnData);
  }

  showTransition(turnData) {
    if (this.isVisible) {
      console.log('Turn transition already visible, skipping show');
      return;
    }

    const { previousPlayer, nextPlayer, turnNumber } = turnData;
    const currentPlayer = this.gameState.getPlayerById(previousPlayer);
    const nextPlayerObj = this.gameState.getPlayerById(nextPlayer);

    if (!currentPlayer || !nextPlayerObj) {
      console.warn('Invalid player data for turn transition:', { previousPlayer, nextPlayer });
      return;
    }

    console.log('Showing turn transition overlay');

    // Update transition content
    this.transitionTitle.textContent = `Turn ${turnNumber - 1} Complete`;
    this.nextPlayerName.textContent = `Player ${nextPlayer}`;
    this.nextPlayerName.className = `next-player-name player-${nextPlayer}`;

    // Calculate turn summary
    const maxActions = currentPlayer.maxActions || 3;
    const actionsUsed = maxActions - (currentPlayer.actionsRemaining || 0);

    this.actionsUsed.textContent = `${actionsUsed}/${maxActions}`;
    this.energyRemaining.textContent = currentPlayer.energy || 0;
    this.unitsMoved.textContent = this.calculateUnitsMoved(currentPlayer);

    // Show the overlay using inline styles to override everything
    this.isVisible = true;
    this.element.style.opacity = '1';
    this.element.style.visibility = 'visible';
    this.element.style.pointerEvents = 'auto';
    this.transitionModal.classList.add('slide-in');

    // Focus management for accessibility
    setTimeout(() => {
      if (this.startTurnBtn && this.isVisible) {
        this.startTurnBtn.focus();
      }
    }, 100);

    // Hide game board during transition
    this.hideGameBoard();

    // Emergency safety timeout
    this.emergencyHideTimeout = setTimeout(() => {
      if (this.isVisible) {
        console.warn('Turn transition overlay emergency timeout - auto-hiding after 30 seconds');
        this.emergencyHide();
      }
    }, 30000);
  }

  calculateUnitsMoved(player) {
    // This is a simplified calculation - in a real implementation,
    // you'd track moves during the turn
    return player.unitsOwned ? Math.min(player.unitsOwned.size, 3) : 0;
  }

  showGameState() {
    console.log('Show game state button clicked');
    this.hide();
    this.showGameBoard();
  }

  startNextTurn() {
    console.log('Starting next turn - hiding overlay');
    this.hide();
    this.showGameBoard();

    // Call any callback function
    if (this.transitionCallback) {
      try {
        this.transitionCallback();
        this.transitionCallback = null;
      } catch (error) {
        console.error('Error in transition callback:', error);
      }
    }
  }

  hide() {
    if (!this.isVisible) {
      console.log('Turn transition already hidden');
      return;
    }

    try {
      console.log('Hiding turn transition overlay');

      // Immediately mark as not visible to prevent race conditions
      this.isVisible = false;

      // Clear any existing timeouts
      this.clearTimeouts();

      // Hide using inline styles for immediate effect - use !important for reliability
      this.element.style.cssText = this.element.style.cssText.replace(/pointer-events: auto/g, 'pointer-events: none');
      this.element.style.opacity = '0';
      this.element.style.visibility = 'hidden';
      this.element.style.pointerEvents = 'none';

      // Also add hidden class as backup
      this.element.classList.add('hidden');
      this.element.classList.remove('visible');
      this.transitionModal.classList.remove('slide-in', 'slide-out');

      // Ensure game board is visible
      this.showGameBoard();

      console.log('Turn transition overlay hidden successfully');

    } catch (error) {
      console.error('Error hiding turn transition:', error);
      this.emergencyHide();
    }
  }


  emergencyHide() {
    // Emergency fallback to ensure overlay is hidden
    console.log('Emergency hide triggered');

    try {
      // Clear all timeouts
      this.clearTimeouts();

      // Force mark as not visible
      this.isVisible = false;

      if (this.element) {
        // Force hidden state with inline styles and classes
        this.element.style.cssText = this.element.style.cssText.replace(/pointer-events: auto/g, 'pointer-events: none');
        this.element.style.opacity = '0';
        this.element.style.visibility = 'hidden';
        this.element.style.pointerEvents = 'none';
        this.element.classList.add('hidden');
        this.element.classList.remove('visible');
      }

      if (this.transitionModal) {
        this.transitionModal.classList.remove('slide-in', 'slide-out');
      }

      // Ensure game board is visible
      this.showGameBoard();

      console.log('Turn transition overlay emergency hidden successfully');
    } catch (error) {
      console.error('Critical error in emergencyHide:', error);
      // Last resort - remove the entire element
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
        this.isVisible = false;
        console.log('Turn transition overlay element removed as last resort');
      }
    }
  }

  clearTimeouts() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    if (this.emergencyHideTimeout) {
      clearTimeout(this.emergencyHideTimeout);
      this.emergencyHideTimeout = null;
    }
  }

  hideGameBoard() {
    try {
      const gameBoard = document.querySelector('.game-board');
      const gameControls = document.querySelector('.game-controls');
      const uiContainer = document.querySelector('.ui-container');

      // Use opacity instead of visibility to avoid layout issues
      if (gameBoard) {
        gameBoard.style.opacity = '0';
        gameBoard.style.pointerEvents = 'none';
        gameBoard.dataset.hiddenByTransition = 'true';
      }
      if (gameControls) {
        gameControls.style.opacity = '0';
        gameControls.style.pointerEvents = 'none';
        gameControls.dataset.hiddenByTransition = 'true';
      }
      if (uiContainer) {
        uiContainer.style.opacity = '0';
        uiContainer.style.pointerEvents = 'none';
        uiContainer.dataset.hiddenByTransition = 'true';
      }
    } catch (error) {
      console.error('Error hiding game board:', error);
    }
  }

  showGameBoard() {
    try {
      const gameBoard = document.querySelector('.game-board');
      const gameControls = document.querySelector('.game-controls');
      const uiContainer = document.querySelector('.ui-container');

      // Only restore elements that were hidden by this transition
      if (gameBoard && gameBoard.dataset.hiddenByTransition === 'true') {
        gameBoard.style.opacity = '1';
        gameBoard.style.pointerEvents = 'auto';
        delete gameBoard.dataset.hiddenByTransition;
      }
      if (gameControls && gameControls.dataset.hiddenByTransition === 'true') {
        gameControls.style.opacity = '1';
        gameControls.style.pointerEvents = 'auto';
        delete gameControls.dataset.hiddenByTransition;
      }
      if (uiContainer && uiContainer.dataset.hiddenByTransition === 'true') {
        uiContainer.style.opacity = '1';
        uiContainer.style.pointerEvents = 'auto';
        delete uiContainer.dataset.hiddenByTransition;
      }
    } catch (error) {
      console.error('Error showing game board:', error);
    }
  }

  setTransitionCallback(callback) {
    this.transitionCallback = callback;
  }

  destroy() {
    try {
      console.log('Destroying turn transition overlay');

      // Clear any pending timeouts
      this.clearTimeouts();

      // Remove all tracked event listeners
      this.eventListeners.forEach(({ element, event, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(event, handler);
        }
      });
      this.eventListeners = [];

      // Remove game state event listener if it exists
      if (this.gameState && typeof this.gameState.off === 'function') {
        this.gameState.off('turnEnded');
      }

      // Clean up debug commands
      if (window.turnTransitionDebug) {
        delete window.turnTransitionDebug;
      }

      // Hide and remove element
      this.emergencyHide();
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }

      // Clean up references
      this.element = null;
      this.gameState = null;
      this.transitionCallback = null;

    } catch (error) {
      console.error('Error during TurnTransition destroy:', error);
    }
  }
}

// ES6 module export only
export { TurnTransition };
