class TurnTransition {
  constructor(gameState) {
    this.gameState = gameState;
    this.element = null;
    this.isVisible = false;
    this.transitionCallback = null;
    this.init();
  }

  init() {
    this.createElement();
    this.setupEventListeners();
  }

  createElement() {
    const overlay = document.createElement('div');
    overlay.className = 'turn-transition-overlay';
    overlay.innerHTML = `
      <div class="turn-transition-modal">
        <div class="transition-header">
          <h2 class="transition-title"></h2>
        </div>
        
        <div class="transition-content">
          <div class="turn-summary">
            <h3>Turn Summary</h3>
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">Actions Used:</span>
                <span class="stat-value" id="actionsUsed">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Energy Remaining:</span>
                <span class="stat-value" id="energyRemaining">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Units Moved:</span>
                <span class="stat-value" id="unitsMoved">0</span>
              </div>
            </div>
          </div>

          <div class="player-handoff">
            <div class="handoff-message">
              <p>Please pass the device to</p>
              <div class="next-player-info">
                <span class="next-player-name"></span>
              </div>
            </div>
            
            <div class="privacy-notice">
              <p>Game state will be hidden during handoff</p>
            </div>
          </div>
        </div>

        <div class="transition-footer">
          <button class="transition-btn secondary" id="showGameStateBtn">Show Game State</button>
          <button class="transition-btn primary" id="startTurnBtn">Start Turn</button>
        </div>
      </div>
    `;

    this.element = overlay;
    this.cacheElements();
    this.setupControls();
    document.body.appendChild(this.element);
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
    this.showGameStateBtn.addEventListener('click', () => this.showGameState());
    this.startTurnBtn.addEventListener('click', () => this.startNextTurn());
    
    // Allow keyboard navigation
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.startNextTurn();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.showGameState();
      }
    });
  }

  setupEventListeners() {
    this.gameState.on('turnEnded', (data) => {
      this.showTransition(data);
    });
  }

  showTransition(turnData) {
    if (this.isVisible) return;
    
    const { previousPlayer, nextPlayer, turnNumber } = turnData;
    const currentPlayer = this.gameState.getPlayerById(previousPlayer);
    const nextPlayerObj = this.gameState.getPlayerById(nextPlayer);
    
    if (!currentPlayer || !nextPlayerObj) return;

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

    // Show the overlay
    this.isVisible = true;
    this.element.style.display = 'flex';
    this.transitionModal.classList.add('slide-in');
    
    // Focus management for accessibility
    this.startTurnBtn.focus();
    
    // Hide game board during transition
    this.hideGameBoard();
  }

  calculateUnitsMoved(player) {
    // This is a simplified calculation - in a real implementation,
    // you'd track moves during the turn
    return player.unitsOwned ? Math.min(player.unitsOwned.size, 3) : 0;
  }

  showGameState() {
    this.showGameBoard();
    this.hide();
  }

  startNextTurn() {
    this.hide();
    this.showGameBoard();
    
    // Call any callback function
    if (this.transitionCallback) {
      this.transitionCallback();
      this.transitionCallback = null;
    }
  }

  hide() {
    if (!this.isVisible) return;
    
    this.transitionModal.classList.remove('slide-in');
    this.transitionModal.classList.add('slide-out');
    
    setTimeout(() => {
      this.element.style.display = 'none';
      this.transitionModal.classList.remove('slide-out');
      this.isVisible = false;
    }, 300);
  }

  hideGameBoard() {
    const gameBoard = document.querySelector('.game-board');
    const gameControls = document.querySelector('.game-controls');
    const uiContainer = document.querySelector('.ui-container');
    
    if (gameBoard) gameBoard.style.visibility = 'hidden';
    if (gameControls) gameControls.style.visibility = 'hidden';
    if (uiContainer) uiContainer.style.visibility = 'hidden';
  }

  showGameBoard() {
    const gameBoard = document.querySelector('.game-board');
    const gameControls = document.querySelector('.game-controls');
    const uiContainer = document.querySelector('.ui-container');
    
    if (gameBoard) gameBoard.style.visibility = 'visible';
    if (gameControls) gameControls.style.visibility = 'visible';
    if (uiContainer) uiContainer.style.visibility = 'visible';
  }

  setTransitionCallback(callback) {
    this.transitionCallback = callback;
  }

  destroy() {
    this.hide();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.gameState = null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TurnTransition;
}

export { TurnTransition };