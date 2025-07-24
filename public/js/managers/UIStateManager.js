/**
 * UIStateManager - Centralized DOM operations and UI state management
 * Extracted from monolithic Game class to improve separation of concerns
 */

export class UIStateManager {
  constructor(gameState, turnManager) {
    this.gameState = gameState;
    this.turnManager = turnManager;
    
    // Cache DOM elements for performance
    this.elements = this.cacheElements();
    
    // Setup UI event listeners
    this.setupUIListeners();
  }

  cacheElements() {
    return {
      // Player and game state displays
      currentPlayer: document.getElementById('currentPlayer'),
      gameStatus: document.getElementById('gameStatus'),
      turnNumber: document.getElementById('turnNumber'),
      turnDisplay: document.getElementById('turnDisplay'),
      gamePhase: document.getElementById('gamePhase'),
      phaseDisplay: document.getElementById('phaseDisplay'),
      
      // Player info displays
      playerEnergy: document.getElementById('playerEnergy'),
      playerActions: document.getElementById('playerActions'),
      playerUnits: document.getElementById('playerUnits'),
      selectedUnit: document.getElementById('selectedUnit'),
      
      // Control buttons
      gatherBtn: document.getElementById('gatherBtn'),
      newGameBtn: document.getElementById('newGameBtn'),
      nextPhaseBtn: document.getElementById('nextPhaseBtn'),
      surrenderBtn: document.getElementById('surrenderBtn'),
      
      // Optional elements that might not exist
      playerResources: document.getElementById('playerResources'),
      territoryControl: document.getElementById('territoryControl'),
      territoryBar: document.getElementById('territoryBar')
    };
  }

  setupUIListeners() {
    // Listen to game state events for automatic UI updates
    if (this.gameState) {
      this.gameState.on('gameStarted', () => this.updateAllUI());
      this.gameState.on('turnStarted', () => this.updateAllUI());
      this.gameState.on('turnEnded', () => this.updateAllUI());
      this.gameState.on('phaseChanged', () => this.updateAllUI());
      this.gameState.on('unitSelected', () => this.updateUnitInfo());
      this.gameState.on('unitDeselected', () => this.updateUnitInfo());
      this.gameState.on('unitMoved', () => this.updateAllUI());
      this.gameState.on('resourcesGathered', () => this.updateAllUI());
    }
  }

  updateAllUI() {
    this.updatePlayerDisplay();
    this.updateGameInfo();
    this.updateUnitInfo();
    this.updateControlButtons();
  }

  updatePlayerDisplay() {
    if (this.elements.currentPlayer && this.gameState) {
      const currentPlayer = this.gameState.getCurrentPlayer();
      if (currentPlayer) {
        this.elements.currentPlayer.textContent = `Player ${currentPlayer.id}'s Turn`;
        // Add visual indication for current player
        this.elements.currentPlayer.className = `current-player player-${currentPlayer.id}`;
      }
    }
  }

  updateGameInfo() {
    if (!this.gameState) return;

    // Update turn number display (both header and sidebar)
    if (this.elements.turnNumber) {
      this.elements.turnNumber.textContent = `Turn: ${this.gameState.turnNumber}`;
    }
    
    if (this.elements.turnDisplay) {
      this.elements.turnDisplay.textContent = this.gameState.turnNumber;
    }

    // Update phase display (both header and sidebar)
    if (this.elements.gamePhase) {
      this.elements.gamePhase.textContent = `Phase: ${this.gameState.currentPhase}`;
    }
    
    if (this.elements.phaseDisplay) {
      this.elements.phaseDisplay.textContent = this.gameState.currentPhase;
    }

    // Update player info
    const player = this.gameState.getCurrentPlayer();
    if (player) {
      if (this.elements.playerEnergy) {
        this.elements.playerEnergy.textContent = `Energy: ${player.energy}`;
      }

      if (this.elements.playerActions) {
        this.elements.playerActions.textContent = `Actions: ${player.actionsRemaining}`;
      }

      if (this.elements.playerUnits) {
        this.elements.playerUnits.textContent = `Units: ${player.unitsOwned.size}`;
      }

      // Update optional resource display
      if (this.elements.playerResources) {
        this.elements.playerResources.textContent = player.resources || 0;
      }

      // Update optional territory control
      if (this.elements.territoryControl && this.elements.territoryBar) {
        const territoryPercent = this.calculateTerritoryControl(player.id);
        this.elements.territoryControl.textContent = `${territoryPercent}%`;
        this.elements.territoryBar.style.width = `${territoryPercent}%`;
      }
    }
  }

  updateUnitInfo(selectedUnit = null) {
    if (this.elements.selectedUnit) {
      if (selectedUnit) {
        const stats = selectedUnit.getStats();
        this.elements.selectedUnit.innerHTML = `
                    <strong>${stats.name}</strong><br>
                    Health: ${selectedUnit.health}/${selectedUnit.maxHealth}<br>
                    Actions: ${selectedUnit.actionsUsed}/${selectedUnit.maxActions}
                `;
      } else {
        this.elements.selectedUnit.innerHTML = 'No unit selected';
      }
    }
  }

  updateControlButtons(selectedUnit = null, resourceManager = null) {
    // Update gather button state
    if (this.elements.gatherBtn) {
      const canGather = selectedUnit &&
                       selectedUnit.type === 'worker' &&
                       this.gameState.currentPhase === 'resource' &&
                       selectedUnit.canAct() &&
                       resourceManager &&
                       resourceManager.canGatherAtPosition(selectedUnit.id);

      this.elements.gatherBtn.disabled = !canGather;

      if (canGather) {
        this.elements.gatherBtn.textContent = 'Gather Resources (G)';
      } else if (!selectedUnit) {
        this.elements.gatherBtn.textContent = 'Select Worker';
      } else if (selectedUnit.type !== 'worker') {
        this.elements.gatherBtn.textContent = 'Worker Only';
      } else if (this.gameState.currentPhase !== 'resource') {
        this.elements.gatherBtn.textContent = 'Resource Phase Only';
      } else if (!selectedUnit.canAct()) {
        this.elements.gatherBtn.textContent = 'No Actions Left';
      } else {
        this.elements.gatherBtn.textContent = 'No Resources Nearby';
      }
    }
  }

  updateStatus(message) {
    if (this.elements.gameStatus) {
      this.elements.gameStatus.textContent = message;
    }
  }

  // Game state queries
  isGameEnded() {
    return this.gameState && this.gameState.status === 'ended';
  }

  getCurrentPlayer() {
    return this.gameState ? this.gameState.getCurrentPlayer() : null;
  }

  getCurrentPhase() {
    return this.gameState ? this.gameState.currentPhase : null;
  }

  // Utility methods
  calculateTerritoryControl(playerId) {
    if (!this.gameState) return 0;
    
    // Calculate based on units and bases owned
    const playerUnits = Array.from(this.gameState.units.values())
      .filter(unit => unit.playerId === playerId).length;
    const playerBases = Array.from(this.gameState.bases.values())
      .filter(base => base.playerId === playerId && !base.isDestroyed).length;
    
    const totalUnits = this.gameState.units.size;
    const totalBases = Array.from(this.gameState.bases.values())
      .filter(base => !base.isDestroyed).length;
    
    if (totalUnits + totalBases === 0) return 0;
    
    return Math.round(((playerUnits + playerBases * 2) / (totalUnits + totalBases * 2)) * 100);
  }

  showMessage(message, type = 'info') {
    // Create a temporary message display
    const messageDiv = document.createElement('div');
    messageDiv.className = `ui-message ui-message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 16px;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
          }
        }, 300);
      }
    }, 3000);
  }

  // Button state management
  enableButton(buttonName) {
    const button = this.elements[buttonName];
    if (button) {
      button.disabled = false;
      button.classList.remove('disabled');
    }
  }

  disableButton(buttonName) {
    const button = this.elements[buttonName];
    if (button) {
      button.disabled = true;
      button.classList.add('disabled');
    }
  }

  setButtonText(buttonName, text) {
    const button = this.elements[buttonName];
    if (button) {
      button.textContent = text;
    }
  }

  // Cleanup method
  destroy() {
    // Remove event listeners
    if (this.gameState) {
      this.gameState.removeAllListeners('gameStarted');
      this.gameState.removeAllListeners('turnStarted');
      this.gameState.removeAllListeners('turnEnded');
      this.gameState.removeAllListeners('phaseChanged');
      this.gameState.removeAllListeners('unitSelected');
      this.gameState.removeAllListeners('unitDeselected');
      this.gameState.removeAllListeners('unitMoved');
      this.gameState.removeAllListeners('resourcesGathered');
    }
    
    // Clear element cache
    this.elements = {};
  }
}