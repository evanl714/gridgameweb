/**
 * UI Component Lazy Loading Registry
 * Registers all UI components for lazy loading with appropriate priorities and contexts
 */

import { lazyLoader } from './LazyLoader.js';

/**
 * Register all UI components for lazy loading
 */
export function registerUIComponents() {
  // Core UI components (high priority, preload)
  lazyLoader.register('UIManager', () => import('../../ui/uiManager.js'), {
    priority: 10,
    critical: true,
    preload: true
  });

  lazyLoader.register('GameStatus', () => import('../../ui/gameStatus.js'), {
    priority: 9,
    critical: true,
    preload: true
  });

  lazyLoader.register('ResourceDisplay', () => import('../../ui/resourceDisplay.js'), {
    priority: 9,
    critical: true,
    preload: true
  });

  // Interaction UI components (medium priority)
  lazyLoader.register('TurnInterface', () => import('../../ui/turnInterface.js'), {
    priority: 8,
    preload: true
  });

  lazyLoader.register('UnitDisplay', () => import('../../ui/unitDisplay.js'), {
    priority: 7,
    preload: true
  });

  // Context-specific UI components (load on demand)
  lazyLoader.register('VictoryScreen', () => import('../../ui/victoryScreen.js'), {
    priority: 3,
    critical: false
  });

  lazyLoader.register('BuildPanelSidebar', () => import('../../ui/buildPanelSidebar.js'), {
    priority: 5,
    critical: false
  });

  lazyLoader.register('UnitInfoSidebar', () => import('../../ui/unitInfoSidebar.js'), {
    priority: 4,
    critical: false
  });

  lazyLoader.register('TurnTransition', () => import('../../ui/turnTransition.js'), {
    priority: 6,
    critical: false
  });

  // Game components
  lazyLoader.register('GridGeneratorComponent', () => import('../components/GridGeneratorComponent.js'), {
    priority: 8,
    preload: true
  });

  lazyLoader.register('GameBoardComponent', () => import('../components/GameBoardComponent.js'), {
    priority: 8,
    preload: true
  });

  lazyLoader.register('BuildPanelComponent', () => import('../components/BuildPanelComponent.js'), {
    priority: 5,
    critical: false
  });

  lazyLoader.register('ControlPanelComponent', () => import('../components/ControlPanelComponent.js'), {
    priority: 7,
    preload: true
  });

  // Rendering components
  lazyLoader.register('GameRenderer', () => import('../rendering/GameRenderer.js'), {
    priority: 9,
    preload: true
  });

  // Controllers
  lazyLoader.register('InputController', () => import('../controllers/InputController.js'), {
    priority: 9,
    preload: true
  });

  // Managers
  lazyLoader.register('UIStateManager', () => import('../managers/UIStateManager.js'), {
    priority: 8,
    preload: true
  });

  console.log('UI components registered for lazy loading');
}

/**
 * Load UI components for specific game contexts
 */
export class UIContextLoader {
  /**
   * Load components needed for game initialization
   */
  static async loadInitializationComponents() {
    const components = await lazyLoader.loadForContext('game-start', [
      'UIManager',
      'GameStatus', 
      'ResourceDisplay',
      'TurnInterface',
      'GameRenderer',
      'InputController',
      'UIStateManager'
    ]);

    return components;
  }

  /**
   * Load components needed for building phase
   */
  static async loadBuildingComponents() {
    const components = await lazyLoader.loadForContext('building', [
      'BuildPanelSidebar',
      'BuildPanelComponent'
    ]);

    return components;
  }

  /**
   * Load components needed for unit interactions
   */
  static async loadUnitComponents() {
    const components = await lazyLoader.loadForContext('combat', [
      'UnitDisplay',
      'UnitInfoSidebar'
    ]);

    return components;
  }

  /**
   * Load components needed for game victory
   */
  static async loadVictoryComponents() {
    const components = await lazyLoader.loadForContext('victory', [
      'VictoryScreen'
    ]);

    return components;
  }

  /**
   * Preload components based on user interaction patterns
   */
  static async preloadInteractiveComponents() {
    // Preload components likely to be needed soon
    await lazyLoader.preloadModules([
      'BuildPanelSidebar',
      'UnitInfoSidebar',
      'TurnTransition'
    ], { concurrent: 2 });
  }

  /**
   * Get UI loading statistics
   */
  static getUILoadingStats() {
    const stats = lazyLoader.getStatistics();
    const uiComponents = [
      'UIManager', 'GameStatus', 'ResourceDisplay', 'TurnInterface',
      'UnitDisplay', 'VictoryScreen', 'BuildPanelSidebar', 'UnitInfoSidebar',
      'TurnTransition', 'GridGeneratorComponent', 'GameBoardComponent',
      'BuildPanelComponent', 'ControlPanelComponent', 'GameRenderer',
      'InputController', 'UIStateManager'
    ];

    const uiStats = {
      totalUIComponents: uiComponents.length,
      loadedUIComponents: 0,
      cachedUIComponents: 0,
      loadingUIComponents: 0
    };

    uiComponents.forEach(component => {
      if (lazyLoader.isAvailable(component)) {
        uiStats.cachedUIComponents++;
        uiStats.loadedUIComponents++;
      } else if (lazyLoader.isLoading(component)) {
        uiStats.loadingUIComponents++;
      }
    });

    return {
      ...uiStats,
      overallStats: stats
    };
  }
}

/**
 * UI Component Loading Strategies
 */
export const UILoadingStrategies = {
  /**
   * Progressive loading strategy - load components as needed
   */
  progressive: {
    name: 'Progressive Loading',
    description: 'Load UI components progressively based on user interaction',
    
    async execute() {
      // Load critical components first
      await UIContextLoader.loadInitializationComponents();
      
      // Preload interactive components in background
      setTimeout(() => {
        UIContextLoader.preloadInteractiveComponents();
      }, 1000);
    }
  },

  /**
   * Eager loading strategy - load all components upfront
   */
  eager: {
    name: 'Eager Loading',
    description: 'Load all UI components at startup',
    
    async execute() {
      const allComponents = [
        'UIManager', 'GameStatus', 'ResourceDisplay', 'TurnInterface',
        'UnitDisplay', 'VictoryScreen', 'BuildPanelSidebar', 'UnitInfoSidebar',
        'TurnTransition', 'GridGeneratorComponent', 'GameBoardComponent',
        'BuildPanelComponent', 'ControlPanelComponent', 'GameRenderer',
        'InputController', 'UIStateManager'
      ];

      await lazyLoader.preloadModules(allComponents, { concurrent: 4 });
    }
  },

  /**
   * Smart loading strategy - load based on game state and predictions
   */
  smart: {
    name: 'Smart Loading',
    description: 'Load UI components based on game state and user behavior prediction',
    
    async execute(gameState) {
      // Always load critical components
      await UIContextLoader.loadInitializationComponents();

      // Load based on game phase
      if (gameState && gameState.currentPhase === 'building') {
        await UIContextLoader.loadBuildingComponents();
      }

      // Load based on unit selection
      if (gameState && gameState.selectedUnit) {
        await UIContextLoader.loadUnitComponents();
      }

      // Preload victory screen if game is near end
      if (gameState && this.isGameNearEnd(gameState)) {
        await UIContextLoader.loadVictoryComponents();
      }
    },

    isGameNearEnd(gameState) {
      // Simple heuristic - game near end if one player has few units
      const player1Units = gameState.units.filter(u => u.playerId === 1).length;
      const player2Units = gameState.units.filter(u => u.playerId === 2).length;
      
      return Math.min(player1Units, player2Units) <= 2;
    }
  }
};

// Register all UI components when this module is imported
registerUIComponents();