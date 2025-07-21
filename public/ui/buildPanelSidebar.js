class BuildPanelSidebar {
  constructor(gameState, turnManager) {
    this.gameState = gameState;
    this.turnManager = turnManager;
    this.element = null;
    this.selectedPosition = null;
    this.isInitialized = false;
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
    // Ensure DOM is ready and dependencies are available
    if (this.isInitialized) return;
    
    try {
      // Wait for DOM element to be available
      this.element = document.getElementById('buildPanelSidebar');
      if (!this.element) {
        console.warn('BuildPanelSidebar: DOM element not found, retrying in 100ms');
        setTimeout(() => this.initialize(), 100);
        return;
      }
      
      // Check if gameState is properly initialized
      if (!this.gameState || typeof this.gameState.getCurrentPlayer !== 'function') {
        console.warn('BuildPanelSidebar: gameState not ready, retrying in 100ms');
        setTimeout(() => this.initialize(), 100);
        return;
      }
      
      this.isInitialized = true;
      this.renderBuildOptions();
      this.setupEventListeners();
      this.setupGameEventListeners();
      
      console.log('BuildPanelSidebar initialized successfully');
    } catch (error) {
      console.error('Error initializing BuildPanelSidebar:', error);
      // Retry initialization after a delay
      setTimeout(() => this.initialize(), 500);
    }
  }

  renderBuildOptions() {
    if (!this.element || !this.isInitialized) return;
    
    try {
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
    } catch (error) {
      console.error('Error rendering build options:', error);
    }
  }

  setupEventListeners() {
    if (!this.element || !this.isInitialized) return;
    
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
      // Validate inputs
      if (!unitType || typeof unitType !== 'string') {
        throw new Error('Invalid unit type');
      }
      
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        throw new Error('Invalid position coordinates');
      }
      
      if (!this.gameState || typeof this.gameState.buildUnit !== 'function') {
        throw new Error('Game state not available or buildUnit method missing');
      }
      
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
      this.showNotification(`Error building unit: ${error.message}`, 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Create modern toast notification
    const notification = document.createElement('div');
    notification.className = `build-notification ${type}`;
    notification.textContent = message;
    
    // Determine colors based on type
    const colors = {
      info: { bg: '#3498db', color: 'white', border: '#2980b9' },
      success: { bg: '#2ecc71', color: 'white', border: '#27ae60' },
      error: { bg: '#e74c3c', color: 'white', border: '#c0392b' },
      warning: { bg: '#f39c12', color: 'white', border: '#e67e22' }
    };
    
    const styleColor = colors[type] || colors.info;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${styleColor.bg};
      color: ${styleColor.color};
      padding: 12px 20px;
      border-radius: 8px;
      border: 2px solid ${styleColor.border};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: 600;
      font-size: 14px;
      max-width: 300px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      font-family: 'Segoe UI', sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  show(position = null) {
    try {
      // Ensure component is initialized
      if (!this.isInitialized) {
        console.warn('BuildPanelSidebar not initialized, attempting to initialize...');
        this.initialize();
        return;
      }
      
      // Set the selected position if provided
      if (position) {
        this.setSelectedPosition(position);
      }
      
      // Make sure the sidebar is visible and highlighted for build mode
      if (this.element) {
        this.element.classList.add('build-mode-active');
        this.element.style.display = 'block';
        this.element.style.visibility = 'visible';
        
        // Update the build options with current game state
        this.renderBuildOptions();
        
        // Add visual indicator that build mode is active
        const header = this.element.querySelector('.panel-header h3');
        if (header && !header.textContent.includes('(Active)')) {
          header.textContent += ' (Active)';
        }
      }
      
      console.log('Build panel activated for position:', position);
    } catch (error) {
      console.error('Error showing build panel:', error);
    }
  }
  
  hide() {
    try {
      // Clear the selected position
      this.clearSelectedPosition();
      
      // Remove build mode highlighting but keep sidebar visible
      if (this.element) {
        this.element.classList.remove('build-mode-active');
        
        // Remove the active indicator from header
        const header = this.element.querySelector('.panel-header h3');
        if (header) {
          header.textContent = header.textContent.replace(' (Active)', '');
        }
        
        // Update display to show current state
        this.renderBuildOptions();
      }
      
      console.log('Build panel deactivated');
    } catch (error) {
      console.error('Error hiding build panel:', error);
    }
  }

  update() {
    this.renderBuildOptions();
  }

  render() {
    this.renderBuildOptions();
  }
}

export { BuildPanelSidebar };