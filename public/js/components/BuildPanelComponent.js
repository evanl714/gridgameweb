/**
 * BuildPanelComponent - Handles unit card selection functionality
 * Extracts unit card selection logic from HTML into a proper component
 */

import { UIComponent } from './UIComponent.js';

export class BuildPanelComponent extends UIComponent {
  constructor(container, gameState, options = {}) {
    super(container, options);
    this.gameState = gameState;
    this.selectedUnitType = null;
    this.unitCards = [];
  }

  /**
   * Create the component's DOM structure
   */
  async onCreate() {
    // Find all unit cards in the container
    if (typeof this.container === 'string') {
      this.element = await this.waitForElement(this.container);
    } else {
      this.element = this.container;
    }

    if (!this.element) {
      throw new Error('BuildPanelComponent: Could not find build panel container');
    }
  }

  /**
   * Mount the component and set up event listeners
   */
  async onMount() {
    this.setupUnitCardListeners();
    this.setupGameStateListeners();
    this.emit('mounted');
  }

  /**
   * Set up event listeners for unit card selection
   */
  setupUnitCardListeners() {
    // Find all unit cards
    this.unitCards = this.querySelectorAll('.unit-card');
    
    if (this.unitCards.length === 0) {
      console.warn('BuildPanelComponent: No unit cards found');
      return;
    }

    // Add click listeners to each unit card
    this.unitCards.forEach(card => {
      this.addEventListener(card, 'click', this.handleUnitCardClick);
    });

    console.log(`✅ BuildPanelComponent: Set up listeners for ${this.unitCards.length} unit cards`);
  }

  /**
   * Handle unit card click events
   */
  handleUnitCardClick(event) {
    const card = event.currentTarget;
    const unitType = card.dataset.unitType;

    if (!unitType) {
      console.warn('BuildPanelComponent: Unit card missing data-unit-type attribute');
      return;
    }

    // Clear previous selection
    this.clearSelection();

    // Highlight selected card
    this.selectCard(card, unitType);

    // Store selected unit type
    this.selectedUnitType = unitType;

    // Store globally for backward compatibility
    if (window) {
      window.selectedUnitType = unitType;
    }

    // Emit selection event
    this.emit('unitSelected', {
      unitType: unitType,
      card: card,
      timestamp: Date.now()
    });

    console.log(`🎯 Unit selected: ${unitType}`);
  }

  /**
   * Clear all unit card selections
   */
  clearSelection() {
    this.unitCards.forEach(card => {
      card.style.background = '';
      card.style.color = '';
      card.classList.remove('selected');
    });
    
    this.selectedUnitType = null;
    
    // Clear global reference
    if (window) {
      window.selectedUnitType = null;
    }

    this.emit('selectionCleared');
  }

  /**
   * Select a specific unit card
   */
  selectCard(card, unitType) {
    // Add visual selection styling
    card.style.background = 'var(--accent)';
    card.style.color = 'var(--accent-foreground)';
    card.classList.add('selected');

    // Update component state
    this.selectedUnitType = unitType;
    
    this.emit('cardSelected', { card, unitType });
  }

  /**
   * Get currently selected unit type
   */
  getSelectedUnitType() {
    return this.selectedUnitType;
  }

  /**
   * Programmatically select a unit type
   */
  selectUnitType(unitType) {
    const card = this.querySelector(`.unit-card[data-unit-type="${unitType}"]`);
    if (card) {
      this.clearSelection();
      this.selectCard(card, unitType);
      return true;
    }
    return false;
  }

  /**
   * Set up game state listeners for dynamic updates
   */
  setupGameStateListeners() {
    if (this.gameState && typeof this.gameState.on === 'function') {
      // Listen for game state changes that might affect unit availability
      this.gameState.on('energyChanged', () => this.updateUnitAvailability());
      this.gameState.on('playerChanged', () => this.updateUnitAvailability());
      this.gameState.on('turnStarted', () => this.updateUnitAvailability());
    }

    // Listen for DOM events for backward compatibility
    this.addEventListener(document, 'gameStateChanged', () => this.updateUnitAvailability());
    this.addEventListener(document, 'energyChanged', () => this.updateUnitAvailability());
  }

  /**
   * Update unit card availability based on game state
   */
  updateUnitAvailability() {
    if (!this.gameState) return;

    try {
      const currentPlayer = this.gameState.getCurrentPlayer();
      const playerEnergy = currentPlayer ? currentPlayer.energy : 0;

      this.unitCards.forEach(card => {
        const cost = parseInt(card.dataset.cost) || 0;
        const isAffordable = playerEnergy >= cost;
        
        // Update visual state
        card.classList.toggle('insufficient-energy', !isAffordable);
        card.style.opacity = isAffordable ? '1' : '0.6';
        
        // Update accessibility
        card.setAttribute('aria-disabled', !isAffordable);
        
        if (!isAffordable) {
          card.title = `Insufficient energy (${cost} required, ${playerEnergy} available)`;
        } else {
          card.title = '';
        }
      });

      this.emit('availabilityUpdated', { playerEnergy });
    } catch (error) {
      console.error('Error updating unit availability:', error);
    }
  }

  /**
   * Get all unit card information
   */
  getUnitCards() {
    return Array.from(this.unitCards).map(card => ({
      element: card,
      unitType: card.dataset.unitType,
      cost: parseInt(card.dataset.cost) || 0,
      isSelected: card.classList.contains('selected'),
      isAffordable: !card.classList.contains('insufficient-energy')
    }));
  }

  /**
   * Update component state
   */
  update(data) {
    super.update(data);
    
    if (data && data.refreshAvailability) {
      this.updateUnitAvailability();
    }
    
    if (data && data.clearSelection) {
      this.clearSelection();
    }
  }

  /**
   * Component cleanup
   */
  onDestroy() {
    this.clearSelection();
  }
}