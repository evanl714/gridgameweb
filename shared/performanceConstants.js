/**
 * Performance Constants - Centralized performance-related configuration
 * Used by performance monitoring, rendering optimizations, and lazy loading systems
 */

export const PERFORMANCE_CONFIG = {
  // Performance Monitoring
  MONITORING: {
    MAX_METRICS_HISTORY: 100,
    FRAME_TIME_WARNING_THRESHOLD: 16.67, // 60 FPS budget in ms
    MEMORY_SNAPSHOT_INTERVAL: 1000, // ms
    AUTO_START_IN_DEVELOPMENT: true,
    PERFORMANCE_OBSERVER_ENABLED: true
  },

  // Dirty Region Tracking
  DIRTY_REGIONS: {
    MAX_DIRTY_REGIONS: 50,
    COALESCING_THRESHOLD: 4, // cells
    FULL_REPAINT_THRESHOLD: 20, // regions
    FORCE_FULL_REPAINT_INTERVAL: 100, // frames
    STATE_HISTORY_LIMIT: 1000 // cells
  },

  // Object Pooling
  OBJECT_POOL: {
    MAX_POOL_SIZE: 100,
    WARM_UP_SIZES: {
      'unit-display': 20,
      'base-display': 10,
      'resource-display': 15,
      'selection-ring': 5,
      'div': 25,
      'button': 10,
      'tooltip': 8
    },
    OPTIMIZATION_THRESHOLD: 0.7, // Keep 70% of max size during optimization
    AUTO_CLEANUP_INTERVAL: 30000 // ms (30 seconds)
  },

  // Lazy Loading
  LAZY_LOADING: {
    DEFAULT_TIMEOUT: 10000, // ms
    CONCURRENT_LOADS: 4,
    CACHE_SIZE_LIMIT: 50, // modules
    PRELOAD_DELAY: 1000, // ms after initialization
    DEPENDENCY_TIMEOUT: 5000, // ms
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // ms
  },

  // Rendering Optimization
  RENDERING: {
    TARGET_FPS: 60,
    LARGE_GRID_THRESHOLD: 30, // Switch to optimized rendering
    CANVAS_LAYER_COUNT: 4,
    VIRTUAL_SCROLL_BUFFER: 5, // cells outside viewport
    DOM_BATCH_SIZE: 100,
    RENDER_DEBOUNCE_MS: 16, // ~60fps
    MAX_RENDER_TIME_MS: 10 // Budget per render
  },

  // Performance Targets
  TARGETS: {
    INITIAL_LOAD_TIME_MS: 2000,
    TIME_TO_INTERACTIVE_MS: 1000,
    MEMORY_USAGE_MB: 50,
    MOVEMENT_CALCULATION_MS: 1,
    COMBAT_CALCULATION_MS: 0.5,
    RESOURCE_CALCULATION_MS: 0.3,
    FRAME_RATE_FPS: 60
  },

  // Development & Debugging
  DEBUG: {
    ENABLE_PERFORMANCE_LOGS: true,
    ENABLE_REGION_VISUALIZATION: false,
    LOG_LAZY_LOADING: true,
    LOG_OBJECT_POOL_STATS: true,
    PERFORMANCE_WARNINGS: true,
    MEMORY_LEAK_DETECTION: true
  },

  // Feature Flags
  FEATURES: {
    DIRTY_REGION_TRACKING: true,
    OBJECT_POOLING: true,
    LAZY_LOADING: true,
    PERFORMANCE_MONITORING: true,
    ADAPTIVE_QUALITY: true,
    PROGRESSIVE_LOADING: true
  }
};

// Performance thresholds for different scenarios
export const PERFORMANCE_THRESHOLDS = {
  // Grid sizes and their recommended settings
  GRID_OPTIMIZATION: {
    SMALL: { size: 15, useDirtyRegions: false, useObjectPool: false },
    MEDIUM: { size: 25, useDirtyRegions: true, useObjectPool: true },
    LARGE: { size: 50, useDirtyRegions: true, useObjectPool: true },
    XLARGE: { size: 100, useDirtyRegions: true, useObjectPool: true }
  },

  // Device performance categories
  DEVICE_CATEGORIES: {
    LOW_END: {
      maxConcurrentLoads: 2,
      reducedAnimations: true,
      simpleRendering: true,
      aggressivePooling: true
    },
    MEDIUM: {
      maxConcurrentLoads: 4,
      reducedAnimations: false,
      simpleRendering: false,
      aggressivePooling: true
    },
    HIGH_END: {
      maxConcurrentLoads: 6,
      reducedAnimations: false,
      simpleRendering: false,
      aggressivePooling: false
    }
  }
};

// Performance budgets for different operations
export const PERFORMANCE_BUDGETS = {
  // Time budgets in milliseconds
  OPERATIONS: {
    MODULE_LOAD: 100,
    COMPONENT_RENDER: 5,
    STATE_UPDATE: 2,
    EVENT_HANDLING: 1,
    ANIMATION_FRAME: 16.67,
    USER_INTERACTION_RESPONSE: 100
  },

  // Memory budgets in bytes/MB
  MEMORY: {
    TOTAL_HEAP_MB: 100,
    COMPONENT_CACHE_MB: 10,
    OBJECT_POOL_MB: 5,
    PERFORMANCE_MONITORING_MB: 2,
    DIRTY_REGION_TRACKING_MB: 1
  },

  // Network budgets
  NETWORK: {
    INITIAL_BUNDLE_KB: 500,
    LAZY_CHUNK_KB: 100,
    TOTAL_ASSETS_MB: 5
  }
};

// Auto-detect performance settings based on device capabilities
export function getOptimalPerformanceSettings() {
  const deviceCapabilities = detectDeviceCapabilities();
  const gridSize = 25; // Default grid size
  
  return {
    ...PERFORMANCE_CONFIG,
    
    // Adjust based on device
    LAZY_LOADING: {
      ...PERFORMANCE_CONFIG.LAZY_LOADING,
      CONCURRENT_LOADS: deviceCapabilities.concurrentLoads
    },
    
    // Adjust based on grid size
    DIRTY_REGIONS: {
      ...PERFORMANCE_CONFIG.DIRTY_REGIONS,
      MAX_DIRTY_REGIONS: gridSize > 50 ? 100 : 50
    },
    
    // Feature flags based on device
    FEATURES: {
      ...PERFORMANCE_CONFIG.FEATURES,
      ADAPTIVE_QUALITY: deviceCapabilities.category !== 'HIGH_END'
    }
  };
}

// Simple device capability detection
function detectDeviceCapabilities() {
  const memory = navigator.deviceMemory || 4; // GB
  const cores = navigator.hardwareConcurrency || 4;
  const connectionType = navigator.connection?.effectiveType || '4g';
  
  let category = 'MEDIUM';
  let concurrentLoads = 4;
  
  if (memory >= 8 && cores >= 8) {
    category = 'HIGH_END';
    concurrentLoads = 6;
  } else if (memory <= 2 || cores <= 2 || connectionType === '3g') {
    category = 'LOW_END';
    concurrentLoads = 2;
  }
  
  return {
    category,
    concurrentLoads,
    memory,
    cores,
    connectionType
  };
}

// Export performance utilities
export const PerformanceUtils = {
  getOptimalSettings: getOptimalPerformanceSettings,
  detectDevice: detectDeviceCapabilities,
  
  // Check if an operation is within budget
  isWithinBudget(operationType, actualTime) {
    const budget = PERFORMANCE_BUDGETS.OPERATIONS[operationType];
    return budget ? actualTime <= budget : true;
  },
  
  // Get recommended settings for a grid size
  getGridSettings(gridSize) {
    for (const [category, settings] of Object.entries(PERFORMANCE_THRESHOLDS.GRID_OPTIMIZATION)) {
      if (gridSize <= settings.size) {
        return settings;
      }
    }
    return PERFORMANCE_THRESHOLDS.GRID_OPTIMIZATION.XLARGE;
  }
};