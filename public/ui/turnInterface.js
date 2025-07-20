class TurnInterface {
  constructor(gameState, turnManager) {
    this.gameState = gameState;
    this.turnManager = turnManager;
    this.element = null;
    this.turnTimer = null;
    this.timeRemaining = 120; // 2 minutes in seconds
    this.init();
  }

  init() {
    this.createElement();
    this.setupEventListeners();
    this.update();
  }

  createElement() {
    const container = document.createElement('div');
    container.className = 'turn-interface';
    container.innerHTML = `
            <div class="turn-panel">
                <div class="turn-header">
                    <div class="turn-info">
                        <span class="turn-label">Turn</span>
                        <span class="turn-number">1</span>
                    </div>
                    <div class="timer-display">
                        <span class="timer-icon">⏰</span>
                        <span class="timer-value">2:00</span>
                    </div>
                </div>
                
                <div class="phase-indicator">
                    <div class="phase-step resource-phase" data-phase="resource">
                        <span class="phase-icon">⚡</span>
                        <span class="phase-name">Resource</span>
                    </div>
                    <div class="phase-step action-phase" data-phase="action">
                        <span class="phase-icon">⚔️</span>
                        <span class="phase-name">Action</span>
                    </div>
                    <div class="phase-step build-phase" data-phase="build">
                        <span class="phase-icon">🔨</span>
                        <span class="phase-name">Build</span>
                    </div>
                </div>

                <div class="current-player-info">
                    <div class="active-player">
                        <span class="player-label">Current Player:</span>
                        <span class="player-name player-1">Player 1</span>
                    </div>
                    <div class="actions-remaining">
                        <span class="actions-label">Actions:</span>
                        <span class="actions-count">3/3</span>
                    </div>
                </div>

                <div class="turn-controls">
                    <button id="uiEndTurnBtn" class="end-turn-btn">End Turn</button>
                    <button id="uiNextPhaseBtn" class="next-phase-btn">Next Phase</button>
                </div>
            </div>
        `;

    this.element = container;
    this.cacheElements();
    this.setupControls();
  }

  cacheElements() {
    this.turnNumber = this.element.querySelector('.turn-number');
    this.timerValue = this.element.querySelector('.timer-value');
    this.phaseSteps = this.element.querySelectorAll('.phase-step');
    this.playerName = this.element.querySelector('.player-name');
    this.actionsCount = this.element.querySelector('.actions-count');
    this.endTurnBtn = this.element.querySelector('#uiEndTurnBtn');
    this.nextPhaseBtn = this.element.querySelector('#uiNextPhaseBtn');
  }

  setupControls() {
    this.endTurnBtn.addEventListener('click', () => this.handleEndTurn());
    this.nextPhaseBtn.addEventListener('click', () => this.handleNextPhase());
  }

  setupEventListeners() {
    this.gameState.on('turnStarted', () => this.handleTurnStarted());
    this.gameState.on('phaseChanged', () => this.handlePhaseChanged());
    this.gameState.on('actionUsed', () => this.handleActionUsed());
    this.gameState.on('gameStarted', () => this.update());
    this.gameState.on('gameEnded', () => this.handleGameEnded());
  }

  handleTurnStarted() {
    this.resetTimer();
    this.update();
  }

  handlePhaseChanged() {
    this.update();
    this.updatePhaseIndicator();
  }

  handleActionUsed() {
    this.updateActionsDisplay();
  }

  handleGameEnded() {
    this.stopTimer();
    this.endTurnBtn.disabled = true;
    this.nextPhaseBtn.disabled = true;
  }

  handleEndTurn() {
    if (confirm('Are you sure you want to end your turn?')) {
      if (this.turnManager && typeof this.turnManager.endTurn === 'function') {
        this.turnManager.endTurn();
      }
    }
  }

  handleNextPhase() {
    if (this.turnManager && typeof this.turnManager.nextPhase === 'function') {
      this.turnManager.nextPhase();
    }
  }

  resetTimer() {
    this.timeRemaining = 120;
    this.stopTimer();
    this.startTimer();
  }

  startTimer() {
    this.updateTimerDisplay();
    this.turnTimer = setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();

      if (this.timeRemaining <= 0) {
        this.handleTimeExpired();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (this.timeRemaining <= 30) {
      this.timerValue.classList.add('timer-warning');
    } else {
      this.timerValue.classList.remove('timer-warning');
    }
  }

  handleTimeExpired() {
    this.stopTimer();
    if (this.turnManager && typeof this.turnManager.forceEndTurn === 'function') {
      this.turnManager.forceEndTurn();
    }
  }

  updatePhaseIndicator() {
    const currentPhase = this.gameState.currentPhase || 'resource';

    this.phaseSteps.forEach(step => {
      step.classList.remove('active', 'completed');
      const stepPhase = step.getAttribute('data-phase');

      if (stepPhase === currentPhase) {
        step.classList.add('active');
      } else if (this.isPhaseCompleted(stepPhase, currentPhase)) {
        step.classList.add('completed');
      }
    });
  }

  isPhaseCompleted(phase, currentPhase) {
    const phases = ['resource', 'action', 'build'];
    const phaseIndex = phases.indexOf(phase);
    const currentIndex = phases.indexOf(currentPhase);
    return phaseIndex < currentIndex;
  }

  updateActionsDisplay() {
    const currentPlayer = this.gameState.getCurrentPlayer();
    if (currentPlayer) {
      const used = (currentPlayer.maxActions || 3) - (currentPlayer.actionsRemaining || 3);
      const total = currentPlayer.maxActions || 3;
      this.actionsCount.textContent = `${currentPlayer.actionsRemaining || 0}/${total}`;

      if (currentPlayer.actionsRemaining <= 0) {
        this.actionsCount.classList.add('actions-depleted');
      } else {
        this.actionsCount.classList.remove('actions-depleted');
      }
    }
  }

  update() {
    if (!this.gameState) return;

    this.turnNumber.textContent = this.gameState.turnNumber || 1;

    const currentPlayer = this.gameState.getCurrentPlayer();
    if (currentPlayer) {
      this.playerName.textContent = currentPlayer.name || `Player ${currentPlayer.id}`;
      this.playerName.className = `player-name player-${currentPlayer.id}`;
    }

    this.updatePhaseIndicator();
    this.updateActionsDisplay();

    const gameEnded = this.gameState.status === 'ended';
    this.endTurnBtn.disabled = gameEnded;
    this.nextPhaseBtn.disabled = gameEnded;
  }

  render(parentElement) {
    if (this.element && parentElement) {
      parentElement.appendChild(this.element);
    }
  }

  destroy() {
    this.stopTimer();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.gameState.off('turnStarted', this.handleTurnStarted);
    this.gameState.off('phaseChanged', this.handlePhaseChanged);
    this.gameState.off('actionUsed', this.handleActionUsed);
    this.gameState.off('gameStarted', this.update);
    this.gameState.off('gameEnded', this.handleGameEnded);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TurnInterface;
}

export { TurnInterface };
