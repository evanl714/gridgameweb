class GameStatus {
  constructor(gameState) {
    this.gameState = gameState;
    this.element = null;
    this.init();
  }

  init() {
    this.createElement();
    this.setupEventListeners();
    this.update();
  }

  createElement() {
    const container = document.createElement('div');
    container.className = 'game-status-interface';
    container.innerHTML = `
            <div class="status-panel">
                <div class="game-state-display">
                    <div class="state-indicator">
                        <span class="state-icon">🎮</span>
                        <span class="state-text">Ready</span>
                    </div>
                    <div class="game-mode">
                        <span class="mode-label">Mode:</span>
                        <span class="mode-text">Local Multiplayer</span>
                    </div>
                </div>

                <div class="victory-tracking">
                    <h4>Victory Conditions</h4>
                    <div class="victory-condition resource-victory">
                        <span class="condition-icon">💰</span>
                        <span class="condition-label">Resource Victory:</span>
                        <span class="condition-status">First to 500 resources</span>
                    </div>
                    <div class="victory-condition elimination-victory">
                        <span class="condition-icon">⚔️</span>
                        <span class="condition-label">Elimination Victory:</span>
                        <span class="condition-status">Eliminate all enemy units</span>
                    </div>
                </div>

                <div class="player-status-summary">
                    <div class="player-summary" data-player="1">
                        <div class="player-header">
                            <span class="player-indicator player-1">Player 1</span>
                            <span class="player-status-icon">✓</span>
                        </div>
                        <div class="player-stats">
                            <div class="stat">
                                <span class="stat-label">Units:</span>
                                <span class="stat-value unit-count">0</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Resources:</span>
                                <span class="stat-value resource-total">0</span>
                            </div>
                        </div>
                    </div>

                    <div class="player-summary" data-player="2">
                        <div class="player-header">
                            <span class="player-indicator player-2">Player 2</span>
                            <span class="player-status-icon">✓</span>
                        </div>
                        <div class="player-stats">
                            <div class="stat">
                                <span class="stat-label">Units:</span>
                                <span class="stat-value unit-count">0</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Resources:</span>
                                <span class="stat-value resource-total">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="game-controls">
                    <button id="pauseGameBtn" class="control-btn pause-btn">
                        <span class="btn-icon">⏸️</span>
                        <span class="btn-text">Pause</span>
                    </button>
                    <button id="forfeitBtn" class="control-btn forfeit-btn">
                        <span class="btn-icon">🏳️</span>
                        <span class="btn-text">Forfeit</span>
                    </button>
                    <button id="saveGameBtn" class="control-btn save-btn">
                        <span class="btn-icon">💾</span>
                        <span class="btn-text">Save</span>
                    </button>
                </div>
            </div>
        `;

    this.element = container;
    this.cacheElements();
    this.setupControls();
  }

  cacheElements() {
    this.stateText = this.element.querySelector('.state-text');
    this.stateIcon = this.element.querySelector('.state-icon');
    this.playerSummaries = this.element.querySelectorAll('.player-summary');
    this.pauseBtn = this.element.querySelector('#pauseGameBtn');
    this.forfeitBtn = this.element.querySelector('#forfeitBtn');
    this.saveBtn = this.element.querySelector('#saveGameBtn');
  }

  setupControls() {
    this.pauseBtn.addEventListener('click', () => this.handlePauseGame());
    this.forfeitBtn.addEventListener('click', () => this.handleForfeit());
    this.saveBtn.addEventListener('click', () => this.handleSaveGame());
  }

  setupEventListeners() {
    this.gameState.on('gameStarted', () => this.handleGameStarted());
    this.gameState.on('gameEnded', (data) => this.handleGameEnded(data));
    this.gameState.on('gamePaused', () => this.handleGamePaused());
    this.gameState.on('gameResumed', () => this.handleGameResumed());
    this.gameState.on('unitCreated', () => this.updatePlayerStats());
    this.gameState.on('unitRemoved', () => this.updatePlayerStats());
    this.gameState.on('resourcesGathered', () => this.updatePlayerStats());
    this.gameState.on('turnStarted', () => this.update());
  }

  handleGameStarted() {
    this.updateGameState('playing', '🎮', 'Playing');
    this.enableControls();
    this.update();
  }

  handleGameEnded(data) {
    if (data && data.winner) {
      this.updateGameState('ended', '🏆', `Player ${data.winner} Wins!`);
      this.markWinner(data.winner);
    } else {
      this.updateGameState('ended', '🏁', 'Game Ended');
    }
    this.disableControls();
  }

  handleGamePaused() {
    this.updateGameState('paused', '⏸️', 'Paused');
    this.pauseBtn.innerHTML = '<span class="btn-icon">▶️</span><span class="btn-text">Resume</span>';
  }

  handleGameResumed() {
    this.updateGameState('playing', '🎮', 'Playing');
    this.pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span><span class="btn-text">Pause</span>';
  }

  handlePauseGame() {
    if (this.gameState.status === 'paused') {
      this.gameState.resumeGame();
    } else {
      this.gameState.pauseGame();
    }
  }

  handleForfeit() {
    const currentPlayer = this.gameState.getCurrentPlayer();
    if (currentPlayer && confirm(`Player ${currentPlayer.id}, are you sure you want to forfeit the game?`)) {
      const otherPlayerId = currentPlayer.id === 1 ? 2 : 1;
      this.gameState.endGame(otherPlayerId, 'forfeit');
    }
  }

  handleSaveGame() {
    try {
      const gameData = this.gameState.serialize();
      const dataStr = JSON.stringify(gameData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `grid-game-save-${new Date().toISOString().slice(0, 19)}.json`;
      link.click();

      this.showNotification('Game saved successfully!');
    } catch (error) {
      console.error('Failed to save game:', error);
      this.showNotification('Failed to save game', 'error');
    }
  }

  updateGameState(status, icon, text) {
    this.stateIcon.textContent = icon;
    this.stateText.textContent = text;
    this.element.setAttribute('data-game-status', status);
  }

  enableControls() {
    this.pauseBtn.disabled = false;
    this.forfeitBtn.disabled = false;
    this.saveBtn.disabled = false;
  }

  disableControls() {
    this.pauseBtn.disabled = true;
    this.forfeitBtn.disabled = true;
  }

  markWinner(winnerId) {
    this.playerSummaries.forEach(summary => {
      const playerId = parseInt(summary.getAttribute('data-player'));
      const statusIcon = summary.querySelector('.player-status-icon');

      if (playerId === winnerId) {
        statusIcon.textContent = '👑';
        summary.classList.add('winner');
      } else {
        statusIcon.textContent = '💀';
        summary.classList.add('loser');
      }
    });
  }

  updatePlayerStats() {
    if (!this.gameState || !this.gameState.players) return;

    for (const [playerId, player] of this.gameState.players) {
      this.updatePlayerSummary(playerId, player);
    }
  }

  updatePlayerSummary(playerId, player) {
    const summary = this.element.querySelector(`[data-player="${playerId}"]`);
    if (!summary) return;

    const unitCount = summary.querySelector('.unit-count');
    const resourceTotal = summary.querySelector('.resource-total');
    const statusIcon = summary.querySelector('.player-status-icon');

    const playerUnits = this.gameState.getPlayerUnits(playerId);
    unitCount.textContent = playerUnits.length;

    resourceTotal.textContent = player.resourcesGathered || 0;

    if (playerUnits.length === 0 && this.gameState.turnNumber > 5) {
      statusIcon.textContent = '⚠️';
      summary.classList.add('eliminated');
    } else if (player.resourcesGathered >= 500) {
      statusIcon.textContent = '🎯';
      summary.classList.add('victory-condition-met');
    } else {
      statusIcon.textContent = '✓';
      summary.classList.remove('eliminated', 'victory-condition-met');
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  update() {
    if (!this.gameState) return;

    this.updatePlayerStats();

    const status = this.gameState.status;
    if (status === 'ready' && this.stateText.textContent !== 'Ready') {
      this.updateGameState('ready', '🎮', 'Ready');
    }
  }

  render(parentElement) {
    if (this.element && parentElement) {
      parentElement.appendChild(this.element);
    }
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.gameState.off('gameStarted', this.handleGameStarted);
    this.gameState.off('gameEnded', this.handleGameEnded);
    this.gameState.off('gamePaused', this.handleGamePaused);
    this.gameState.off('gameResumed', this.handleGameResumed);
    this.gameState.off('unitCreated', this.updatePlayerStats);
    this.gameState.off('unitRemoved', this.updatePlayerStats);
    this.gameState.off('resourcesGathered', this.updatePlayerStats);
    this.gameState.off('turnStarted', this.update);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameStatus;
}

export { GameStatus };
