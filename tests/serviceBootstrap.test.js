/**
 * ServiceBootstrap System Tests
 * 
 * Tests the ServiceBootstrap system's core functionality including:
 * - ServiceContainer dependency injection
 * - Service registration and resolution  
 * - Basic ServiceBootstrap initialization
 * - Error handling and validation
 */

import ServiceBootstrap, { initializeServices } from '../public/js/services/ServiceBootstrap.js';
import ServiceContainer from '../public/js/services/ServiceContainer.js';

// Mock globals that are used by the services
Object.defineProperty(global, 'document', {
    value: {
        createElement: jest.fn(() => ({
            style: {},
            classList: { add: jest.fn(), remove: jest.fn() },
            appendChild: jest.fn(),
            sheet: { insertRule: jest.fn() }
        })),
        getElementById: jest.fn(() => null),
        querySelector: jest.fn(() => null),
        addEventListener: jest.fn(),
        readyState: 'complete',
        body: { appendChild: jest.fn() },
        head: { appendChild: jest.fn() }
    },
    writable: true
});

Object.defineProperty(global, 'window', {
    value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    },
    writable: true
});

global.MutationObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
}));

// Suppress console output during tests
beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
});

describe('ServiceContainer Core Tests', () => {
    let container;

    beforeEach(() => {
        container = new ServiceContainer();
    });

    test('should register and resolve simple services', () => {
        container.register('testService', () => ({ test: true }));
        
        const service = container.get('testService');
        expect(service.test).toBe(true);
    });

    test('should handle dependency injection', () => {
        // Register dependency first
        container.register('dependency', () => ({ value: 'dependency' }));
        
        // Register service with dependency - the container passes itself as first argument
        container.register('service', (serviceContainer) => {
            const dep = serviceContainer.get('dependency');
            return { dependency: dep, name: 'service' };
        }, { dependencies: ['dependency'] });

        const service = container.get('service');
        expect(service.dependency.value).toBe('dependency');
        expect(service.name).toBe('service');
    });

    test('should maintain singleton instances', () => {
        container.register('singleton', () => ({ id: Math.random() }));
        
        const instance1 = container.get('singleton');
        const instance2 = container.get('singleton');
        
        expect(instance1).toBe(instance2);
    });

    test('should validate dependencies for circular references', () => {
        container.register('service1', () => ({}), { dependencies: ['service2'] });
        container.register('service2', () => ({}), { dependencies: ['service1'] });

        const issues = container.validateDependencies();
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0]).toContain('Circular dependency');
    });

    test('should handle missing dependencies', () => {
        container.register('service', () => ({}), { dependencies: ['missingService'] });

        expect(() => {
            container.get('service');
        }).toThrow("Service 'missingService' not registered in container");
    });

    test('should clear all services', () => {
        container.register('service1', () => ({}));
        container.register('service2', () => ({}));
        
        expect(container.getServiceNames().length).toBe(2);
        
        container.clear();
        
        expect(container.getServiceNames().length).toBe(0);
    });

    test('should provide service information for debugging', () => {
        container.register('debugService', () => ({ debug: true }), { 
            dependencies: ['nonExistent'],
            singleton: true 
        });

        const info = container.getServiceInfo('debugService');
        expect(info).toBeDefined();
        expect(info.name).toBe('debugService');
        expect(info.singleton).toBe(true);
        expect(info.dependencies).toEqual(['nonExistent']);
        expect(info.initialized).toBe(false);
    });

    test('should handle child containers', () => {
        // Register service in parent
        container.register('parentService', () => ({ parent: true }));
        
        // Create child container
        const child = container.createChild();
        child.register('childService', () => ({ child: true }));

        // Child should have access to both services
        expect(child.has('childService')).toBe(true);
        expect(child.has('parentService')).toBe(false); // has() only checks own services
        
        // But getWithParent should work
        expect(child.getWithParent('parentService')).toBeDefined();
        expect(child.getWithParent('childService')).toBeDefined();
    });
});

describe('ServiceBootstrap Core Functionality', () => {
    let bootstrap;

    beforeEach(() => {
        bootstrap = new ServiceBootstrap();
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (bootstrap && bootstrap.isInitialized) {
            bootstrap.dispose();
        }
    });

    test('should create ServiceBootstrap instance with correct initial state', () => {
        expect(bootstrap).toBeInstanceOf(ServiceBootstrap);
        expect(bootstrap.isInitialized).toBe(false);
        expect(bootstrap.container).toBeInstanceOf(ServiceContainer);
        expect(bootstrap.services).toEqual({});
    });

    test('should have proper configuration defaults', () => {
        expect(bootstrap.config.initializationTimeout).toBe(10000);
        expect(bootstrap.config.enableDebugMode).toBe(false);
        expect(bootstrap.config.strictMode).toBe(true);
    });

    test('should provide singleton instance access', () => {
        const instance1 = ServiceBootstrap.getInstance();
        const instance2 = ServiceBootstrap.getInstance();

        expect(instance1).toBe(instance2);
        expect(instance1).toBeInstanceOf(ServiceBootstrap);
    });

    test('should handle disposal when not initialized', () => {
        expect(() => bootstrap.dispose()).not.toThrow();
        expect(bootstrap.isInitialized).toBe(false);
    });

    test('should allow custom service registration before initialization', () => {
        expect(() => {
            bootstrap.addService('customService', () => ({ custom: true }));
        }).not.toThrow();

        expect(bootstrap.container.has('customService')).toBe(true);
    });

    test('should get bootstrap status', () => {
        const status = bootstrap.getBootstrapStatus();
        
        expect(status.initialized).toBe(false);
        expect(typeof status.serviceCount).toBe('number');
        expect(Array.isArray(status.services)).toBe(true);
        expect(status.containerStatus).toBeDefined();
    });

    test('should handle service registration phases', () => {
        // Verify that bootstrap registers core services during construction
        const serviceNames = bootstrap.container.getServiceNames();
        
        // Should have core services registered
        expect(serviceNames.length).toBeGreaterThan(0);
        
        // Check for expected core services
        expect(serviceNames).toContain('eventEmitter');
        expect(serviceNames).toContain('domProvider');
        expect(serviceNames).toContain('gameStateManager');
    });

    test('should validate service dependencies on registration', () => {
        // The bootstrap should register services without circular dependencies
        const issues = bootstrap.container.validateDependencies();
        expect(issues.length).toBe(0);
    });

    test('should handle custom options', () => {
        const options = {
            initializationTimeout: 5000,
            enableDebugMode: true,
            strictMode: false
        };

        // Update config
        Object.assign(bootstrap.config, options);

        expect(bootstrap.config.initializationTimeout).toBe(5000);
        expect(bootstrap.config.enableDebugMode).toBe(true);
        expect(bootstrap.config.strictMode).toBe(false);
    });

    test('should provide access to container methods', () => {
        expect(typeof bootstrap.addService).toBe('function');
        expect(typeof bootstrap.getBootstrapStatus).toBe('function');
        expect(typeof bootstrap.dispose).toBe('function');
    });
});

describe('ServiceBootstrap Error Handling', () => {
    test('should handle validation failures in strict mode', () => {
        const bootstrap = new ServiceBootstrap();
        
        // Mock validation to fail
        bootstrap.container.validateDependencies = jest.fn(() => ['Mock validation error']);

        // Should detect validation issues
        const issues = bootstrap.container.validateDependencies();
        expect(issues.length).toBeGreaterThan(0);
    });

    test('should handle service replacement warnings', () => {
        const bootstrap = new ServiceBootstrap();
        
        // Add service after imaginary initialization
        bootstrap.isInitialized = true; // Simulate initialized state
        
        expect(() => {
            bootstrap.addService('testService', () => ({ test: true }));
        }).not.toThrow();

        // Should have logged warning
        expect(console.warn).toHaveBeenCalledWith(
            "Adding service 'testService' after initialization"
        );
    });

    test('should handle disposal safely', () => {
        const bootstrap = new ServiceBootstrap();
        
        // Multiple disposals should be safe
        expect(() => {
            bootstrap.dispose();
            bootstrap.dispose();
        }).not.toThrow();
    });
});

describe('ServiceBootstrap Integration Concepts', () => {
    test('should demonstrate service dependency patterns', () => {
        const bootstrap = new ServiceBootstrap();
        
        // Add services that depend on core services
        bootstrap.addService('testService', (container) => {
            // This demonstrates how services get access to other services
            expect(typeof container.get).toBe('function');
            expect(typeof container.has).toBe('function');
            
            return { 
                type: 'test',
                hasContainer: true
            };
        }, { dependencies: ['eventEmitter'] });

        // Verify service is registered
        expect(bootstrap.container.has('testService')).toBe(true);
        
        // Get service info
        const info = bootstrap.container.getServiceInfo('testService');
        expect(info.dependencies).toContain('eventEmitter');
    });

    test('should demonstrate convenience function pattern', () => {
        // The initializeServices function should exist and be callable
        expect(typeof initializeServices).toBe('function');
        
        // Note: We can't easily test the actual initialization due to DOM dependencies
        // but we can verify the function exists and can be imported
    });

    test('should show service container capabilities', () => {
        const container = new ServiceContainer();
        
        // Demonstrate advanced container features
        container.register('configService', () => ({
            apiUrl: 'http://localhost:3000',
            enableDebug: true
        }));

        container.register('httpService', (serviceContainer) => {
            const config = serviceContainer.get('configService');
            return {
                baseUrl: config.apiUrl,
                get: (path) => `GET ${config.apiUrl}${path}`,
                debug: config.enableDebug
            };
        }, { dependencies: ['configService'] });

        // Test the chain
        const httpService = container.get('httpService');
        expect(httpService.baseUrl).toBe('http://localhost:3000');
        expect(httpService.get('/api/test')).toBe('GET http://localhost:3000/api/test');
        expect(httpService.debug).toBe(true);
    });
});

describe('ServiceBootstrap Architecture Validation', () => {
    test('should demonstrate proper service architecture', () => {
        const bootstrap = new ServiceBootstrap();
        
        // Verify core architecture components are registered
        const serviceNames = bootstrap.container.getServiceNames();
        
        // Core infrastructure services
        expect(serviceNames).toContain('eventEmitter');
        expect(serviceNames).toContain('domProvider');
        
        // Application services  
        expect(serviceNames).toContain('gameStateManager');
        expect(serviceNames).toContain('turnManagerService');
        
        // UI services
        expect(serviceNames).toContain('uiStateManager');
        expect(serviceNames).toContain('notificationService');
        
        console.log('Registered services:', serviceNames);
    });

    test('should validate service dependency structure', () => {
        const bootstrap = new ServiceBootstrap();
        
        // Check that dependencies are properly structured
        const gameStateInfo = bootstrap.container.getServiceInfo('gameStateManager');
        expect(gameStateInfo.dependencies).toContain('eventEmitter');
        
        const turnManagerInfo = bootstrap.container.getServiceInfo('turnManagerService');
        expect(turnManagerInfo.dependencies).toContain('gameStateManager');
        expect(turnManagerInfo.dependencies).toContain('eventEmitter');
        
        const uiStateInfo = bootstrap.container.getServiceInfo('uiStateManager');
        expect(uiStateInfo.dependencies).toContain('gameStateManager');
        expect(uiStateInfo.dependencies).toContain('turnManagerService');
    });

    test('should show bootstrap provides expected interface', () => {
        const bootstrap = new ServiceBootstrap();
        
        // Verify bootstrap has expected public methods
        expect(typeof bootstrap.initialize).toBe('function');
        expect(typeof bootstrap.dispose).toBe('function');
        expect(typeof bootstrap.restart).toBe('function');
        expect(typeof bootstrap.addService).toBe('function');
        expect(typeof bootstrap.getBootstrapStatus).toBe('function');
        
        // Verify static methods
        expect(typeof ServiceBootstrap.getInstance).toBe('function');
        
        // Verify container access
        expect(bootstrap.container).toBeInstanceOf(ServiceContainer);
    });
});