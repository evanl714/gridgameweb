import * as Sentry from '@sentry/node';
import logger from './Logger.js';
import config from '../config/environment.js';

/**
 * Error tracking and monitoring module using Sentry
 * Provides structured error reporting, performance monitoring, and user context tracking
 */
class ErrorTracking {
  constructor() {
    this.initialized = false;
    this.config = config.monitoring.errorTracking;
    
    if (this.config.enabled && this.config.dsn) {
      this.initializeSentry();
    }
  }

  /**
   * Initialize Sentry SDK
   */
  initializeSentry() {
    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        sampleRate: this.config.sampleRate,
        
        // Performance Monitoring
        tracesSampleRate: config.app.isProduction ? 0.1 : 1.0,
        
        // Capture uncaught exceptions and unhandled promise rejections
        integrations: [
          Sentry.httpIntegration({
            tracing: true,
          }),
          Sentry.onUncaughtExceptionIntegration({
            exitEvenIfOtherHandlersAreRegistered: false,
          }),
          Sentry.onUnhandledRejectionIntegration({
            mode: 'warn',
          }),
        ],

        // Filter out sensitive data
        beforeSend: (event, hint) => {
          return this.filterSensitiveData(event, hint);
        },

        // Add context to all events
        beforeSendTransaction: (event) => {
          return this.addContextToTransaction(event);
        },
      });

      this.initialized = true;
      logger.info('Sentry error tracking initialized', {
        environment: this.config.environment,
        release: this.config.release,
        sampleRate: this.config.sampleRate
      });

    } catch (error) {
      logger.error('Failed to initialize Sentry', { 
        error: error.message,
        dsn: this.config.dsn ? 'configured' : 'missing'
      });
    }
  }

  /**
   * Capture an exception with context
   */
  captureException(error, context = {}) {
    if (!this.initialized) {
      logger.error('Error tracking not initialized, logging error locally', { 
        error: error.message,
        stack: error.stack,
        context 
      });
      return;
    }

    try {
      // Add custom context and tags
      Sentry.withScope((scope) => {
        // Add custom tags
        if (context.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value);
          });
        }

        // Add extra context
        if (context.extra) {
          Object.entries(context.extra).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }

        // Set user context if available
        if (context.user) {
          scope.setUser(context.user);
        }

        // Set request context if available
        if (context.request) {
          scope.setContext('request', {
            method: context.request.method,
            path: context.request.path,
            ip: context.request.ip,
            userAgent: context.request.userAgent,
            headers: this.sanitizeHeaders(context.request.headers)
          });
        }

        // Set level
        if (context.level) {
          scope.setLevel(context.level);
        }

        Sentry.captureException(error);
      });

      logger.error('Exception captured by Sentry', {
        error: error.message,
        errorId: Sentry.lastEventId(),
        context: context.tags || {}
      });

    } catch (sentryError) {
      logger.error('Failed to capture exception in Sentry', {
        originalError: error.message,
        sentryError: sentryError.message
      });
    }
  }

  /**
   * Capture a message with context
   */
  captureMessage(message, level = 'info', context = {}) {
    if (!this.initialized) {
      logger[level](`Error tracking not initialized: ${message}`, context);
      return;
    }

    try {
      Sentry.withScope((scope) => {
        // Add custom context
        if (context.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value);
          });
        }

        if (context.extra) {
          Object.entries(context.extra).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }

        if (context.user) {
          scope.setUser(context.user);
        }

        scope.setLevel(level);
        Sentry.captureMessage(message, level);
      });

    } catch (error) {
      logger.error('Failed to capture message in Sentry', {
        message,
        error: error.message
      });
    }
  }

  /**
   * Add breadcrumb for tracking events leading to errors
   */
  addBreadcrumb(message, category = 'general', level = 'info', data = {}) {
    if (!this.initialized) return;

    try {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data: this.sanitizeData(data),
        timestamp: Date.now() / 1000
      });
    } catch (error) {
      logger.error('Failed to add breadcrumb to Sentry', {
        message,
        category,
        error: error.message
      });
    }
  }

  /**
   * Set user context for tracking
   */
  setUser(userInfo) {
    if (!this.initialized) return;

    try {
      Sentry.setUser({
        id: userInfo.id,
        username: userInfo.username,
        email: userInfo.email,
        ip_address: userInfo.ip
      });
    } catch (error) {
      logger.error('Failed to set user context in Sentry', {
        userId: userInfo.id,
        error: error.message
      });
    }
  }

  /**
   * Set custom tags for categorizing events
   */
  setTag(key, value) {
    if (!this.initialized) return;

    try {
      Sentry.setTag(key, value);
    } catch (error) {
      logger.error('Failed to set tag in Sentry', {
        key,
        value,
        error: error.message
      });
    }
  }

  /**
   * Create Express error handler middleware
   */
  createExpressErrorHandler() {
    return (error, req, res, next) => {
      // Capture the error with request context
      this.captureException(error, {
        tags: {
          component: 'express',
          method: req.method,
          path: req.path,
          statusCode: error.status || 500
        },
        extra: {
          requestId: req.id,
          body: this.sanitizeData(req.body),
          query: req.query,
          params: req.params
        },
        request: {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          headers: req.headers
        },
        level: error.status >= 500 ? 'error' : 'warning'
      });

      // Continue with normal error handling
      next(error);
    };
  }

  /**
   * Create request tracing middleware
   */
  createRequestTracingMiddleware() {
    return (req, res, next) => {
      if (!this.initialized) return next();

      // Start a transaction for performance monitoring
      const transaction = Sentry.startTransaction({
        op: 'http.server',
        name: `${req.method} ${req.route?.path || req.path}`,
        data: {
          method: req.method,
          path: req.path,
          ip: req.ip
        }
      });

      // Set the transaction on the scope
      Sentry.getCurrentScope().setSpan(transaction);

      // Add breadcrumb for request
      this.addBreadcrumb(
        `${req.method} ${req.path}`,
        'http',
        'info',
        {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      // Finish transaction on response
      res.on('finish', () => {
        transaction.setHttpStatus(res.statusCode);
        transaction.setData('responseTime', Date.now() - req.startTime);
        transaction.finish();
      });

      next();
    };
  }

  /**
   * Filter sensitive data from events
   */
  filterSensitiveData(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers['x-api-key'];
    }

    // Remove sensitive data from extra context
    if (event.extra) {
      delete event.extra.password;
      delete event.extra.token;
      delete event.extra.secret;
    }

    // Filter out health check errors (they're noisy)
    if (event.request?.url?.includes('/api/health')) {
      return null;
    }

    return event;
  }

  /**
   * Add context to transactions
   */
  addContextToTransaction(event) {
    // Add application context
    event.contexts = event.contexts || {};
    event.contexts.app = {
      name: config.app.name,
      version: config.app.version,
      environment: config.app.environment
    };

    event.contexts.runtime = {
      name: 'node',
      version: process.version
    };

    return event;
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }

  /**
   * Sanitize data to remove sensitive fields
   */
  sanitizeData(data) {
    if (typeof data !== 'object' || data === null) return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Flush pending events (useful for graceful shutdown)
   */
  async flush(timeout = 2000) {
    if (!this.initialized) return;

    try {
      await Sentry.flush(timeout);
      logger.info('Sentry events flushed successfully');
    } catch (error) {
      logger.error('Failed to flush Sentry events', { error: error.message });
    }
  }

  /**
   * Check if error tracking is enabled and initialized
   */
  isEnabled() {
    return this.initialized;
  }
}

// Export singleton instance
const errorTracking = new ErrorTracking();
export default errorTracking;