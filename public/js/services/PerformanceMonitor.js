/**
 * PerformanceMonitor - Client-side performance tracking and monitoring
 * Provides comprehensive performance metrics collection and analysis
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameTime: [],
      operationCounts: new Map(),
      memorySnapshots: [],
      moduleLoadTimes: new Map(),
      renderMetrics: {
        dirtyRegions: 0,
        fullRepaints: 0,
        lastFrameTime: 0
      }
    };
    
    this.isMonitoring = false;
    this.frameStartTime = 0;
    this.performanceObserver = null;
    this.maxMetricsHistory = 100;
    
    this.initializePerformanceObserver();
  }

  initializePerformanceObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.startsWith('module-load-')) {
            const moduleName = entry.name.replace('module-load-', '');
            this.metrics.moduleLoadTimes.set(moduleName, entry.duration);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  startMonitoring() {
    this.isMonitoring = true;
    this.startFrameMonitoring();
    console.log('Performance monitoring started');
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    console.log('Performance monitoring stopped');
  }

  startFrame() {
    if (!this.isMonitoring) return;
    this.frameStartTime = performance.now();
  }

  endFrame() {
    if (!this.isMonitoring || !this.frameStartTime) return;
    
    const frameTime = performance.now() - this.frameStartTime;
    this.metrics.frameTime.push(frameTime);
    this.metrics.renderMetrics.lastFrameTime = frameTime;
    
    // Keep only recent frame times
    if (this.metrics.frameTime.length > this.maxMetricsHistory) {
      this.metrics.frameTime.shift();
    }
    
    // Warn about frames over 60 FPS budget
    if (frameTime > 16.67) {
      console.warn(`Frame exceeded 60 FPS budget: ${frameTime.toFixed(2)}ms`);
    }
    
    this.frameStartTime = 0;
  }

  trackOperation(operationName, duration) {
    if (!this.isMonitoring) return;
    
    if (!this.metrics.operationCounts.has(operationName)) {
      this.metrics.operationCounts.set(operationName, []);
    }
    
    const operations = this.metrics.operationCounts.get(operationName);
    operations.push({
      duration,
      timestamp: Date.now()
    });
    
    // Keep only recent operations
    if (operations.length > this.maxMetricsHistory) {
      operations.shift();
    }
  }

  async profileOperation(operationName, operation) {
    if (!this.isMonitoring) {
      return await operation();
    }
    
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    performance.mark(`${operationName}-start`);
    
    try {
      const result = await operation();
      
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      const duration = endTime - startTime;
      
      performance.mark(`${operationName}-end`);
      performance.measure(operationName, `${operationName}-start`, `${operationName}-end`);
      
      this.trackOperation(operationName, duration);
      
      if (startMemory && endMemory) {
        this.metrics.memorySnapshots.push({
          operation: operationName,
          before: startMemory,
          after: endMemory,
          delta: endMemory - startMemory,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error) {
      performance.mark(`${operationName}-error`);
      console.error(`Operation ${operationName} failed:`, error);
      throw error;
    }
  }

  trackModuleLoad(moduleName, loadPromise) {
    if (!this.isMonitoring) return loadPromise;
    
    performance.mark(`module-load-${moduleName}-start`);
    
    return loadPromise.then(
      (result) => {
        performance.mark(`module-load-${moduleName}-end`);
        performance.measure(
          `module-load-${moduleName}`, 
          `module-load-${moduleName}-start`, 
          `module-load-${moduleName}-end`
        );
        return result;
      },
      (error) => {
        performance.mark(`module-load-${moduleName}-error`);
        console.error(`Module load failed for ${moduleName}:`, error);
        throw error;
      }
    );
  }

  trackRenderMetrics(metrics) {
    if (!this.isMonitoring) return;
    
    Object.assign(this.metrics.renderMetrics, metrics);
  }

  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return null;
  }

  takeMemorySnapshot(label = 'snapshot') {
    if (!this.isMonitoring) return;
    
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage) {
      this.metrics.memorySnapshots.push({
        label,
        usage: memoryUsage,
        timestamp: Date.now()
      });
      
      // Keep only recent snapshots
      if (this.metrics.memorySnapshots.length > this.maxMetricsHistory) {
        this.metrics.memorySnapshots.shift();
      }
    }
  }

  getAverageFrameTime() {
    if (this.metrics.frameTime.length === 0) return 0;
    
    const sum = this.metrics.frameTime.reduce((acc, time) => acc + time, 0);
    return sum / this.metrics.frameTime.length;
  }

  getCurrentFPS() {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  getOperationStats(operationName) {
    const operations = this.metrics.operationCounts.get(operationName);
    if (!operations || operations.length === 0) {
      return null;
    }
    
    const durations = operations.map(op => op.duration);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    return {
      count: operations.length,
      average: avg,
      min,
      max,
      total: sum
    };
  }

  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      monitoring: this.isMonitoring,
      frameRate: {
        current: this.getCurrentFPS(),
        average: this.getAverageFrameTime(),
        samples: this.metrics.frameTime.length
      },
      memory: {
        current: this.getMemoryUsage(),
        snapshots: this.metrics.memorySnapshots.length
      },
      operations: {},
      moduleLoads: Object.fromEntries(this.metrics.moduleLoadTimes),
      rendering: { ...this.metrics.renderMetrics }
    };
    
    // Add operation statistics
    for (const [operationName] of this.metrics.operationCounts) {
      report.operations[operationName] = this.getOperationStats(operationName);
    }
    
    return report;
  }

  startFrameMonitoring() {
    if (!this.isMonitoring) return;
    
    const monitor = () => {
      if (!this.isMonitoring) return;
      
      this.takeMemorySnapshot('frame-monitor');
      requestAnimationFrame(monitor);
    };
    
    requestAnimationFrame(monitor);
  }

  clearMetrics() {
    this.metrics = {
      frameTime: [],
      operationCounts: new Map(),
      memorySnapshots: [],
      moduleLoadTimes: new Map(),
      renderMetrics: {
        dirtyRegions: 0,
        fullRepaints: 0,
        lastFrameTime: 0
      }
    };
    console.log('Performance metrics cleared');
  }

  exportMetrics() {
    return {
      timestamp: Date.now(),
      metrics: {
        frameTime: [...this.metrics.frameTime],
        operationCounts: Object.fromEntries(this.metrics.operationCounts),
        memorySnapshots: [...this.metrics.memorySnapshots],
        moduleLoadTimes: Object.fromEntries(this.metrics.moduleLoadTimes),
        renderMetrics: { ...this.metrics.renderMetrics }
      }
    };
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  performanceMonitor.startMonitoring();
}