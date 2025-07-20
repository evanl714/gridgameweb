class BuildPanelSidebar {
  constructor(gameState, turnManager) {
    this.gameState = gameState;
    this.turnManager = turnManager;
    this.element = document.getElementById('buildPanelSidebar');
    this.selectedPosition = null;
    this.unitTypes = [
      {
        type: 'worker',
        name: 'Worker',
        icon: 'WRK',
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
        icon: 'SCT',
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
        icon: 'INF',
        cost: 25,
        health: 100,
        attack: 20,
        movement: 2,
        abilities: ['attack', 'defend'],
        description: 'Standard combat unit with balanced stats'
      },
      {
        type: 'heavy',
        name: 'Heavy',
        icon: 'HVY',
        cost: 50,
        health: 200,
        attack: 40,
        movement: 1,
        abilities: ['heavy_attack', 'siege'],
        description: 'Powerful unit with high health and damage'
      }
    ];
    
    this.initialize();
  }

  initialize() {
    this.renderBuildOptions();
    this.setupEventListeners();
    this.setupGameEventListeners();
  }

  renderBuildOptions() {
    if (!this.element) return;
    
    const currentPlayer = this.gameState.getCurrentPlayer();
    const playerEnergy = currentPlayer ? currentPlayer.energy : 0;
    
    this.element.innerHTML = `
      <div class="build-unit-grid">
        ${this.unitTypes.map(unit => `
          <div class="build-unit-card ${playerEnergy < unit.cost ? 'insufficient-energy' : ''}" 
               data-type="${unit.type}" 
               data-cost="${unit.cost}">
            <div class="build-unit-icon">${unit.icon}</div>
            <div class="build-unit-info">
              <div class="build-unit-name">${unit.name}</div>
              <div class="build-unit-cost">${unit.cost} Energy</div>
              <div class="build-unit-stats">
                HP:${unit.health} ATK:${unit.attack} MOV:${unit.movement}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  setupEventListeners() {
    if (!this.element) return;
    
    this.element.addEventListener('click', (e) => {
      const unitCard = e.target.closest('.build-unit-card');
      if (!unitCard) return;
      
      const unitType = unitCard.dataset.type;
      const unitCost = parseInt(unitCard.dataset.cost);
      
      // Check if player has enough energy
      const currentPlayer = this.gameState.getCurrentPlayer();
      if (!currentPlayer || currentPlayer.energy < unitCost) {
        this.showNotification('Insufficient energy to build this unit', 'error');
        return;
      }
      
      // Check if we have a selected position
      if (!this.selectedPosition) {
        this.showNotification('Select a position on the grid first', 'warning');
        return;
      }
      
      this.buildUnit(unitType, this.selectedPosition);
    });
  }

  setupGameEventListeners() {
    // Listen for game state changes to update available energy
    document.addEventListener('gameStateChanged', () => {
      this.renderBuildOptions();
    });
    
    // Listen for turn changes
    document.addEventListener('turnChanged', () => {
      this.renderBuildOptions();
    });
    
    // Listen for energy changes
    document.addEventListener('energyChanged', () => {
      this.renderBuildOptions();
    });
  }

  setSelectedPosition(position) {
    this.selectedPosition = position;
  }

  clearSelectedPosition() {
    this.selectedPosition = null;
  }

  buildUnit(unitType, position) {
    try {
      // Call the game's build unit method
      const success = this.gameState.buildUnit(unitType, position.x, position.y);
      
      if (success) {
        this.showNotification(`${unitType} built successfully!`, 'success');
        this.clearSelectedPosition();
        this.renderBuildOptions(); // Update energy display
        
        // Dispatch events for other UI components
        document.dispatchEvent(new CustomEvent('unitBuilt', {
          detail: { unitType, position }
        }));
      } else {
        this.showNotification('Failed to build unit at this position', 'error');
      }
    } catch (error) {
      console.error('Error building unit:', error);
      this.showNotification('Error occurred while building unit', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = `build-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--panel-bg);
      color: var(--text-primary);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-accent);
      box-shadow: var(--shadow-glow);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  update() {
    this.renderBuildOptions();
  }

  render() {
    this.renderBuildOptions();
  }
}

export { BuildPanelSidebar };