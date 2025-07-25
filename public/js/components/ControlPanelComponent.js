/**
 * ControlPanelComponent - Handles game control button interactions
 * Extracts control button logic from HTML into a proper component
 */

import { UIComponent } from './UIComponent.js';

export class ControlPanelComponent extends UIComponent {
  constructor(container, gameInstance, options = {}) {
    super(container, options);
    this.gameInstance = gameInstance;
    this.controlButtons = new Map();
    this.buttonConfigs = [
      { id: 'newGameBtn', action: 'newGame', isAsync: true },
      { id: 'nextPhaseBtn', action: 'nextPhase', isAsync: false },
      { id: 'gatherBtn', action: 'gatherResources', isAsync: false },
      { id: 'saveGameBtn', action: 'saveGame', isAsync: false },
      { id: 'resetBtn', action: 'resetGame', isAsync: false },
      { id: 'surrenderBtn', action: 'surrender', isAsync: false }
    ];
  }

  /**
   * Create the component's DOM structure
   */
  async onCreate() {
    // Container can be document body or a specific element
    if (typeof this.container === 'string') {
      this.element = await this.waitForElement(this.container);
    } else {
      this.element = this.container || document.body;
    }
  }

  /**
   * Mount the component and set up button listeners
   */
  async onMount() {
    this.setupControlButtons();
    this.setupGameInstanceWatcher();
    this.emit('mounted');
    console.log(`✅ ControlPanelComponent: Set up ${this.controlButtons.size} control buttons`);
  }

  /**
   * Set up event listeners for all control buttons
   */
  setupControlButtons() {
    this.buttonConfigs.forEach(config => {
      const button = document.getElementById(config.id);
      if (button) {
        this.setupButtonListener(button, config);
        this.controlButtons.set(config.id, {
          element: button,
          config: config,
          isEnabled: true
        });
      } else {
        console.warn(`ControlPanelComponent: Button ${config.id} not found`);
      }
    });
  }

  /**
   * Set up individual button listener
   */
  setupButtonListener(button, config) {
    const handler = config.isAsync ? 
      async () => await this.handleAsyncButtonClick(config) :
      () => this.handleButtonClick(config);

    this.addEventListener(button, 'click', handler);

    // Add visual feedback
    this.addEventListener(button, 'mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });

    this.addEventListener(button, 'mouseup', () => {
      button.style.transform = '';
    });

    this.addEventListener(button, 'mouseleave', () => {
      button.style.transform = '';
    });
  }

  /**
   * Handle synchronous button clicks
   */
  handleButtonClick(config) {
    if (!this.isButtonActionAvailable(config)) {
      console.warn(`ControlPanelComponent: Action ${config.action} not available`);
      this.showButtonFeedback(config.id, 'unavailable');
      return;
    }

    try {
      this.showButtonFeedback(config.id, 'active');
      
      // Execute the action
      const result = this.gameInstance[config.action]();
      
      this.emit('buttonClicked', {
        buttonId: config.id,
        action: config.action,
        result: result,
        timestamp: Date.now()
      });

      this.showButtonFeedback(config.id, 'success');
      console.log(`🎯 Executed ${config.action}`);
      
    } catch (error) {
      console.error(`Error executing ${config.action}:`, error);
      this.showButtonFeedback(config.id, 'error');
      this.emit('buttonError', {
        buttonId: config.id,
        action: config.action,
        error: error.message
      });
    }
  }

  /**
   * Handle asynchronous button clicks
   */
  async handleAsyncButtonClick(config) {
    if (!this.isButtonActionAvailable(config)) {
      console.warn(`ControlPanelComponent: Action ${config.action} not available`);
      this.showButtonFeedback(config.id, 'unavailable');
      return;
    }

    try {
      this.showButtonFeedback(config.id, 'loading');
      
      // Execute the async action
      const result = await this.gameInstance[config.action]();
      
      this.emit('buttonClicked', {
        buttonId: config.id,
        action: config.action,
        result: result,
        timestamp: Date.now()
      });

      this.showButtonFeedback(config.id, 'success');
      console.log(`🎯 Executed async ${config.action}`);
      
    } catch (error) {
      console.error(`Error executing async ${config.action}:`, error);
      this.showButtonFeedback(config.id, 'error');
      this.emit('buttonError', {
        buttonId: config.id,
        action: config.action,
        error: error.message
      });
    }
  }

  /**
   * Check if button action is available
   */
  isButtonActionAvailable(config) {
    return this.gameInstance && 
           typeof this.gameInstance[config.action] === 'function';
  }

  /**
   * Show visual feedback for button interactions
   */
  showButtonFeedback(buttonId, state) {
    const buttonInfo = this.controlButtons.get(buttonId);
    if (!buttonInfo) return;

    const button = buttonInfo.element;
    
    // Remove existing state classes
    button.classList.remove('btn-active', 'btn-loading', 'btn-success', 'btn-error', 'btn-unavailable');
    
    // Add appropriate state class
    switch (state) {
      case 'active':
        button.classList.add('btn-active');
        break;
      case 'loading':
        button.classList.add('btn-loading');
        button.disabled = true;
        break;
      case 'success':
        button.classList.add('btn-success');
        button.disabled = false;
        setTimeout(() => button.classList.remove('btn-success'), 1000);
        break;
      case 'error':
        button.classList.add('btn-error');
        button.disabled = false;
        setTimeout(() => button.classList.remove('btn-error'), 2000);
        break;
      case 'unavailable':
        button.classList.add('btn-unavailable');
        setTimeout(() => button.classList.remove('btn-unavailable'), 1000);
        break;
      default:
        button.disabled = false;
    }
  }

  /**
   * Set up watcher for game instance availability
   */
  setupGameInstanceWatcher() {
    // Game instance is now provided via constructor - no polling needed
    if (this.gameInstance) {
      console.log('✅ ControlPanelComponent: Game instance already available');
      this.updateButtonStates();
      this.emit('gameInstanceConnected', { gameInstance: this.gameInstance });
    } else {
      console.warn('ControlPanelComponent: Game instance not provided via constructor');
      this.disableAllButtons();
    }
  }

  /**
   * Update all button states based on game instance availability
   */
  updateButtonStates() {
    this.controlButtons.forEach((buttonInfo, buttonId) => {
      const isAvailable = this.isButtonActionAvailable(buttonInfo.config);
      buttonInfo.element.disabled = !isAvailable;
      buttonInfo.isEnabled = isAvailable;
      
      if (isAvailable) {
        buttonInfo.element.classList.remove('btn-disabled');
      } else {
        buttonInfo.element.classList.add('btn-disabled');
      }
    });
  }

  /**
   * Disable all buttons
   */
  disableAllButtons() {
    this.controlButtons.forEach((buttonInfo) => {
      buttonInfo.element.disabled = true;
      buttonInfo.isEnabled = false;
      buttonInfo.element.classList.add('btn-disabled');
    });
  }

  /**
   * Enable all buttons
   */
  enableAllButtons() {
    this.controlButtons.forEach((buttonInfo) => {
      const isAvailable = this.isButtonActionAvailable(buttonInfo.config);
      buttonInfo.element.disabled = !isAvailable;
      buttonInfo.isEnabled = isAvailable;
      
      if (isAvailable) {
        buttonInfo.element.classList.remove('btn-disabled');
      }
    });
  }

  /**
   * Manually set the game instance
   */
  setGameInstance(gameInstance) {
    this.gameInstance = gameInstance;
    this.updateButtonStates();
    this.emit('gameInstanceSet', { gameInstance });
    console.log('✅ ControlPanelComponent: Game instance manually set');
  }

  /**
   * Get button information
   */
  getButtonInfo(buttonId) {
    return this.controlButtons.get(buttonId);
  }

  /**
   * Get all buttons information
   */
  getAllButtons() {
    return Array.from(this.controlButtons.entries()).map(([id, info]) => ({
      id,
      element: info.element,
      config: info.config,
      isEnabled: info.isEnabled,
      isVisible: info.element.style.display !== 'none'
    }));
  }

  /**
   * Programmatically trigger a button click
   */
  triggerButton(buttonId) {
    const buttonInfo = this.controlButtons.get(buttonId);
    if (buttonInfo && buttonInfo.isEnabled) {
      buttonInfo.element.click();
      return true;
    }
    return false;
  }

  /**
   * Update component state
   */
  update(data) {
    super.update(data);
    
    if (data && data.gameInstance) {
      this.setGameInstance(data.gameInstance);
    }
    
    if (data && data.refreshButtonStates) {
      this.updateButtonStates();
    }
  }

  /**
   * Component cleanup
   */
  onDestroy() {
    this.controlButtons.clear();
    this.gameInstance = null;
  }
}