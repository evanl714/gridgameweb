/**
 * Victory Screen Component
 * Displays game end results with victory/defeat messages and statistics
 */

// Import HTMLSanitizer for secure DOM manipulation
import '../js/utils/HTMLSanitizer.js';

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

    // Safely remove the overlay if it's still in the DOM
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
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

    // Create victory screen content using safe DOM creation
    this.createVictoryContent(title, message, celebrationClass);

    // Add click handler for overlay (close on background click)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Insert into document root to bypass body grid layout constraints
    document.documentElement.appendChild(this.overlay);
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
      message: 'Enemy base destroyed!',
      celebrationClass: 'victory-result'
    };
  }

  /**
   * Create victory screen content using safe DOM methods
   */
  createVictoryContent(title, message, celebrationClass) {
    // Create main content container
    const contentDiv = htmlSanitizer.createElement('div', {
      class: `victory-screen-content ${celebrationClass}`
    });

    // Create header section
    const headerDiv = htmlSanitizer.createElement('div', { class: 'victory-header' });
    const titleElement = htmlSanitizer.createElement('h1', { class: 'victory-title' }, title);
    const messageElement = htmlSanitizer.createElement('p', { class: 'victory-message' }, message);
    
    headerDiv.appendChild(titleElement);
    headerDiv.appendChild(messageElement);

    // Create stats section
    const statsDiv = this.createStatsSection();
    
    // Create actions section
    const actionsDiv = this.createActionsSection();

    // Assemble the content
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(statsDiv);
    contentDiv.appendChild(actionsDiv);
    
    this.overlay.appendChild(contentDiv);
  }

  /**
   * Create statistics section using safe DOM methods
   */
  createStatsSection() {
    const statsDiv = htmlSanitizer.createElement('div', {
      class: 'victory-stats',
      style: 'display: none;'
    });
    
    const statsTitle = htmlSanitizer.createElement('h3', {}, 'Game Statistics');
    const statsGrid = htmlSanitizer.createElement('div', { class: 'stats-grid' });
    
    // Add duration stat
    const durationStat = this.createStatItem('Duration:', `${this.gameState.turnNumber} turns`);
    const gameModeStat = this.createStatItem('Game Mode:', 'Player vs Player');
    
    statsGrid.appendChild(durationStat);
    statsGrid.appendChild(gameModeStat);
    
    // Add player stats
    const playerStatsElements = this.generatePlayerStatsElements();
    playerStatsElements.forEach(element => statsGrid.appendChild(element));
    
    statsDiv.appendChild(statsTitle);
    statsDiv.appendChild(statsGrid);
    
    return statsDiv;
  }

  /**
   * Create actions section using safe DOM methods
   */
  createActionsSection() {
    const actionsDiv = htmlSanitizer.createElement('div', { class: 'victory-actions' });
    
    // Create play again button
    const playAgainBtn = htmlSanitizer.createElement('button', {
      class: 'play-again-btn'
    }, '🔄 Play Again');
    
    playAgainBtn.addEventListener('click', async () => {
      // Use services container for dependency injection
      if (window.services) {
        const game = window.services.container.get('game');
        if (game) {
          await game.newGame();
        }
      }
    });
    
    // Create main menu button
    const mainMenuBtn = htmlSanitizer.createElement('button', {
      class: 'main-menu-btn'
    }, '🏠 Main Menu');
    
    mainMenuBtn.addEventListener('click', () => {
      window.location.reload();
    });
    
    actionsDiv.appendChild(playAgainBtn);
    actionsDiv.appendChild(mainMenuBtn);
    
    return actionsDiv;
  }

  /**
   * Create a stat item element
   */
  createStatItem(label, value) {
    const statItem = htmlSanitizer.createElement('div', { class: 'stat-item' });
    const statLabel = htmlSanitizer.createElement('span', { class: 'stat-label' }, label);
    const statValue = htmlSanitizer.createElement('span', { class: 'stat-value' }, value);
    
    statItem.appendChild(statLabel);
    statItem.appendChild(statValue);
    
    return statItem;
  }

  /**
   * Generate player statistics elements using safe DOM methods
   */
  generatePlayerStatsElements() {
    const players = this.gameState.getAllPlayers();
    const elements = [];

    for (const player of players) {
      const units = this.gameState.getPlayerUnits(player.id);
      const base = this.gameState.getPlayerBase(player.id);
      const isWinner = player.id === this.gameState.winner;

      const playerStatsDiv = htmlSanitizer.createElement('div', {
        class: `player-stats ${isWinner ? 'winner-stats' : ''}`
      });
      
      const playerTitle = htmlSanitizer.createElement('h4', {}, 
        `Player ${player.id} ${isWinner ? '👑' : ''}`
      );
      
      const unitsItem = this.createStatItem('Units:', units.length.toString());
      const healthItem = this.createStatItem('Base Health:', `${base ? base.health : 0}/200`);
      const energyItem = this.createStatItem('Energy:', player.energy.toString());
      const resourcesItem = this.createStatItem('Resources:', (player.resourcesGathered || 0).toString());
      
      playerStatsDiv.appendChild(playerTitle);
      playerStatsDiv.appendChild(unitsItem);
      playerStatsDiv.appendChild(healthItem);
      playerStatsDiv.appendChild(energyItem);
      playerStatsDiv.appendChild(resourcesItem);
      
      elements.push(playerStatsDiv);
    }

    return elements;
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.hide();
    } else if (event.key === 'Enter' || event.key === ' ') {
      // Start new game on Enter/Space
      if (window.services) {
        const game = window.services.container.get('game');
        if (game) {
          (async () => await game.newGame())();
        }
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
