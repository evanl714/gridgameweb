class BuildPanel {
  constructor(gameState, turnManager) {
    this.gameState = gameState;
    this.turnManager = turnManager;
    this.element = document.getElementById('buildPanelSidebar');
    this.isVisible = false;
    this.selectedPosition = null;
    this.unitTypes = [
      {
        type: 'worker',
        name: 'Worker',
        icon: '♦',
        cost: 10,
        health: 50,
        attack: 5,
        movement: 2,
        abilities: ['gather', 'build'],
        description: 'Can gather resources from resource nodes'
      },
      {
        type: 'scout',
        name: 'Scout',
        icon: '♙',
        cost: 15,
        health: 30,
        attack: 10,
        movement: 4,
        abilities: ['scout', 'fast_move'],
        description: 'Fast movement and reconnaissance'
      },
      {
        type: 'infantry',
        name: 'Infantry',
        icon: '♗',
        cost: 25,
        health: 100,
        attack: 20,
        movement: 2,
        abilities: ['attack', 'defend'],
        description: 'Balanced combat unit'
      },
      {
        type: 'heavy',
        name: 'Heavy',
        icon: '♖',
        cost: 50,
        health: 200,
        attack: 40,
        movement: 1,
        abilities: ['heavy_attack', 'siege'],
        description: 'High damage, low mobility tank unit'
      }
    ];
    this.init();
  }

  init() {
    this.createElement();
    this.setupEventListeners();
  }

  createElement() {
    // Use existing sidebar element instead of creating modal overlay
    overlay.innerHTML = `
            <div class="build-panel">
                <div class="panel-header">
                    <h3>Build Unit</h3>
                    <button class="close-btn" aria-label="Close">×</button>
                </div>

                <div class="player-info">
                    <div class="current-energy">
                        <span class="energy-icon">⚡</span>
                        <span class="energy-label">Available Energy:</span>
                        <span class="energy-amount">0</span>
                    </div>
                    <div class="build-position">
                        <span class="position-label">Build Position:</span>
                        <span class="position-coords">Not selected</span>
                    </div>
                </div>

                <div class="unit-selection">
                    <div class="unit-grid">
                        ${this.unitTypes.map(unit => `
                            <div class="unit-option" data-type="${unit.type}" data-cost="${unit.cost}">
                                <div class="unit-card">
                                    <div class="unit-header">
                                        <span class="unit-icon">${unit.icon}</span>
                                        <span class="unit-name">${unit.name}</span>
                                        <div class="unit-cost">
                                            <span class="cost-amount">${unit.cost}</span>
                                            <span class="cost-icon">⚡</span>
                                        </div>
                                    </div>
                                    
                                    <div class="unit-stats">
                                        <div class="stat-item">
                                            <span class="stat-icon">❤️</span>
                                            <span class="stat-value">${unit.health}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="stat-icon">⚔️</span>
                                            <span class="stat-value">${unit.attack}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="stat-icon">👟</span>
                                            <span class="stat-value">${unit.movement}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="unit-abilities">
                                        ${unit.abilities.map(ability => `
                                            <span class="ability-tag">${ability}</span>
                                        `).join('')}
                                    </div>
                                    
                                    <div class="unit-description">
                                        ${unit.description}
                                    </div>

                                    <button class="build-btn" data-type="${unit.type}">
                                        <span class="btn-text">Build</span>
                                        <span class="btn-cost">${unit.cost} ⚡</span>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="panel-footer">
                    <div class="build-tips">
                        <div class="tip">💡 Units must be built near your base</div>
                        <div class="tip">💡 Build during the Build phase only</div>
                        <div class="tip">💡 Units are built instantly when you have enough energy</div>
                    </div>
                    <div class="panel-actions">
                        <button class="cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `;

    this.element = overlay;
    this.cacheElements();
    this.setupControls();
    this.hide();
  }

  cacheElements() {
    this.panel = this.element.querySelector('.build-panel');
    this.closeBtn = this.element.querySelector('.close-btn');
    this.cancelBtn = this.element.querySelector('.cancel-btn');
    this.energyAmount = this.element.querySelector('.energy-amount');
    this.positionCoords = this.element.querySelector('.position-coords');
    this.unitOptions = this.element.querySelectorAll('.unit-option');
    this.buildButtons = this.element.querySelectorAll('.build-btn');
  }

  setupControls() {
    this.closeBtn.addEventListener('click', () => this.hide());
    this.cancelBtn.addEventListener('click', () => this.hide());

    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });

    this.buildButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const unitType = e.target.getAttribute('data-type') ||
                               e.target.closest('.build-btn').getAttribute('data-type');
        this.handleBuildUnit(unitType);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  setupEventListeners() {
    this.gameState.on('phaseChanged', () => this.handlePhaseChanged());
    this.gameState.on('unitCreated', () => this.updateEnergyDisplay());
    this.gameState.on('resourcesGathered', () => this.updateEnergyDisplay());
    this.gameState.on('gameEnded', () => this.hide());
  }

  handlePhaseChanged() {
    const currentPhase = this.gameState.currentPhase;
    if (currentPhase === 'build') {
      this.updateAvailability();
    } else if (this.isVisible) {
      this.hide();
    }
  }

  show(position = null) {
    if (this.gameState.currentPhase !== 'build') {
      this.showNotification('You can only build units during the Build phase!', 'warning');
      return;
    }

    // If position is provided, validate it
    if (position) {
      const currentPlayer = this.gameState.getCurrentPlayer();

      // Check if position is empty
      if (!this.gameState.isPositionEmpty(position.x, position.y)) {
        this.showNotification('Position is occupied', 'warning');
        return;
      }

      // Check base proximity
      if (!this.gameState.isWithinBaseRadius(currentPlayer.id, position.x, position.y)) {
        this.showNotification('Units must be built near your base!', 'warning');
        return;
      }
    }

    this.selectedPosition = position;
    this.updateDisplay();
    this.element.style.display = 'flex';
    this.isVisible = true;

    setTimeout(() => {
      this.element.classList.add('visible');
    }, 10);

    // Insert into document root to bypass body grid layout constraints
    document.documentElement.appendChild(this.element);
  }

  hide() {
    this.element.classList.remove('visible');
    this.isVisible = false;

    setTimeout(() => {
      this.element.style.display = 'none';
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 300);
  }

  updateDisplay() {
    this.updateEnergyDisplay();
    this.updatePositionDisplay();
    this.updateAvailability();
  }

  updateEnergyDisplay() {
    const currentPlayer = this.gameState.getCurrentPlayer();
    if (currentPlayer) {
      this.energyAmount.textContent = currentPlayer.energy || 0;
    }
  }

  updatePositionDisplay() {
    if (this.selectedPosition) {
      this.positionCoords.textContent = `(${this.selectedPosition.x}, ${this.selectedPosition.y})`;
    } else {
      this.positionCoords.textContent = 'Click on an empty tile';
    }
  }

  updateAvailability() {
    const currentPlayer = this.gameState.getCurrentPlayer();
    if (!currentPlayer) return;

    const playerEnergy = currentPlayer.energy || 0;

    this.unitOptions.forEach(option => {
      const unitCost = parseInt(option.getAttribute('data-cost'));
      const buildBtn = option.querySelector('.build-btn');

      if (playerEnergy >= unitCost) {
        option.classList.remove('insufficient-energy');
        buildBtn.disabled = false;
      } else {
        option.classList.add('insufficient-energy');
        buildBtn.disabled = true;
      }
    });
  }

  handleBuildUnit(unitType) {
    if (!this.selectedPosition) {
      this.showNotification('Please select a position to build the unit', 'warning');
      return;
    }

    const currentPlayer = this.gameState.getCurrentPlayer();
    if (!currentPlayer) {
      this.showNotification('No active player found', 'error');
      return;
    }

    const unitData = this.unitTypes.find(u => u.type === unitType);
    if (!unitData) {
      this.showNotification('Invalid unit type', 'error');
      return;
    }

    // Check if position is empty
    if (!this.gameState.isPositionEmpty(this.selectedPosition.x, this.selectedPosition.y)) {
      this.showNotification('Position is occupied', 'warning');
      return;
    }

    // Check base proximity
    if (!this.gameState.isWithinBaseRadius(currentPlayer.id, this.selectedPosition.x, this.selectedPosition.y)) {
      this.showNotification('Units must be built near your base!', 'warning');
      return;
    }

    try {
      const unit = this.gameState.createUnit(
        unitType,
        currentPlayer.id,
        this.selectedPosition.x,
        this.selectedPosition.y
      );

      if (!unit) {
        this.showNotification('Failed to create unit', 'error');
        return;
      }

      this.showNotification(`${unitData.name} built successfully!`, 'success');
      this.updateDisplay();

      if (this.shouldAutoClose()) {
        setTimeout(() => this.hide(), 1500);
      }
    } catch (error) {
      console.error('Failed to build unit:', error);
      this.showNotification('Failed to build unit: ' + error.message, 'error');
    }
  }

  shouldAutoClose() {
    return true;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `build-notification ${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;

    this.panel.appendChild(notification);

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

  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  render(parentElement) {
    if (parentElement) {
      parentElement.appendChild(this.element);
    }
  }

  destroy() {
    this.hide();
    this.gameState.off('phaseChanged', this.handlePhaseChanged);
    this.gameState.off('unitCreated', this.updateEnergyDisplay);
    this.gameState.off('resourcesGathered', this.updateEnergyDisplay);
    this.gameState.off('gameEnded', this.hide);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BuildPanel;
}

export { BuildPanel };
