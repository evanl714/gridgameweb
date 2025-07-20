class UnitInfoSidebar {
  constructor(gameState) {
    this.gameState = gameState;
    this.element = document.getElementById('unitInfoSidebar');
    this.selectedUnit = null;
    
    this.initialize();
  }

  initialize() {
    this.renderEmptyState();
    this.setupEventListeners();
  }

  renderEmptyState() {
    if (!this.element) return;
    
    this.element.innerHTML = `
      <div class="unit-details">
        <div class="info-item">
          <div class="info-label">Selected Unit</div>
          <div class="info-value">None</div>
        </div>
        <div style="text-align: center; color: var(--text-muted); margin-top: var(--spacing-lg);">
          Click on a unit to view details
        </div>
      </div>
    `;
  }

  renderUnitDetails(unit) {
    if (!this.element || !unit) return;
    
    const unitType = unit.type || 'unknown';
    const unitIcon = this.getUnitIcon(unitType);
    const playerColor = unit.player === 1 ? 'var(--player-1-color)' : 'var(--player-2-color)';
    
    this.element.innerHTML = `
      <div class="unit-details">
        <div class="unit-header">
          <div class="unit-icon-large" style="color: ${playerColor};">${unitIcon}</div>
          <div>
            <div class="unit-name-large">${this.capitalizeFirst(unitType)}</div>
            <div style="color: var(--text-muted); font-size: var(--font-size-sm);">
              Player ${unit.player}
            </div>
          </div>
        </div>
        
        <div class="unit-stats-grid">
          <div class="unit-stat-item">
            <div class="unit-stat-label">Health</div>
            <div class="unit-stat-value" style="color: ${unit.health > unit.maxHealth * 0.6 ? 'var(--accent-success)' : unit.health > unit.maxHealth * 0.3 ? 'var(--accent-warning)' : 'var(--accent-danger)'};">
              ${unit.health}/${unit.maxHealth}
            </div>
          </div>
          
          <div class="unit-stat-item">
            <div class="unit-stat-label">Attack</div>
            <div class="unit-stat-value">${unit.attack || 0}</div>
          </div>
          
          <div class="unit-stat-item">
            <div class="unit-stat-label">Movement</div>
            <div class="unit-stat-value">${unit.movement || 0}</div>
          </div>
          
          <div class="unit-stat-item">
            <div class="unit-stat-label">Actions</div>
            <div class="unit-stat-value" style="color: ${unit.actionsUsed > 0 ? 'var(--accent-warning)' : 'var(--text-primary)'};">
              ${unit.actionsUsed || 0}
            </div>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">Position</div>
          <div class="info-value">(${unit.x}, ${unit.y})</div>
        </div>
        
        ${unit.abilities && unit.abilities.length > 0 ? `
          <div class="unit-abilities">
            <div class="unit-abilities-title">Abilities</div>
            <div class="unit-ability-list">
              ${unit.abilities.map(ability => `
                <span class="unit-ability-tag">${this.capitalizeFirst(ability.replace('_', ' '))}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${this.getUnitActions(unit)}
      </div>
    `;
  }

  getUnitIcon(unitType) {
    const iconMap = {
      'worker': '♦',
      'scout': '♙', 
      'infantry': '♗',
      'heavy': '♖',
      'base': '⬛'
    };
    return iconMap[unitType] || '?';
  }

  getUnitActions(unit) {
    if (!unit || unit.actionsUsed >= 1) {
      return `<div style="color: var(--text-muted); font-size: var(--font-size-sm); margin-top: var(--spacing-md);">
        No actions available this turn
      </div>`;
    }
    
    const actions = [];
    
    // Movement action
    if (unit.movement > 0) {
      actions.push('Move');
    }
    
    // Attack action
    if (unit.attack > 0) {
      actions.push('Attack');
    }
    
    // Special abilities
    if (unit.abilities) {
      if (unit.abilities.includes('gather')) {
        actions.push('Gather Resources');
      }
      if (unit.abilities.includes('build')) {
        actions.push('Build Units');
      }
    }
    
    if (actions.length === 0) {
      return '';
    }
    
    return `
      <div style="margin-top: var(--spacing-md);">
        <div class="unit-abilities-title">Available Actions</div>
        <div class="unit-ability-list">
          ${actions.map(action => `
            <span class="unit-ability-tag" style="background: rgba(123, 179, 66, 0.2); color: var(--accent-success);">
              ${action}
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Listen for unit selection events
    document.addEventListener('unitSelected', (e) => {
      this.selectedUnit = e.detail.unit;
      this.renderUnitDetails(this.selectedUnit);
    });
    
    // Listen for unit deselection
    document.addEventListener('unitDeselected', () => {
      this.selectedUnit = null;
      this.renderEmptyState();
    });
    
    // Listen for unit updates
    document.addEventListener('unitUpdated', (e) => {
      if (this.selectedUnit && this.selectedUnit.id === e.detail.unit.id) {
        this.selectedUnit = e.detail.unit;
        this.renderUnitDetails(this.selectedUnit);
      }
    });
    
    // Listen for game state changes
    document.addEventListener('gameStateChanged', () => {
      if (this.selectedUnit) {
        // Try to find the updated unit in the game state
        const updatedUnit = this.findUnitInGameState(this.selectedUnit);
        if (updatedUnit) {
          this.selectedUnit = updatedUnit;
          this.renderUnitDetails(this.selectedUnit);
        } else {
          // Unit no longer exists
          this.selectedUnit = null;
          this.renderEmptyState();
        }
      }
    });
  }

  findUnitInGameState(unit) {
    // Try to find the unit by position and player
    const allUnits = this.gameState.getAllUnits();
    return allUnits.find(u => 
      u.x === unit.x && 
      u.y === unit.y && 
      u.player === unit.player &&
      u.type === unit.type
    );
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  update() {
    if (this.selectedUnit) {
      const updatedUnit = this.findUnitInGameState(this.selectedUnit);
      if (updatedUnit) {
        this.selectedUnit = updatedUnit;
        this.renderUnitDetails(this.selectedUnit);
      } else {
        this.selectedUnit = null;
        this.renderEmptyState();
      }
    }
  }

  render() {
    if (this.selectedUnit) {
      this.renderUnitDetails(this.selectedUnit);
    } else {
      this.renderEmptyState();
    }
  }
}

export { UnitInfoSidebar };