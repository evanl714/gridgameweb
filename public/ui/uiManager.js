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
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) {
      console.error('Game container not found');
      return;
    }

    const uiContainer = document.createElement('div');
    uiContainer.className = 'ui-container';
    uiContainer.innerHTML = `
            <div class="ui-top-section">
                <div class="ui-left-panel">
                    <div id="resourceDisplayContainer" class="ui-component-container"></div>
                    <div id="turnInterfaceContainer" class="ui-component-container"></div>
                </div>
                <div class="ui-right-panel">
                    <div id="gameStatusContainer" class="ui-component-container"></div>
                </div>
            </div>
            <div class="ui-bottom-section">
                <div id="unitDisplayContainer" class="ui-component-container expandable"></div>
            </div>
        `;

    const main = gameContainer.querySelector('main');
    if (main) {
      const gameBoard = main.querySelector('.game-board');
      if (gameBoard) {
        main.insertBefore(uiContainer, gameBoard);
      } else {
        main.appendChild(uiContainer);
      }
    } else {
      gameContainer.appendChild(uiContainer);
    }

    this.containers.set('resource', document.getElementById('resourceDisplayContainer'));
    this.containers.set('turn', document.getElementById('turnInterfaceContainer'));
    this.containers.set('status', document.getElementById('gameStatusContainer'));
    this.containers.set('unit', document.getElementById('unitDisplayContainer'));

    this.setupToggleHandlers();
  }

  setupToggleHandlers() {
    const unitContainer = this.containers.get('unit');
    if (unitContainer) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'panel-toggle-btn';
      toggleBtn.innerHTML = '<span class="toggle-icon">▼</span> Unit Information';
      toggleBtn.addEventListener('click', () => this.togglePanel('unit'));

      unitContainer.appendChild(toggleBtn);
    }
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
    this.components.set('resource', new ResourceDisplay(this.gameState));
    this.components.set('turn', new TurnInterface(this.gameState, this.turnManager));
    this.components.set('status', new GameStatus(this.gameState));
    this.components.set('unit', new UnitDisplay(this.gameState));
    this.components.set('build', new BuildPanelSidebar(this.gameState, this.turnManager));
    this.components.set('unitInfo', new UnitInfoSidebar(this.gameState));
    this.components.set('transition', new TurnTransition(this.gameState));

    this.renderComponents();
  }

  renderComponents() {
    this.components.get('resource').render(this.containers.get('resource'));
    this.components.get('turn').render(this.containers.get('turn'));
    this.components.get('status').render(this.containers.get('status'));
    this.components.get('unit').render(this.containers.get('unit'));
  }

  setupEventListeners() {
    this.gameState.on('phaseChanged', () => this.handlePhaseChanged());
    this.gameState.on('gameStarted', () => this.handleGameStarted());
    this.gameState.on('gameEnded', () => this.handleGameEnded());

    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }
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
      if (e.ctrlKey) {
        this.endTurn();
      }
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

  endTurn() {
    const turnInterface = this.components.get('turn');
    if (turnInterface && turnInterface.endTurnBtn) {
      turnInterface.handleEndTurn();
    }
  }

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

    const uiContainer = document.querySelector('.ui-container');
    if (uiContainer && uiContainer.parentNode) {
      uiContainer.parentNode.removeChild(uiContainer);
    }

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
