/**
 * DOMProvider - Abstraction layer for DOM access
 *
 * Eliminates hardcoded element IDs and provides centralized DOM management
 * Enables dependency injection for DOM operations and improves testability
 */
class DOMProvider {
  constructor(elementMap = {}) {
    this.elements = new Map();
    this.cache = new Map();
    this.observers = new Map();
    this.isInitialized = false;

    // Register initial elements
    if (Object.keys(elementMap).length > 0) {
      this.registerElements(elementMap);
    }
  }

  /**
     * Register elements with the provider
     * @param {Object} elementMap - Map of element names to selectors
     * @param {boolean} cache - Whether to cache the elements (default: true)
     */
  registerElements(elementMap, cache = true) {
    Object.entries(elementMap).forEach(([name, selector]) => {
      this.registerElement(name, selector, cache);
    });
  }

  /**
     * Register a single element
     * @param {string} name - Element name/identifier
     * @param {string} selector - CSS selector or element ID
     * @param {boolean} cache - Whether to cache the element
     */
  registerElement(name, selector, cache = true) {
    this.elements.set(name, { selector, cache });

    if (cache) {
      // Cache element immediately if DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.cacheElement(name);
        });
      } else {
        this.cacheElement(name);
      }
    }
  }

  /**
     * Cache an element for faster subsequent access
     * @param {string} name - Element name
     */
  cacheElement(name) {
    const config = this.elements.get(name);
    if (!config) return;

    const element = this.findElement(config.selector);
    if (element) {
      this.cache.set(name, element);
    }
  }

  /**
     * Get an element by name
     * @param {string} name - Element name
     * @returns {HTMLElement|null} DOM element or null if not found
     */
  get(name) {
    // Return cached element if available
    if (this.cache.has(name)) {
      const element = this.cache.get(name);
      // Verify element is still in DOM
      if (element && document.contains(element)) {
        return element;
      } else {
        // Remove stale cache entry
        this.cache.delete(name);
      }
    }

    // Get element configuration
    const config = this.elements.get(name);
    if (!config) {
      console.warn(`DOMProvider: Element '${name}' not registered`);
      return null;
    }

    // Find and optionally cache element
    const element = this.findElement(config.selector);
    if (element && config.cache) {
      this.cache.set(name, element);
    }

    return element;
  }

  /**
     * Find element using selector
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null} DOM element
     */
  findElement(selector) {
    // Handle ID selectors
    if (selector.startsWith('#')) {
      return document.getElementById(selector.slice(1));
    }

    // Handle other selectors
    return document.querySelector(selector);
  }

  /**
     * Query for elements using CSS selector
     * @param {string} selector - CSS selector
     * @param {boolean} all - Whether to return all matches (default: false)
     * @returns {HTMLElement|NodeList|null} Element(s) or null
     */
  query(selector, all = false) {
    return all ?
      document.querySelectorAll(selector) :
      document.querySelector(selector);
  }

  /**
     * Create a new element
     * @param {string} tagName - Element tag name
     * @param {Object} attributes - Element attributes
     * @param {string} textContent - Element text content
     * @returns {HTMLElement} Created element
     */
  createElement(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    // Set text content
    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }

  /**
     * Check if element exists and is in DOM
     * @param {string} name - Element name
     * @returns {boolean} True if element exists
     */
  exists(name) {
    const element = this.get(name);
    return element !== null && document.contains(element);
  }

  /**
     * Wait for element to appear in DOM
     * @param {string} name - Element name
     * @param {number} timeout - Timeout in milliseconds (default: 5000)
     * @returns {Promise<HTMLElement>} Promise that resolves to element
     */
  waitFor(name, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = this.get(name);
      if (element) {
        resolve(element);
        return;
      }

      // Set up mutation observer
      const observer = new MutationObserver(() => {
        const element = this.get(name);
        if (element) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(element);
        }
      });

      // Start observing
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`DOMProvider: Element '${name}' not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
     * Add event listener to element
     * @param {string} name - Element name
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event listener options
     */
  addEventListener(name, event, handler, options = {}) {
    const element = this.get(name);
    if (element) {
      element.addEventListener(event, handler, options);
    } else {
      console.warn(`DOMProvider: Cannot add event listener to '${name}' - element not found`);
    }
  }

  /**
     * Remove event listener from element
     * @param {string} name - Element name
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
  removeEventListener(name, event, handler) {
    const element = this.get(name);
    if (element) {
      element.removeEventListener(event, handler);
    }
  }

  /**
     * Update element content safely
     * @param {string} name - Element name
     * @param {string} content - New content
     * @param {boolean} html - Whether content is HTML (default: false)
     */
  updateContent(name, content, html = false) {
    const element = this.get(name);
    if (element) {
      if (html) {
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }
    } else {
      console.warn(`DOMProvider: Cannot update content of '${name}' - element not found`);
    }
  }

  /**
     * Toggle element visibility
     * @param {string} name - Element name
     * @param {boolean} visible - Whether element should be visible
     */
  setVisible(name, visible) {
    const element = this.get(name);
    if (element) {
      element.style.display = visible ? '' : 'none';
    }
  }

  /**
     * Add CSS class to element
     * @param {string} name - Element name
     * @param {string} className - CSS class name
     */
  addClass(name, className) {
    const element = this.get(name);
    if (element) {
      element.classList.add(className);
    }
  }

  /**
     * Remove CSS class from element
     * @param {string} name - Element name
     * @param {string} className - CSS class name
     */
  removeClass(name, className) {
    const element = this.get(name);
    if (element) {
      element.classList.remove(className);
    }
  }

  /**
     * Clear all cached elements
     * Useful when DOM structure changes significantly
     */
  clearCache() {
    this.cache.clear();
  }

  /**
     * Get element registry info (for debugging)
     * @returns {Array} Array of registered elements
     */
  getRegistryInfo() {
    return Array.from(this.elements.entries()).map(([name, config]) => ({
      name,
      selector: config.selector,
      cached: this.cache.has(name),
      exists: this.exists(name)
    }));
  }

  /**
     * Initialize provider with common UI elements
     * Should be called after DOM is ready
     */
  initializeCommonElements() {
    const commonElements = {
      // Game UI elements
      'currentPlayer': '#currentPlayer',
      'gameStatus': '#gameStatus',
      'turnNumber': '#turnNumber',
      'playerResources': '#playerResources',
      'actionButtons': '#actionButtons',
      'gameCanvas': '#gameCanvas',
      'gameGrid': '#gameGrid',

      // Sidebar elements
      'buildPanelSidebar': '#buildPanelSidebar',
      'unitInfoSidebar': '#unitInfoSidebar',
      'turnInterface': '#turnInterface',

      // Message elements
      'messageDisplay': '#messageDisplay',
      'turnTransitionOverlay': '#turnTransitionOverlay',

      // Control elements
      'startButton': '#startButton',
      'endTurnButton': '#endTurnButton',
      'gatherResourcesButton': '#gatherResourcesButton'
    };

    this.registerElements(commonElements);
    this.isInitialized = true;
  }
}

export default DOMProvider;
