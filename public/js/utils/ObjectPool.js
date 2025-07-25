/**
 * ObjectPool - Manages pools of reusable objects to reduce garbage collection
 * Provides efficient object reuse for DOM elements and other frequently created objects
 */
export class ObjectPool {
  constructor(name = 'UnnamedPool') {
    this.name = name;
    this.pools = new Map();
    this.statistics = {
      acquisitions: 0,
      releases: 0,
      creations: 0,
      poolHits: 0,
      poolMisses: 0,
      currentSize: 0,
      peakSize: 0
    };
    this.maxPoolSize = 100; // Prevent memory leaks
    this.factories = new Map(); // Object creation functions
  }

  /**
   * Register a factory function for creating objects of a specific type
   * @param {string} type - Object type identifier
   * @param {Function} factory - Function that creates new objects
   * @param {Function} reset - Optional function to reset object state
   */
  registerFactory(type, factory, reset = null) {
    this.factories.set(type, {
      create: factory,
      reset: reset || ((obj) => obj)
    });

    // Initialize pool for this type
    if (!this.pools.has(type)) {
      this.pools.set(type, []);
    }
  }

  /**
   * Acquire an object from the pool or create a new one
   * @param {string} type - Object type to acquire
   * @param {...any} args - Arguments to pass to factory if creating new object
   */
  acquire(type, ...args) {
    this.statistics.acquisitions++;

    const pool = this.pools.get(type);
    const factory = this.factories.get(type);

    if (!factory) {
      throw new Error(`No factory registered for type: ${type}`);
    }

    if (pool && pool.length > 0) {
      // Get from pool
      const obj = pool.pop();
      this.statistics.poolHits++;
      this.updateCurrentSize();
      
      // Reset object state
      return factory.reset(obj);
    } else {
      // Create new object
      this.statistics.creations++;
      this.statistics.poolMisses++;
      return factory.create(...args);
    }
  }

  /**
   * Release an object back to the pool
   * @param {string} type - Object type
   * @param {any} obj - Object to release
   */
  release(type, obj) {
    if (!obj) return;

    this.statistics.releases++;

    const pool = this.pools.get(type);
    if (!pool) {
      console.warn(`No pool found for type: ${type}`);
      return;
    }

    // Check pool size limits
    if (pool.length >= this.maxPoolSize) {
      // Pool is full, discard object
      return;
    }

    // Clean object before returning to pool
    this.cleanObject(obj, type);
    
    pool.push(obj);
    this.updateCurrentSize();
  }

  /**
   * Clean an object before returning it to the pool
   */
  cleanObject(obj, type) {
    // Common cleaning operations for DOM elements
    if (obj instanceof HTMLElement) {
      // Clear content
      obj.innerHTML = '';
      obj.textContent = '';
      
      // Remove all classes except base ones
      const baseClasses = this.getBaseClasses(type);
      obj.className = baseClasses.join(' ');
      
      // Clear inline styles
      obj.style.cssText = '';
      
      // Remove event listeners (basic cleanup)
      obj.onclick = null;
      obj.onmouseover = null;
      obj.onmouseout = null;
      
      // Remove from DOM if attached
      if (obj.parentNode) {
        obj.parentNode.removeChild(obj);
      }
    }
  }

  /**
   * Get base CSS classes for a specific object type
   */
  getBaseClasses(type) {
    const baseClassMap = {
      'unit-display': ['unit-display'],
      'base-display': ['base-display'],
      'resource-display': ['resource-display'],
      'selection-ring': ['selection-ring'],
      'grid-cell': ['grid-cell'],
      'ui-panel': ['ui-panel'],
      'button': ['btn'],
      'tooltip': ['tooltip']
    };

    return baseClassMap[type] || [];
  }

  /**
   * Update current size statistics
   */
  updateCurrentSize() {
    let totalSize = 0;
    for (const pool of this.pools.values()) {
      totalSize += pool.length;
    }
    
    this.statistics.currentSize = totalSize;
    this.statistics.peakSize = Math.max(this.statistics.peakSize, totalSize);
  }

  /**
   * Warm up the pool by pre-creating objects
   * @param {string} type - Object type
   * @param {number} count - Number of objects to pre-create
   */
  warmUp(type, count = 10) {
    const factory = this.factories.get(type);
    if (!factory) {
      console.warn(`Cannot warm up pool for unregistered type: ${type}`);
      return;
    }

    const pool = this.pools.get(type);
    
    for (let i = 0; i < count; i++) {
      if (pool.length >= this.maxPoolSize) break;
      
      try {
        const obj = factory.create();
        this.cleanObject(obj, type);
        pool.push(obj);
      } catch (error) {
        console.error(`Failed to warm up pool for type ${type}:`, error);
        break;
      }
    }

    this.updateCurrentSize();
    console.log(`Pool warmed up: ${type} (${pool.length} objects)`);
  }

  /**
   * Clear a specific pool or all pools
   * @param {string} type - Optional specific type to clear
   */
  clear(type = null) {
    if (type) {
      const pool = this.pools.get(type);
      if (pool) {
        pool.length = 0;
        console.log(`Pool cleared: ${type}`);
      }
    } else {
      for (const pool of this.pools.values()) {
        pool.length = 0;
      }
      console.log(`All pools cleared for: ${this.name}`);
    }
    
    this.updateCurrentSize();
  }

  /**
   * Get pool statistics
   */
  getStatistics() {
    const poolSizes = {};
    for (const [type, pool] of this.pools) {
      poolSizes[type] = pool.length;
    }

    const hitRate = this.statistics.acquisitions > 0
      ? (this.statistics.poolHits / this.statistics.acquisitions) * 100
      : 0;

    return {
      name: this.name,
      ...this.statistics,
      poolSizes,
      hitRate,
      registeredTypes: Array.from(this.factories.keys())
    };
  }

  /**
   * Get detailed pool information
   */
  getPoolInfo() {
    const info = [];
    
    for (const [type, pool] of this.pools) {
      const factory = this.factories.get(type);
      info.push({
        type,
        size: pool.length,
        maxSize: this.maxPoolSize,
        hasFactory: !!factory,
        hasResetFunction: !!(factory && factory.reset)
      });
    }

    return info;
  }

  /**
   * Optimize pools by removing excess objects
   */
  optimize() {
    let removed = 0;
    const targetSize = Math.floor(this.maxPoolSize * 0.7); // Keep 70% of max

    for (const [type, pool] of this.pools) {
      if (pool.length > targetSize) {
        const excess = pool.length - targetSize;
        pool.splice(targetSize);
        removed += excess;
      }
    }

    this.updateCurrentSize();
    
    if (removed > 0) {
      console.log(`Pool optimized: ${this.name} (removed ${removed} objects)`);
    }

    return removed;
  }
}

/**
 * DOMElementPool - Specialized object pool for DOM elements
 */
export class DOMElementPool extends ObjectPool {
  constructor() {
    super('DOMElementPool');
    this.registerCommonDOMFactories();
  }

  /**
   * Register common DOM element factories
   */
  registerCommonDOMFactories() {
    // Unit display elements
    this.registerFactory(
      'unit-display',
      () => {
        const div = document.createElement('div');
        div.className = 'unit-display';
        return div;
      },
      (element) => {
        this.cleanObject(element, 'unit-display');
        return element;
      }
    );

    // Base display elements
    this.registerFactory(
      'base-display',
      () => {
        const div = document.createElement('div');
        div.className = 'base-display';
        return div;
      },
      (element) => {
        this.cleanObject(element, 'base-display');
        return element;
      }
    );

    // Resource display elements
    this.registerFactory(
      'resource-display',
      () => {
        const div = document.createElement('div');
        div.className = 'resource-display';
        return div;
      },
      (element) => {
        this.cleanObject(element, 'resource-display');
        return element;
      }
    );

    // Selection ring elements
    this.registerFactory(
      'selection-ring',
      () => {
        const div = document.createElement('div');
        div.className = 'selection-ring';
        return div;
      },
      (element) => {
        this.cleanObject(element, 'selection-ring');
        return element;
      }
    );

    // Generic div elements
    this.registerFactory(
      'div',
      () => document.createElement('div'),
      (element) => {
        this.cleanObject(element, 'div');
        return element;
      }
    );

    // Button elements
    this.registerFactory(
      'button',
      () => {
        const button = document.createElement('button');
        button.type = 'button';
        return button;
      },
      (element) => {
        this.cleanObject(element, 'button');
        element.disabled = false;
        return element;
      }
    );

    // Tooltip elements
    this.registerFactory(
      'tooltip',
      () => {
        const div = document.createElement('div');
        div.className = 'tooltip';
        div.style.position = 'absolute';
        div.style.pointerEvents = 'none';
        return div;
      },
      (element) => {
        this.cleanObject(element, 'tooltip');
        element.style.display = 'none';
        return element;
      }
    );
  }

  /**
   * Create a configured unit display element
   */
  createUnitDisplay(unit) {
    const element = this.acquire('unit-display');
    element.textContent = unit.character || '?';
    element.classList.add(`player${unit.playerId}`);
    element.dataset.unitId = unit.id;
    return element;
  }

  /**
   * Create a configured base display element
   */
  createBaseDisplay(base) {
    const element = this.acquire('base-display');
    element.textContent = '🏠';
    element.classList.add(`player${base.playerId}-base`);
    element.dataset.baseId = base.id;
    return element;
  }

  /**
   * Create a configured resource display element
   */
  createResourceDisplay(resource) {
    const element = this.acquire('resource-display');
    element.textContent = '💎';
    element.dataset.resourceAmount = resource.amount;
    return element;
  }
}

// Create global DOM element pool instance
export const domElementPool = new DOMElementPool();

// Warm up common pools
domElementPool.warmUp('unit-display', 20);
domElementPool.warmUp('base-display', 10);
domElementPool.warmUp('resource-display', 15);
domElementPool.warmUp('selection-ring', 5);