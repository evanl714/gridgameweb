/**
 * Victory Screen Component
 * Displays game end results with victory/defeat messages and statistics
 */

export class VictoryScreen {
  constructor(gameState) {
    this.gameState = gameState;
    this.overlay = null;
    this.isVisible = false;

    // Bind event handlers
    this.handleGameEnded = this.handleGameEnded.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    // Listen for game end events
    this.gameState.on('gameEnded', this.handleGameEnded);
    this.gameState.on('playerSurrendered', this.handleGameEnded);
    this.gameState.on('drawDeclared', this.handleGameEnded);
  }

  /**
   * Handle game ended event
   */
  handleGameEnded(data) {
    const winner = data.winner || this.gameState.winner;
    this.show(winner, data);
  }

  /**
   * Show the victory screen
   */
  show(winner, eventData = {}) {
    if (this.isVisible) {
      return;
    }

    this.createOverlay(winner, eventData);
    this.isVisible = true;

    // Add keyboard listener for escape key
    document.addEventListener('keydown', this.handleKeyDown);

    // Auto-focus for keyboard navigation
    const playAgainBtn = this.overlay.querySelector('.play-again-btn');
    if (playAgainBtn) {
      playAgainBtn.focus();
    }
  }

  /**
   * Hide the victory screen
   */
  hide() {
    if (!this.isVisible || !this.overlay) {
      return;
    }

    document.body.removeChild(this.overlay);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay = null;
    this.isVisible = false;
  }

  /**
   * Create the victory screen overlay
   */
  createOverlay(winner, eventData) {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'victory-screen-overlay';

    // Determine victory message and styling
    const { title, message, celebrationClass } = this.getVictoryMessage(winner, eventData);

    // Create victory screen content
    this.overlay.innerHTML = `
      <div class="victory-screen-content ${celebrationClass}">
        <div class="victory-header">
          <h1 class="victory-title">${title}</h1>
          <p class="victory-message">${message}</p>
        </div>
        
        <div class="victory-stats">
          <h3>Game Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Duration:</span>
              <span class="stat-value">${this.gameState.turnNumber} turns</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Game Mode:</span>
              <span class="stat-value">Player vs Player</span>
            </div>
            ${this.generatePlayerStats()}
          </div>
        </div>

        <div class="victory-actions">
          <button class="play-again-btn" onclick="window.game.newGame()">
            🔄 Play Again
          </button>
          <button class="main-menu-btn" onclick="window.location.reload()">
            🏠 Main Menu
          </button>
        </div>
      </div>
    `;

    // Add click handler for overlay (close on background click)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    document.body.appendChild(this.overlay);
  }

  /**
   * Generate victory message based on winner and event type
   */
  getVictoryMessage(winner, eventData) {
    if (winner === null) {
      // Draw condition
      return {
        title: '🤝 Draw Game',
        message: 'The game ended in a draw!',
        celebrationClass: 'draw-result'
      };
    }

    if (eventData.surrenderedPlayer) {
      // Surrender victory
      return {
        title: `🏆 Player ${winner} Wins!`,
        message: `Player ${eventData.surrenderedPlayer} surrendered`,
        celebrationClass: 'victory-result'
      };
    }

    // Base destruction victory (default)
    return {
      title: `🏆 Player ${winner} Wins!`,
      message: `Enemy base destroyed!`,
      celebrationClass: 'victory-result'
    };
  }

  /**
   * Generate player statistics HTML
   */
  generatePlayerStats() {
    const players = this.gameState.getAllPlayers();
    let statsHtml = '';

    for (const player of players) {
      const units = this.gameState.getPlayerUnits(player.id);
      const base = this.gameState.getPlayerBase(player.id);
      const isWinner = player.id === this.gameState.winner;

      statsHtml += `
        <div class="player-stats ${isWinner ? 'winner-stats' : ''}">
          <h4>Player ${player.id} ${isWinner ? '👑' : ''}</h4>
          <div class="stat-item">
            <span class="stat-label">Units:</span>
            <span class="stat-value">${units.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Base Health:</span>
            <span class="stat-value">${base ? base.health : 0}/200</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Energy:</span>
            <span class="stat-value">${player.energy}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Resources:</span>
            <span class="stat-value">${player.resourcesGathered || 0}</span>
          </div>
        </div>
      `;
    }

    return statsHtml;
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.hide();
    } else if (event.key === 'Enter' || event.key === ' ') {
      // Start new game on Enter/Space
      if (window.game) {
        window.game.newGame();
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.hide();
    this.gameState.off('gameEnded', this.handleGameEnded);
    this.gameState.off('playerSurrendered', this.handleGameEnded);
    this.gameState.off('drawDeclared', this.handleGameEnded);
  }
}