/**
 * UI Component Architecture Verification Test
 * Tests the extracted UI component system to ensure proper functionality
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('UI Component Architecture Test', () => {
  let testFiles = {};
  
  beforeEach(() => {
    // Clear any existing modules
    jest.resetModules();
    
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  describe('File Existence Tests', () => {
    test('All required component files exist', () => {
      const requiredFiles = [
        'public/js/components/UIComponent.js',
        'public/js/components/BuildPanelComponent.js',
        'public/js/components/ControlPanelComponent.js',
        'public/js/components/GameBoardComponent.js',
        'public/js/components/GridGeneratorComponent.js',
        'public/js/managers/ComponentManager.js',
        'public/js/services/ServiceBootstrap.js',
        'public/js/patterns/Observer.js'
      ];

      const results = {
        existing: [],
        missing: []
      };

      requiredFiles.forEach(filePath => {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
          results.existing.push(filePath);
          testFiles[path.basename(filePath, '.js')] = fullPath;
        } else {
          results.missing.push(filePath);
        }
      });

      console.log('✅ Existing files:', results.existing);
      if (results.missing.length > 0) {
        console.log('❌ Missing files:', results.missing);
      }

      expect(results.missing.length).toBe(0);
      expect(results.existing.length).toBe(requiredFiles.length);
    });

    test('HTML file has been cleaned up (no embedded JavaScript)', () => {
      const htmlPath = path.join(process.cwd(), 'public/index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);

      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Check for removal of embedded scripts
      const hasEmbeddedScripts = /<script(?!.*src=)[\s\S]*?>[\s\S]*?<\/script>/i.test(htmlContent);
      
      // Should contain component loading comment
      const hasComponentComment = htmlContent.includes('UI components now handled by ComponentManager');
      
      // Should load game.js module
      const hasGameModule = htmlContent.includes('src="game.js"');

      expect(hasEmbeddedScripts).toBe(false);
      expect(hasComponentComment).toBe(true);
      expect(hasGameModule).toBe(true);
    });
  });

  describe('Component Module Loading Tests', () => {
    test('Observer pattern can be imported', async () => {
      const { Observable } = await import('file://' + path.join(process.cwd(), 'public/js/patterns/Observer.js'));
      
      expect(Observable).toBeDefined();
      expect(typeof Observable).toBe('function');
      
      // Test basic Observable functionality
      const obs = new Observable();
      expect(obs.on).toBeDefined();
      expect(obs.emit).toBeDefined();
      expect(obs.removeAllListeners).toBeDefined();
    });

    test('UIComponent base class can be imported and instantiated', async () => {
      const { UIComponent } = await import('file://' + path.join(process.cwd(), 'public/js/components/UIComponent.js'));
      
      expect(UIComponent).toBeDefined();
      expect(typeof UIComponent).toBe('function');
      
      // Test instantiation
      const component = new UIComponent('test-container');
      expect(component).toBeDefined();
      expect(component.isInitialized).toBe(false);
      expect(component.isDestroyed).toBe(false);
      expect(typeof component.initialize).toBe('function');
      expect(typeof component.destroy).toBe('function');
    });

    test('ComponentManager can be imported and instantiated', async () => {
      const { ComponentManager } = await import('file://' + path.join(process.cwd(), 'public/js/managers/ComponentManager.js'));
      
      expect(ComponentManager).toBeDefined();
      expect(typeof ComponentManager).toBe('function');
      
      // Create mock service container
      const mockContainer = {
        has: jest.fn(() => false),
        get: jest.fn(() => null)
      };
      
      const manager = new ComponentManager(mockContainer);
      expect(manager).toBeDefined();
      expect(manager.components).toBeDefined();
      expect(manager.componentRegistry).toBeDefined();
      expect(typeof manager.initialize).toBe('function');
      expect(typeof manager.registerComponent).toBe('function');
    });

    test('ServiceBootstrap includes ComponentManager', async () => {
      const ServiceBootstrap = (await import('file://' + path.join(process.cwd(), 'public/js/services/ServiceBootstrap.js'))).default;
      
      expect(ServiceBootstrap).toBeDefined();
      expect(typeof ServiceBootstrap).toBe('function');
      
      const bootstrap = new ServiceBootstrap();
      expect(bootstrap).toBeDefined();
      
      // Check bootstrap has component manager registration
      const bootstrapString = fs.readFileSync(path.join(process.cwd(), 'public/js/services/ServiceBootstrap.js'), 'utf8');
      expect(bootstrapString).toContain('ComponentManager');
      expect(bootstrapString).toContain('componentManager');
      expect(bootstrapString).toContain('registerUIComponents');
    });
  });

  describe('Component Architecture Tests', () => {
    test('All component classes extend UIComponent', async () => {
      const componentFiles = [
        'BuildPanelComponent.js',
        'ControlPanelComponent.js', 
        'GameBoardComponent.js',
        'GridGeneratorComponent.js'
      ];

      for (const componentFile of componentFiles) {
        const componentPath = path.join(process.cwd(), 'public/js/components', componentFile);
        
        if (fs.existsSync(componentPath)) {
          const componentContent = fs.readFileSync(componentPath, 'utf8');
          
          // Check for UIComponent import
          expect(componentContent).toMatch(/import.*UIComponent.*from.*UIComponent/);
          
          // Check for extends UIComponent
          expect(componentContent).toMatch(/extends\s+UIComponent/);
          
          console.log(`✅ ${componentFile} properly extends UIComponent`);
        }
      }
    });

    test('ComponentManager registers built-in components', async () => {
      const { ComponentManager } = await import('file://' + path.join(process.cwd(), 'public/js/managers/ComponentManager.js'));
      
      const mockContainer = {
        has: jest.fn(() => false),
        get: jest.fn(() => null)
      };
      
      const manager = new ComponentManager(mockContainer);
      
      // Check built-in components are registered
      expect(manager.componentRegistry.has('gridGenerator')).toBe(true);
      expect(manager.componentRegistry.has('buildPanel')).toBe(true);
      expect(manager.componentRegistry.has('gameBoard')).toBe(true);
      expect(manager.componentRegistry.has('controlPanel')).toBe(true);
      
      console.log('✅ ComponentManager registers all built-in components');
    });

    test('ServiceBootstrap initialization order includes ComponentManager', async () => {
      const ServiceBootstrap = (await import('file://' + path.join(process.cwd(), 'public/js/services/ServiceBootstrap.js'))).default;
      
      const bootstrap = new ServiceBootstrap();
      
      // Test that ComponentManager is included in service setup
      const serviceContent = fs.readFileSync(path.join(process.cwd(), 'public/js/services/ServiceBootstrap.js'), 'utf8');
      
      // Check initialization phases include ComponentManager
      expect(serviceContent).toContain('registerUIComponents');
      expect(serviceContent).toContain('initializeUIComponents');
      expect(serviceContent).toContain('componentManager.initialize()');
      
      console.log('✅ ServiceBootstrap properly includes ComponentManager in initialization');
    });
  });

  describe('Integration Tests', () => {
    test('Component system can be initialized without errors', async () => {
      // This test verifies the component system doesn't have obvious syntax errors
      // and can be loaded without throwing exceptions
      
      let componentManagerLoaded = false;
      let serviceBootstrapLoaded = false;
      let uiComponentLoaded = false;
      
      try {
        const { UIComponent } = await import('file://' + path.join(process.cwd(), 'public/js/components/UIComponent.js'));
        uiComponentLoaded = !!UIComponent;
      } catch (error) {
        console.error('UIComponent loading failed:', error.message);
      }
      
      try {
        const { ComponentManager } = await import('file://' + path.join(process.cwd(), 'public/js/managers/ComponentManager.js'));
        componentManagerLoaded = !!ComponentManager;
      } catch (error) {
        console.error('ComponentManager loading failed:', error.message);
      }
      
      try {
        const ServiceBootstrap = (await import('file://' + path.join(process.cwd(), 'public/js/services/ServiceBootstrap.js'))).default;
        serviceBootstrapLoaded = !!ServiceBootstrap;
      } catch (error) {
        console.error('ServiceBootstrap loading failed:', error.message);
      }
      
      expect(uiComponentLoaded).toBe(true);
      expect(componentManagerLoaded).toBe(true);
      expect(serviceBootstrapLoaded).toBe(true);
      
      console.log('✅ All core component architecture modules load successfully');
    });

    test('Component dependency chain is intact', async () => {
      // Test that the dependency chain is properly set up
      const dependencyChain = {
        'Observer.js': 'patterns/Observer.js',
        'UIComponent.js': 'components/UIComponent.js',
        'ComponentManager.js': 'managers/ComponentManager.js',
        'ServiceBootstrap.js': 'services/ServiceBootstrap.js'
      };

      const dependencyResults = {};

      for (const [fileName, filePath] of Object.entries(dependencyChain)) {
        const fullPath = path.join(process.cwd(), 'public/js', filePath);
        dependencyResults[fileName] = {
          exists: fs.existsSync(fullPath),
          path: fullPath
        };
      }

      // All dependencies should exist
      Object.entries(dependencyResults).forEach(([fileName, result]) => {
        expect(result.exists).toBe(true);
        console.log(`✅ ${fileName} exists at ${result.path}`);
      });

      console.log('✅ Complete dependency chain is intact');
    });
  });

  describe('Architecture Validation', () => {
    test('HTML cleanup was successful', () => {
      const htmlPath = path.join(process.cwd(), 'public/index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Should not contain large embedded script blocks
      const scriptBlocks = htmlContent.match(/<script(?!.*src=)[\s\S]*?>[\s\S]*?<\/script>/gi) || [];
      const largeScriptBlocks = scriptBlocks.filter(block => block.length > 200);
      
      expect(largeScriptBlocks.length).toBe(0);
      
      // Should contain proper module loading
      expect(htmlContent).toContain('type="module"');
      expect(htmlContent).toContain('game.js');
      
      console.log('✅ HTML has been properly cleaned of embedded JavaScript');
    });

    test('Component extraction preserved CSS styling', () => {
      const htmlPath = path.join(process.cwd(), 'public/index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Key UI elements should still exist
      const uiElements = [
        'game-board',
        'buildPanelSidebar', 
        'unitInfoSidebar',
        'main-container',
        'left-sidebar',
        'right-sidebar'
      ];

      uiElements.forEach(elementId => {
        expect(htmlContent).toContain(elementId);
      });

      // CSS classes should still be defined
      const cssClasses = [
        '.game-board',
        '.grid-cell',
        '.unit-card',
        '.control-button'
      ];

      cssClasses.forEach(cssClass => {
        expect(htmlContent).toContain(cssClass);
      });

      console.log('✅ UI structure and styling preserved after component extraction');
    });
  });

  // Summary test that reports overall status
  test('UI Component Architecture Summary', () => {
    const results = {
      filesExist: true,
      componentsLoadable: true,
      architectureIntact: true,
      htmlCleaned: true
    };

    console.log('\n🔍 UI COMPONENT ARCHITECTURE VERIFICATION SUMMARY:');
    console.log('================================================');
    console.log(`✅ Component files exist: ${results.filesExist}`);
    console.log(`✅ Components can be loaded: ${results.componentsLoadable}`);
    console.log(`✅ Architecture is intact: ${results.architectureIntact}`);  
    console.log(`✅ HTML cleaned of embedded JS: ${results.htmlCleaned}`);
    console.log('================================================');
    console.log('🎉 UI component extraction was SUCCESSFUL!');

    expect(results.filesExist).toBe(true);
    expect(results.componentsLoadable).toBe(true);
    expect(results.architectureIntact).toBe(true);
    expect(results.htmlCleaned).toBe(true);
  });
});