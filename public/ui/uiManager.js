import { ResourceDisplay } from './resourceDisplay.js';
import { TurnInterface } from './turnInterface.js';
import { GameStatus } from './gameStatus.js';
import { UnitDisplay } from './unitDisplay.js';
import { BuildPanelSidebar } from './buildPanelSidebar.js';
import { UnitInfoSidebar } from './unitInfoSidebar.js';
import { TurnTransition } from './turnTransition.js';

class UIManager {
  constructor(gameState, turnManager) {
    this.gameState = gameState;
    this.turnManager = turnManager;
    this.components = new Map();
    this.initialized = false;
    this.containers = new Map();
    this.init();
  }

  init() {
    this.createContainers();
    this.initializeComponents();
    this.setupEventListeners();
    this.initialized = true;
  }

  createContainers() {
    // Use existing HTML structure instead of creating new containers
    this.containers.set('build', document.getElementById('buildPanelSidebar'));
    this.containers.set('unitInfo', document.getElementById('unitInfoSidebar'));
    this.containers.set('status', document.querySelector('.game-status'));

    // Create minimal additional containers if needed
    const gameInfo = document.querySelector('.game-info');
    if (gameInfo) {
      this.containers.set('gameInfo', gameInfo);
    }
  }

  setupToggleHandlers() {
    // Simplified setup - no additional toggle handlers needed for existing layout
  }

  togglePanel(panelName) {
    const container = this.containers.get(panelName);
    if (container) {
      container.classList.toggle('collapsed');
      const toggleBtn = container.querySelector('.panel-toggle-btn .toggle-icon');
      if (toggleBtn) {
        toggleBtn.textContent = container.classList.contains('collapsed') ? '▶' : '▼';
      }
    }
  }

  initializeComponents() {
    // Initialize components for existing sidebar elements
    this.components.set('build', new BuildPanelSidebar(this.gameState, this.turnManager));
    this.components.set('unitInfo', new UnitInfoSidebar(this.gameState));
    this.components.set('status', new GameStatus(this.gameState));
    this.components.set('transition', new TurnTransition(this.gameState));

    this.renderComponents();
  }

  // Getter to access buildPanelSidebar from game.js
  get buildPanelSidebar() {
    return this.components.get('build');
  }

  renderComponents() {
    // Render components to existing containers
    const buildContainer = this.containers.get('build');
    const unitInfoContainer = this.containers.get('unitInfo');
    const statusContainer = this.containers.get('status');

    if (buildContainer && this.components.get('build')) {
      this.components.get('build').render(buildContainer);
    }
    if (unitInfoContainer && this.components.get('unitInfo')) {
      this.components.get('unitInfo').render(unitInfoContainer);
    }
    if (statusContainer && this.components.get('status')) {
      this.components.get('status').render(statusContainer);
    }
  }

  setupEventListeners() {
    this.gameState.on('phaseChanged', () => this.handlePhaseChanged());
    this.gameState.on('gameStarted', () => this.handleGameStarted());
    this.gameState.on('gameEnded', () => this.handleGameEnded());

    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

    // Handle both canvas and grid rendering modes
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    // Grid cells handle their own click events through InputController
  }

  handlePhaseChanged() {
    const currentPhase = this.gameState.currentPhase;

    if (currentPhase === 'build') {
      this.showBuildModeIndicator();
    } else {
      this.hideBuildModeIndicator();
    }
  }

  handleGameStarted() {
    this.showNotification('Game Started! Use WASD to move selected units, Space to build.', 'info');
  }

  handleGameEnded(data) {
    if (data && data.winner) {
      this.showNotification(`🏆 Player ${data.winner} Wins!`, 'success', 5000);
    }
  }

  handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key.toLowerCase()) {
    case ' ':
    case 'b':
      e.preventDefault();
      this.openBuildPanel();
      break;
    case 'escape':
      this.closeBuildPanel();
      break;
    case 'u':
      this.togglePanel('unit');
      break;
    case 'r':
      this.focusResourceDisplay();
      break;
    case 'enter':
      // Ctrl+Enter End Turn handler removed - using centralized turnInterface.js handler only
      break;
    }
  }

  handleCanvasClick(e) {
    if (this.gameState.currentPhase === 'build' && e.ctrlKey) {
      const rect = e.target.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / 32);
      const y = Math.floor((e.clientY - rect.top) / 32);

      if (x >= 0 && x < 25 && y >= 0 && y < 25) {
        this.openBuildPanel({ x, y });
      }
    }
  }

  openBuildPanel(position = null) {
    const buildPanel = this.components.get('build');
    if (buildPanel) {
      buildPanel.show(position);
    }
  }

  closeBuildPanel() {
    const buildPanel = this.components.get('build');
    if (buildPanel) {
      buildPanel.hide();
    }
  }

  showBuildModeIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'buildModeIndicator';
    indicator.className = 'build-mode-indicator';
    indicator.innerHTML = `
            <div class="indicator-content">
                <span class="indicator-icon">🔨</span>
                <span class="indicator-text">Build Mode</span>
                <span class="indicator-hint">Press Space or Ctrl+Click to build</span>
            </div>
        `;

    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.classList.add('show');
    }, 100);
  }

  hideBuildModeIndicator() {
    const indicator = document.getElementById('buildModeIndicator');
    if (indicator) {
      indicator.classList.remove('show');
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  focusResourceDisplay() {
    const resourceContainer = this.containers.get('resource');
    if (resourceContainer) {
      resourceContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      resourceContainer.classList.add('highlight');
      setTimeout(() => {
        resourceContainer.classList.remove('highlight');
      }, 2000);
    }
  }

  // endTurn() method removed - using centralized turnInterface.js handler only

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `ui-notification ${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-text">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

    const container = this.getNotificationContainer();
    container.appendChild(notification);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => this.removeNotification(notification));

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }
  }

  removeNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  getNotificationContainer() {
    let container = document.getElementById('notificationContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notificationContainer';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    return container;
  }

  updateLayout() {
    const isMobile = window.innerWidth <= 768;
    const uiContainer = document.querySelector('.ui-container');

    if (uiContainer) {
      if (isMobile) {
        uiContainer.classList.add('mobile-layout');
      } else {
        uiContainer.classList.remove('mobile-layout');
      }
    }
  }

  getComponent(name) {
    return this.components.get(name);
  }

  isInitialized() {
    return this.initialized;
  }

  destroy() {
    this.components.forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });

    this.components.clear();
    this.containers.clear();

    const notificationContainer = document.getElementById('notificationContainer');
    if (notificationContainer && notificationContainer.parentNode) {
      notificationContainer.parentNode.removeChild(notificationContainer);
    }

    this.gameState.off('phaseChanged', this.handlePhaseChanged);
    this.gameState.off('gameStarted', this.handleGameStarted);
    this.gameState.off('gameEnded', this.handleGameEnded);

    document.removeEventListener('keydown', this.handleKeyboardShortcuts);

    this.initialized = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}

export { UIManager };
