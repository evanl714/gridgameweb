/**
 * ServiceContainer - Centralized dependency injection container
 *
 * Manages service registration, resolution, and lifecycle
 * Eliminates global state dependencies by providing controlled dependency injection
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.isInitialized = false;
  }

  /**
     * Register a service with the container
     * @param {string} name - Service name/identifier
     * @param {Function} factory - Factory function that creates the service instance
     * @param {Object} options - Service options
     * @param {boolean} options.singleton - Whether service should be singleton (default: true)
     * @param {Array<string>} options.dependencies - Service dependencies to inject
     */
  register(name, factory, options = {}) {
    const config = {
      factory,
      singleton: options.singleton !== false,
      dependencies: options.dependencies || [],
      initialized: false
    };

    this.services.set(name, config);
    return this;
  }

  /**
     * Get a service instance
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
  get(name) {
    // Return singleton if already created
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered in container`);
    }

    // Create instance - pass container to factory for dependency resolution
    const instance = service.factory(this);

    // Store singleton if required
    if (service.singleton) {
      this.singletons.set(name, instance);
    }

    service.initialized = true;
    return instance;
  }

  /**
     * Resolve service dependencies
     * @param {Array<string>} dependencies - Dependency names
     * @returns {Array} Resolved dependency instances
     */
  resolveDependencies(dependencies) {
    return dependencies.map(dep => {
      if (typeof dep === 'string') {
        return this.get(dep);
      }
      return dep; // Already resolved or primitive value
    });
  }

  /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean} True if service exists
     */
  has(name) {
    return this.services.has(name);
  }

  /**
     * Initialize all registered services
     * Should be called after all services are registered
     */
  initialize() {
    if (this.isInitialized) {
      throw new Error('ServiceContainer already initialized');
    }

    // Initialize services in dependency order
    for (const [name] of this.services) {
      this.get(name);
    }

    this.isInitialized = true;
    return this;
  }

  /**
     * Create a child container with access to parent services
     * @returns {ServiceContainer} New child container
     */
  createChild() {
    const child = new ServiceContainer();
    child.parent = this;
    return child;
  }

  /**
     * Override get method to check parent container if service not found
     */
  getWithParent(name) {
    try {
      return this.get(name);
    } catch (error) {
      if (this.parent && this.parent.has(name)) {
        return this.parent.get(name);
      }
      throw error;
    }
  }

  /**
     * Get all registered service names
     * @returns {Array<string>} Service names
     */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
     * Clear all services and singletons
     * Useful for testing or cleanup
     */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    this.isInitialized = false;
  }

  /**
     * Get service registration info (for debugging)
     * @param {string} name - Service name
     * @returns {Object} Service configuration
     */
  getServiceInfo(name) {
    const service = this.services.get(name);
    if (!service) return null;

    return {
      name,
      singleton: service.singleton,
      dependencies: service.dependencies,
      initialized: service.initialized,
      hasInstance: this.singletons.has(name)
    };
  }

  /**
     * Validate service dependencies to detect circular references
     * @returns {Array<string>} Array of dependency issues
     */
  validateDependencies() {
    const issues = [];
    const visiting = new Set();
    const visited = new Set();

    const visit = (serviceName, path = []) => {
      if (visiting.has(serviceName)) {
        issues.push(`Circular dependency detected: ${path.join(' -> ')} -> ${serviceName}`);
        return;
      }

      if (visited.has(serviceName)) return;

      visiting.add(serviceName);
      const service = this.services.get(serviceName);

      if (service) {
        for (const dep of service.dependencies) {
          if (typeof dep === 'string') {
            visit(dep, [...path, serviceName]);
          }
        }
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
    };

    for (const serviceName of this.services.keys()) {
      visit(serviceName);
    }

    return issues;
  }
}

export default ServiceContainer;
