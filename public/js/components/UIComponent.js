/**
 * UIComponent - Base class for all UI components
 * Extends Observable to provide event handling and state management
 */

import { Observable } from '../patterns/Observer.js';

export class UIComponent extends Observable {
  constructor(container, options = {}) {
    super();
    this.container = container;
    this.options = options;
    this.element = null;
    this.isInitialized = false;
    this.isDestroyed = false;
    this._eventListeners = new Map();
  }

  /**
   * Initialize the component
   * Should be implemented by subclasses
   */
  async initialize() {
    if (this.isInitialized || this.isDestroyed) return;

    try {
      await this.onCreate();
      await this.onMount();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error(`Error initializing ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Create the component's DOM structure
   * Should be implemented by subclasses
   */
  async onCreate() {
    // Override in subclasses
  }

  /**
   * Mount the component to the DOM
   * Should be implemented by subclasses
   */
  async onMount() {
    // Override in subclasses
  }

  /**
   * Update the component
   * Should be implemented by subclasses
   */
  update(data) {
    if (!this.isInitialized || this.isDestroyed) return;
    this.emit('updated', data);
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    if (this.isDestroyed) return;

    try {
      this.onDestroy();
      this.removeAllEventListeners();
      this.removeAllListeners();
      
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }

      this.isDestroyed = true;
      this.isInitialized = false;
      this.emit('destroyed');
    } catch (error) {
      console.error(`Error destroying ${this.constructor.name}:`, error);
    }
  }

  /**
   * Cleanup hook for subclasses
   */
  onDestroy() {
    // Override in subclasses
  }

  /**
   * Add event listener and track it for cleanup
   */
  addEventListener(target, event, handler, options = {}) {
    if (!this._eventListeners.has(target)) {
      this._eventListeners.set(target, []);
    }

    const boundHandler = handler.bind(this);
    this._eventListeners.get(target).push({ event, handler: boundHandler, options });
    target.addEventListener(event, boundHandler, options);

    return boundHandler;
  }

  /**
   * Remove all tracked event listeners
   */
  removeAllEventListeners() {
    for (const [target, listeners] of this._eventListeners) {
      for (const { event, handler, options } of listeners) {
        target.removeEventListener(event, handler, options);
      }
    }
    this._eventListeners.clear();
  }

  /**
   * Show the component
   */
  show() {
    if (this.element) {
      this.element.style.display = '';
      this.element.style.visibility = 'visible';
      this.emit('shown');
    }
  }

  /**
   * Hide the component
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
      this.emit('hidden');
    }
  }

  /**
   * Get component element
   */
  getElement() {
    return this.element;
  }

  /**
   * Check if component is visible
   */
  isVisible() {
    return this.element && 
           this.element.style.display !== 'none' && 
           this.element.style.visibility !== 'hidden';
  }

  /**
   * Wait for element to be available in DOM
   */
  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Safely query selector within component
   */
  querySelector(selector) {
    return this.element ? this.element.querySelector(selector) : null;
  }

  /**
   * Safely query all selectors within component
   */
  querySelectorAll(selector) {
    return this.element ? this.element.querySelectorAll(selector) : [];
  }
}