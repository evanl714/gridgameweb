class ResourceDisplay {
  constructor(gameState) {
    this.gameState = gameState;
    this.element = null;
    this.playerDisplays = new Map();
    this.animationQueue = [];
    this.init();
  }

  init() {
    this.createElement();
    this.setupEventListeners();
    this.update();
  }

  createElement() {
    const container = document.createElement('div');
    container.className = 'resource-display';
    container.innerHTML = `
            <div class="resource-panel">
                <h3>Resources</h3>
                <div class="resource-players">
                    <div class="player-resources" data-player="1">
                        <div class="player-label">Player 1</div>
                        <div class="energy-display">
                            <span class="energy-icon">⚡</span>
                            <span class="energy-value">0</span>
                            <div class="energy-animation"></div>
                        </div>
                        <div class="victory-progress">
                            <div class="progress-label">Victory Progress</div>
                            <div class="progress-bar">
                                <div class="progress-fill" data-progress="0"></div>
                                <span class="progress-text">0/500</span>
                            </div>
                        </div>
                    </div>
                    <div class="player-resources" data-player="2">
                        <div class="player-label">Player 2</div>
                        <div class="energy-display">
                            <span class="energy-icon">⚡</span>
                            <span class="energy-value">0</span>
                            <div class="energy-animation"></div>
                        </div>
                        <div class="victory-progress">
                            <div class="progress-label">Victory Progress</div>
                            <div class="progress-bar">
                                <div class="progress-fill" data-progress="0"></div>
                                <span class="progress-text">0/500</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.element = container;
    this.cacheElements();
  }

  cacheElements() {
    this.playerDisplays.set(1, {
      element: this.element.querySelector('[data-player="1"]'),
      energy: this.element.querySelector('[data-player="1"] .energy-value'),
      animation: this.element.querySelector('[data-player="1"] .energy-animation'),
      progressFill: this.element.querySelector('[data-player="1"] .progress-fill'),
      progressText: this.element.querySelector('[data-player="1"] .progress-text')
    });

    this.playerDisplays.set(2, {
      element: this.element.querySelector('[data-player="2"]'),
      energy: this.element.querySelector('[data-player="2"] .energy-value'),
      animation: this.element.querySelector('[data-player="2"] .energy-animation'),
      progressFill: this.element.querySelector('[data-player="2"] .progress-fill'),
      progressText: this.element.querySelector('[data-player="2"] .progress-text')
    });
  }

  setupEventListeners() {
    this.gameState.on('turnStarted', () => this.update());
    this.gameState.on('turnEnded', () => this.update());
    this.gameState.on('phaseChanged', () => this.update());
    this.gameState.on('resourcesGathered', (data) => this.handleResourceChange(data));
    this.gameState.on('unitCreated', () => this.update());
    this.gameState.on('gameStarted', () => this.update());
    this.gameState.on('gameEnded', () => this.update());
  }

  handleResourceChange(data) {
    if (data && data.playerId && data.amount) {
      this.animateResourceChange(data.playerId, data.amount);
    }
    this.update();
  }

  animateResourceChange(playerId, amount) {
    const display = this.playerDisplays.get(playerId);
    if (!display || !display.animation) return;

    const animationElement = display.animation;
    const changeText = amount > 0 ? `+${amount}` : `${amount}`;
    const changeClass = amount > 0 ? 'energy-gain' : 'energy-loss';

    animationElement.textContent = changeText;
    animationElement.className = `energy-animation ${changeClass} animate`;

    setTimeout(() => {
      animationElement.className = 'energy-animation';
      animationElement.textContent = '';
    }, 1000);
  }

  update() {
    if (!this.gameState || !this.gameState.players) return;

    const currentPlayerId = this.gameState.currentPlayer;

    for (const [playerId, player] of this.gameState.players) {
      this.updatePlayerDisplay(playerId, player, playerId === currentPlayerId);
    }
  }

  updatePlayerDisplay(playerId, player, isActive = false) {
    const display = this.playerDisplays.get(playerId);
    if (!display) return;

    display.energy.textContent = player.energy || 0;

    const totalResources = player.resourcesGathered || 0;
    const progressPercent = Math.min((totalResources / 500) * 100, 100);

    display.progressFill.style.width = `${progressPercent}%`;
    display.progressFill.setAttribute('data-progress', progressPercent);
    display.progressText.textContent = `${totalResources}/500`;

    if (progressPercent >= 100) {
      display.progressFill.classList.add('victory-complete');
    }

    // Update active player highlighting
    const playerContainer = display.element;
    if (isActive) {
      playerContainer.classList.add('active-player');
      playerContainer.classList.remove('inactive-player');
    } else {
      playerContainer.classList.remove('active-player');
      playerContainer.classList.add('inactive-player');
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
    this.gameState.off('turnStarted', this.update);
    this.gameState.off('resourcesGathered', this.handleResourceChange);
    this.gameState.off('unitCreated', this.update);
    this.gameState.off('gameStarted', this.update);
    this.gameState.off('gameEnded', this.update);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResourceDisplay;
}

export { ResourceDisplay };
