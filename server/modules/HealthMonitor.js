import os from 'os';
import process from 'process';
import dbConnection from '../database/connection.js';
import logger from './Logger.js';
import config from '../config/environment.js';

/**
 * Comprehensive health monitoring and metrics collection system
 * Provides detailed system health, security metrics, and performance data
 */
class HealthMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestMetrics = {
      total: 0,
      successful: 0,
      failed: 0,
      rateLimited: 0,
      averageResponseTime: 0,
      responseTimeSum: 0
    };
    this.securityMetrics = {
      totalSecurityEvents: 0,
      rateLimitHits: 0,
      suspiciousRequests: 0,
      blockedRequests: 0,
      lastSecurityEvent: null
    };
    this.performanceMetrics = {
      cpuUsage: [],
      memoryUsage: [],
      lastCollection: Date.now()
    };
    
    // Start metrics collection if enabled
    if (config.monitoring.metrics.enabled) {
      this.startMetricsCollection();
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus() {
    try {
      const health = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        version: config.app.version,
        environment: config.app.environment,
        
        // Database health
        database: await this.getDatabaseHealth(),
        
        // System health
        system: this.getSystemHealth(),
        
        // Security status
        security: this.getSecurityStatus(),
        
        // Performance metrics
        performance: this.getPerformanceMetrics(),
        
        // Configuration status
        configuration: this.getConfigurationStatus()
      };

      // Determine overall health status
      health.status = this.determineOverallHealth(health);
      
      return health;
    } catch (error) {
      logger.error('Health check failed', { error: error.message, stack: error.stack });
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        uptime: this.getUptime()
      };
    }
  }

  /**
   * Get basic health check (lightweight)
   */
  async getBasicHealth() {
    try {
      // Quick database connectivity test
      const db = dbConnection.getDatabase();
      const result = db.prepare('SELECT 1 as test').get();

      return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        database: {
          connected: !!result
        }
      };
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get detailed database health
   */
  async getDatabaseHealth() {
    try {
      const db = dbConnection.getDatabase();
      const stats = dbConnection.getStats();
      
      // Test database operations
      const testResult = db.prepare('SELECT 1 as test').get();
      const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      
      // Get database file size
      const dbInfo = db.prepare('PRAGMA database_list').get();
      
      return {
        connected: !!testResult,
        stats,
        tables: tablesResult.length,
        info: {
          file: dbInfo?.file || 'unknown',
          walMode: stats.walMode || false
        },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get system health metrics
   */
  getSystemHealth() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      nodejs: {
        version: process.version,
        uptime: Math.floor(process.uptime()),
        pid: process.pid,
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: Math.floor(os.uptime()),
        loadAverage: os.loadavg(),
        freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
        totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
        cpuCount: os.cpus().length
      }
    };
  }

  /**
   * Get security status and metrics
   */
  getSecurityStatus() {
    return {
      features: {
        helmet: config.security.helmet.enabled,
        cors: config.security.cors.enabled,
        rateLimiting: true, // Always enabled in our implementation
        structuredLogging: true // Always enabled
      },
      metrics: {
        ...this.securityMetrics,
        rateLimitConfig: {
          general: config.security.rateLimit.general.max,
          api: config.security.rateLimit.api.max,
          admin: config.security.rateLimit.admin.max
        }
      },
      lastSecurityScan: new Date().toISOString()
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      requests: {
        ...this.requestMetrics,
        averageResponseTime: this.requestMetrics.total > 0 
          ? Math.round(this.requestMetrics.responseTimeSum / this.requestMetrics.total)
          : 0
      },
      system: {
        averageCpuUsage: this.getAverageCpuUsage(),
        averageMemoryUsage: this.getAverageMemoryUsage(),
        collectionsCount: this.performanceMetrics.cpuUsage.length
      },
      lastCollection: new Date(this.performanceMetrics.lastCollection).toISOString()
    };
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus() {
    return {
      environment: config.app.environment,
      port: config.app.port,
      features: {
        fileLogging: config.logging.enableFileLogging,
        metricsCollection: config.monitoring.metrics.enabled,
        errorTracking: config.monitoring.errorTracking.enabled,
        railwayDeployment: config.railway.enabled
      },
      database: {
        path: config.database.path,
        backupEnabled: config.database.backupEnabled
      }
    };
  }

  /**
   * Determine overall health status
   */
  determineOverallHealth(health) {
    // Check critical components
    if (!health.database.connected) {
      return 'unhealthy';
    }

    // Check system resources
    const memoryUsagePercent = (health.system.nodejs.memory.heapUsed / health.system.nodejs.memory.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      return 'degraded';
    }

    // Check security events
    if (health.security.metrics.suspiciousRequests > 100) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Record request metrics
   */
  recordRequest(duration, statusCode, rateLimited = false) {
    this.requestMetrics.total++;
    this.requestMetrics.responseTimeSum += duration;
    
    if (rateLimited) {
      this.requestMetrics.rateLimited++;
    } else if (statusCode >= 200 && statusCode < 400) {
      this.requestMetrics.successful++;
    } else {
      this.requestMetrics.failed++;
    }
  }

  /**
   * Record security event
   */
  recordSecurityEvent(type, details = {}) {
    this.securityMetrics.totalSecurityEvents++;
    this.securityMetrics.lastSecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      details
    };

    switch (type) {
      case 'rate_limit':
        this.securityMetrics.rateLimitHits++;
        break;
      case 'suspicious_request':
        this.securityMetrics.suspiciousRequests++;
        break;
      case 'blocked_request':
        this.securityMetrics.blockedRequests++;
        break;
    }
  }

  /**
   * Start automatic metrics collection
   */
  startMetricsCollection() {
    const interval = config.monitoring.metrics.collectInterval;
    
    setInterval(() => {
      this.collectSystemMetrics();
    }, interval);

    logger.info('Metrics collection started', { 
      interval: `${interval}ms`,
      retentionDays: config.monitoring.metrics.retentionDays 
    });
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Store metrics with timestamp
    const now = Date.now();
    this.performanceMetrics.memoryUsage.push({
      timestamp: now,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss
    });
    
    this.performanceMetrics.cpuUsage.push({
      timestamp: now,
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    // Clean old metrics (keep last 24 hours worth)
    const retentionTime = config.monitoring.metrics.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = now - retentionTime;
    
    this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.filter(
      m => m.timestamp > cutoff
    );
    this.performanceMetrics.cpuUsage = this.performanceMetrics.cpuUsage.filter(
      m => m.timestamp > cutoff
    );

    this.performanceMetrics.lastCollection = now;
  }

  /**
   * Get uptime in human readable format
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return {
      ms: uptimeMs,
      human: `${hours}h ${minutes}m ${secs}s`
    };
  }

  /**
   * Get average CPU usage
   */
  getAverageCpuUsage() {
    if (this.performanceMetrics.cpuUsage.length === 0) return null;
    
    const total = this.performanceMetrics.cpuUsage.reduce((sum, cpu) => 
      sum + cpu.user + cpu.system, 0
    );
    return Math.round(total / this.performanceMetrics.cpuUsage.length);
  }

  /**
   * Get average memory usage
   */
  getAverageMemoryUsage() {
    if (this.performanceMetrics.memoryUsage.length === 0) return null;
    
    const total = this.performanceMetrics.memoryUsage.reduce((sum, mem) => 
      sum + mem.heapUsed, 0
    );
    return Math.round((total / this.performanceMetrics.memoryUsage.length) / 1024 / 1024); // MB
  }
}

// Export singleton instance
const healthMonitor = new HealthMonitor();
export default healthMonitor;