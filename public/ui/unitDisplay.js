class UnitDisplay {
  constructor(gameState) {
    this.gameState = gameState;
    this.element = null;
    this.unitCosts = {
      worker: 10,
      scout: 15,
      infantry: 25,
      heavy: 50
    };
    this.unitIcons = {
      worker: '♦',
      scout: '♙',
      infantry: '♗',
      heavy: '♖'
    };
    this.selectedUnit = null;
    this.init();
  }

  init() {
    this.createElement();
    this.setupEventListeners();
    this.update();
  }

  createElement() {
    const container = document.createElement('div');
    container.className = 'unit-display';
    container.innerHTML = `
            <div class="unit-panel">
                <h3>Unit Information</h3>
                
                <div class="unit-counts">
                    <div class="player-units" data-player="1">
                        <h4 class="player-header">Player 1 Units</h4>
                        <div class="unit-type-counts">
                            <div class="unit-type" data-type="worker">
                                <span class="unit-icon">♦</span>
                                <span class="unit-name">Workers</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(10 ⚡)</span>
                            </div>
                            <div class="unit-type" data-type="scout">
                                <span class="unit-icon">♙</span>
                                <span class="unit-name">Scouts</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(15 ⚡)</span>
                            </div>
                            <div class="unit-type" data-type="infantry">
                                <span class="unit-icon">♗</span>
                                <span class="unit-name">Infantry</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(25 ⚡)</span>
                            </div>
                            <div class="unit-type" data-type="heavy">
                                <span class="unit-icon">♖</span>
                                <span class="unit-name">Heavy</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(50 ⚡)</span>
                            </div>
                        </div>
                        <div class="health-summary">
                            <div class="health-indicator">
                                <span class="health-label">Total Health:</span>
                                <span class="health-value">0/0</span>
                            </div>
                        </div>
                    </div>

                    <div class="player-units" data-player="2">
                        <h4 class="player-header">Player 2 Units</h4>
                        <div class="unit-type-counts">
                            <div class="unit-type" data-type="worker">
                                <span class="unit-icon">♦</span>
                                <span class="unit-name">Workers</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(10 ⚡)</span>
                            </div>
                            <div class="unit-type" data-type="scout">
                                <span class="unit-icon">♙</span>
                                <span class="unit-name">Scouts</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(15 ⚡)</span>
                            </div>
                            <div class="unit-type" data-type="infantry">
                                <span class="unit-icon">♗</span>
                                <span class="unit-name">Infantry</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(25 ⚡)</span>
                            </div>
                            <div class="unit-type" data-type="heavy">
                                <span class="unit-icon">♖</span>
                                <span class="unit-name">Heavy</span>
                                <span class="unit-count">0</span>
                                <span class="unit-cost">(50 ⚡)</span>
                            </div>
                        </div>
                        <div class="health-summary">
                            <div class="health-indicator">
                                <span class="health-label">Total Health:</span>
                                <span class="health-value">0/0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="selected-unit-details">
                    <h4>Selected Unit</h4>
                    <div class="unit-details-content">
                        <div class="no-selection">No unit selected</div>
                        <div class="unit-info" style="display: none;">
                            <div class="unit-identity">
                                <span class="selected-unit-icon">♦</span>
                                <span class="selected-unit-type">Worker</span>
                                <span class="selected-unit-id">#1</span>
                            </div>
                            <div class="unit-stats">
                                <div class="stat-row">
                                    <span class="stat-label">Health:</span>
                                    <div class="health-bar">
                                        <div class="health-fill"></div>
                                        <span class="health-text">50/50</span>
                                    </div>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Actions:</span>
                                    <span class="actions-remaining">2/2</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Position:</span>
                                    <span class="unit-position">(5, 5)</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Abilities:</span>
                                    <div class="unit-abilities">
                                        <span class="ability">gather</span>
                                        <span class="ability">build</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="unit-reference">
                    <h4>Unit Reference</h4>
                    <div class="reference-table">
                        <div class="reference-header">
                            <span>Type</span>
                            <span>Cost</span>
                            <span>Health</span>
                            <span>Attack</span>
                            <span>Move</span>
                        </div>
                        <div class="reference-row">
                            <span>♦ Worker</span>
                            <span>10 ⚡</span>
                            <span>50 HP</span>
                            <span>5 ATK</span>
                            <span>2 MOV</span>
                        </div>
                        <div class="reference-row">
                            <span>♙ Scout</span>
                            <span>15 ⚡</span>
                            <span>30 HP</span>
                            <span>10 ATK</span>
                            <span>4 MOV</span>
                        </div>
                        <div class="reference-row">
                            <span>♗ Infantry</span>
                            <span>25 ⚡</span>
                            <span>100 HP</span>
                            <span>20 ATK</span>
                            <span>2 MOV</span>
                        </div>
                        <div class="reference-row">
                            <span>♖ Heavy</span>
                            <span>50 ⚡</span>
                            <span>200 HP</span>
                            <span>40 ATK</span>
                            <span>1 MOV</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.element = container;
    this.cacheElements();
  }

  cacheElements() {
    this.playerUnitsElements = new Map();
    this.playerUnitsElements.set(1, this.element.querySelector('[data-player="1"]'));
    this.playerUnitsElements.set(2, this.element.querySelector('[data-player="2"]'));

    this.noSelection = this.element.querySelector('.no-selection');
    this.unitInfo = this.element.querySelector('.unit-info');
    this.selectedUnitIcon = this.element.querySelector('.selected-unit-icon');
    this.selectedUnitType = this.element.querySelector('.selected-unit-type');
    this.selectedUnitId = this.element.querySelector('.selected-unit-id');
    this.healthFill = this.element.querySelector('.health-fill');
    this.healthText = this.element.querySelector('.health-text');
    this.actionsRemaining = this.element.querySelector('.actions-remaining');
    this.unitPosition = this.element.querySelector('.unit-position');
    this.unitAbilities = this.element.querySelector('.unit-abilities');
  }

  setupEventListeners() {
    this.gameState.on('unitCreated', () => this.update());
    this.gameState.on('unitRemoved', () => this.update());
    this.gameState.on('unitSelected', (unit) => this.handleUnitSelected(unit));
    this.gameState.on('unitDeselected', () => this.handleUnitDeselected());
    this.gameState.on('unitMoved', () => this.updateSelectedUnit());
    this.gameState.on('unitDamaged', () => this.update());
    this.gameState.on('gameStarted', () => this.update());
    this.gameState.on('turnStarted', () => this.update());
  }

  handleUnitSelected(unit) {
    this.selectedUnit = unit;
    this.updateSelectedUnit();
  }

  handleUnitDeselected() {
    this.selectedUnit = null;
    this.showNoSelection();
  }

  updateSelectedUnit() {
    if (!this.selectedUnit) {
      this.showNoSelection();
      return;
    }

    this.showUnitInfo();

    const unit = this.selectedUnit;
    this.selectedUnitIcon.textContent = this.unitIcons[unit.type] || '?';
    this.selectedUnitType.textContent = this.capitalizeFirst(unit.type);
    this.selectedUnitId.textContent = `#${unit.id}`;

    const healthPercent = (unit.health / unit.maxHealth) * 100;
    this.healthFill.style.width = `${healthPercent}%`;
    this.healthText.textContent = `${unit.health}/${unit.maxHealth}`;

    if (healthPercent > 60) {
      this.healthFill.className = 'health-fill health-good';
    } else if (healthPercent > 30) {
      this.healthFill.className = 'health-fill health-medium';
    } else {
      this.healthFill.className = 'health-fill health-low';
    }

    const actionsUsed = unit.actionsUsed || 0;
    const maxActions = unit.maxActions || 2;
    const remaining = maxActions - actionsUsed;
    this.actionsRemaining.textContent = `${remaining}/${maxActions}`;

    this.unitPosition.textContent = `(${unit.position.x}, ${unit.position.y})`;

    this.unitAbilities.innerHTML = '';
    if (unit.abilities && Array.isArray(unit.abilities)) {
      unit.abilities.forEach(ability => {
        const abilitySpan = document.createElement('span');
        abilitySpan.className = 'ability';
        abilitySpan.textContent = ability;
        this.unitAbilities.appendChild(abilitySpan);
      });
    }
  }

  showNoSelection() {
    this.noSelection.style.display = 'block';
    this.unitInfo.style.display = 'none';
  }

  showUnitInfo() {
    this.noSelection.style.display = 'none';
    this.unitInfo.style.display = 'block';
  }

  update() {
    if (!this.gameState || !this.gameState.players) return;

    for (const [playerId, player] of this.gameState.players) {
      this.updatePlayerUnitCounts(playerId);
    }

    if (this.selectedUnit) {
      const currentUnit = this.gameState.units.get(this.selectedUnit.id);
      if (currentUnit) {
        this.selectedUnit = currentUnit;
        this.updateSelectedUnit();
      } else {
        this.handleUnitDeselected();
      }
    }
  }

  updatePlayerUnitCounts(playerId) {
    const playerElement = this.playerUnitsElements.get(playerId);
    if (!playerElement) return;

    const playerUnits = this.gameState.getPlayerUnits(playerId);
    const unitTypeCount = this.countUnitsByType(playerUnits);
    const healthSummary = this.calculateHealthSummary(playerUnits);

    ['worker', 'scout', 'infantry', 'heavy'].forEach(unitType => {
      const unitTypeElement = playerElement.querySelector(`[data-type="${unitType}"]`);
      if (unitTypeElement) {
        const countElement = unitTypeElement.querySelector('.unit-count');
        countElement.textContent = unitTypeCount[unitType] || 0;

        if (unitTypeCount[unitType] > 0) {
          unitTypeElement.classList.add('has-units');
        } else {
          unitTypeElement.classList.remove('has-units');
        }
      }
    });

    const healthElement = playerElement.querySelector('.health-value');
    if (healthElement) {
      healthElement.textContent = `${healthSummary.current}/${healthSummary.max}`;
    }
  }

  countUnitsByType(units) {
    const counts = {
      worker: 0,
      scout: 0,
      infantry: 0,
      heavy: 0
    };

    units.forEach(unit => {
      if (counts.hasOwnProperty(unit.type)) {
        counts[unit.type]++;
      }
    });

    return counts;
  }

  calculateHealthSummary(units) {
    let currentHealth = 0;
    let maxHealth = 0;

    units.forEach(unit => {
      currentHealth += unit.health || 0;
      maxHealth += unit.maxHealth || 0;
    });

    return { current: currentHealth, max: maxHealth };
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    this.gameState.off('unitCreated', this.update);
    this.gameState.off('unitRemoved', this.update);
    this.gameState.off('unitSelected', this.handleUnitSelected);
    this.gameState.off('unitDeselected', this.handleUnitDeselected);
    this.gameState.off('unitMoved', this.updateSelectedUnit);
    this.gameState.off('unitDamaged', this.update);
    this.gameState.off('gameStarted', this.update);
    this.gameState.off('turnStarted', this.update);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnitDisplay;
}

export { UnitDisplay };
