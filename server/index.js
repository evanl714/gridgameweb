import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { DatabaseManager } from './modules/DatabaseManager.js';
import { ServerLifecycle } from './modules/ServerLifecycle.js';
import logger from './modules/Logger.js';
import healthMonitor from './modules/HealthMonitor.js';
import errorTracking from './modules/ErrorTracking.js';
import config, { validateConfig } from './config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.isValid) {
  logger.error('Configuration validation failed', { errors: configValidation.errors });
  process.exit(1);
}

const app = express();
const port = config.app.port;

// Security Middleware
// Configure helmet.js for security headers
if (config.security.helmet.enabled) {
  const helmetConfig = {
    crossOriginEmbedderPolicy: config.security.helmet.crossOriginEmbedderPolicy
  };

  if (config.security.helmet.contentSecurityPolicy.enabled) {
    helmetConfig.contentSecurityPolicy = {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"], // Allow inline styles and external CSS
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com"], // Allow Tailwind CSS CDN
        imgSrc: ["'self'", "data:", "https:"], // Allow data URLs and HTTPS images
        connectSrc: ["'self'"], // Allow API connections to same origin
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      },
      reportOnly: config.security.helmet.contentSecurityPolicy.reportOnly
    };
  } else {
    helmetConfig.contentSecurityPolicy = false;
  }

  app.use(helmet(helmetConfig));
}

// Rate limiting middleware with security logging
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  limit: config.security.rateLimit.general.max,
  message: {
    error: config.security.rateLimit.general.message,
    retryAfter: `${config.security.rateLimit.windowMs / 60000} minutes`
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === config.monitoring.healthCheck.endpoint,
  // Custom handler for rate limit exceeded (new approach)
  handler: (req, res, next, options) => {
    logger.security('Rate limit exceeded - General', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      limit: options.limit,
      windowMs: options.windowMs
    });
    
    // Record security event
    healthMonitor.recordSecurityEvent('rate_limit', {
      type: 'general',
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit: options.limit
    });
    
    res.status(options.statusCode).json(options.message);
  }
});

// API-specific rate limiting (more restrictive for sensitive operations)
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  limit: config.security.rateLimit.api.max,
  message: {
    error: config.security.rateLimit.api.message,
    retryAfter: `${config.security.rateLimit.windowMs / 60000} minutes`
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.security('Rate limit exceeded - API', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      limit: options.limit,
      windowMs: options.windowMs,
      severity: 'medium'
    });
    
    // Record security event
    healthMonitor.recordSecurityEvent('rate_limit', {
      type: 'api',
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit: options.limit,
      severity: 'medium'
    });
    
    res.status(options.statusCode).json(options.message);
  }
});

// Database admin operations rate limiting (very restrictive)
const adminLimiter = rateLimit({
  windowMs: config.security.rateLimit.admin.windowMs,
  limit: config.security.rateLimit.admin.max,
  message: {
    error: config.security.rateLimit.admin.message,
    retryAfter: `${config.security.rateLimit.admin.windowMs / 3600000} hour(s)`
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.security('Rate limit exceeded - Admin', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      limit: options.limit,
      windowMs: options.windowMs,
      severity: 'high'
    });
    
    // Record security event
    healthMonitor.recordSecurityEvent('rate_limit', {
      type: 'admin',
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit: options.limit,
      severity: 'high'
    });
    
    res.status(options.statusCode).json(options.message);
  }
});

// Apply general rate limiting to all requests
app.use(limiter);

// Apply API-specific rate limiting to API routes
app.use('/api', apiLimiter);

// Apply admin rate limiting to database admin endpoints
app.use('/api/database', adminLimiter);

// CORS Configuration
if (config.security.cors.enabled) {
  const corsOptions = {
    origin: config.security.cors.origins.includes('*') ? true : config.security.cors.origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: config.security.cors.credentials,
    optionsSuccessStatus: 200 // For legacy browser support
  };

  app.use(cors(corsOptions));
}

// Body parsing middleware
app.use(express.json({ limit: config.security.requestLimits.jsonLimit })); // Configurable limit for large game states
app.use(express.urlencoded({ extended: true, limit: config.security.requestLimits.urlEncodedLimit }));

// Error tracking middleware (must be before routes)
if (errorTracking.isEnabled()) {
  app.use(errorTracking.createRequestTracingMiddleware());
}

// Request logging middleware with metrics collection
app.use('/api', (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    // Log the request
    logger[logLevel](`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
      category: 'api-request'
    });
    
    // Record metrics in health monitor
    const isRateLimited = res.statusCode === 429;
    healthMonitor.recordRequest(duration, res.statusCode, isRateLimited);
    
    // Record suspicious activity
    if (res.statusCode === 401 || res.statusCode === 403) {
      healthMonitor.recordSecurityEvent('suspicious_request', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent')
      });
    }
  });
  
  next();
});

// Static file serving
app.use(express.static(path.join(__dirname, '../public')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// API routes
app.use('/', routes);

// Serve the main game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler for non-API routes (serve game page for SPA routing)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Sentry error handler (must be before other error handlers)
if (errorTracking.isEnabled()) {
  app.use(errorTracking.createExpressErrorHandler());
}

// Global error handler
app.use((error, req, res, next) => {
  // Log the error with structured logging
  logger.error('Server Error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: error.status || 500,
    category: 'server-error'
  });

  // Add breadcrumb for error tracking
  if (errorTracking.isEnabled()) {
    errorTracking.addBreadcrumb(
      `Server error: ${error.message}`,
      'error',
      'error',
      {
        path: req.path,
        method: req.method,
        statusCode: error.status || 500
      }
    );
  }

  // Respond to client
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(config.app.isDevelopment && { stack: error.stack })
  });
});

// Create logs directory if file logging is enabled
if (config.logging.enableFileLogging) {
  import('fs').then(fs => {
    try {
      fs.mkdirSync(config.logging.logDirectory, { recursive: true });
      logger.info('Logs directory created', { path: config.logging.logDirectory });
    } catch (error) {
      logger.error('Failed to create logs directory', { 
        error: error.message, 
        path: config.logging.logDirectory 
      });
    }
  });
}

// Log application startup with config information
logger.info('Grid Game server starting up', {
  appName: config.app.name,
  version: config.app.version,
  environment: config.app.environment,
  port: port,
  pid: process.pid,
  nodeVersion: process.version,
  platform: process.platform,
  configValidation: 'passed',
  securityFeatures: {
    helmet: config.security.helmet.enabled,
    cors: config.security.cors.enabled,
    rateLimiting: true,
    structuredLogging: true,
    errorTracking: errorTracking.isEnabled()
  },
  category: 'startup'
});

// Initialize managers and start server
const databaseManager = new DatabaseManager(config.database.path);
const serverLifecycle = new ServerLifecycle(databaseManager);

// Start the server with enhanced logging
serverLifecycle.startServer(app, port);

// Log successful startup
process.nextTick(() => {
  logger.info('Grid Game server started successfully', {
    appName: config.app.name,
    port: port,
    environment: config.app.environment,
    url: `http://localhost:${port}`,
    databasePath: config.database.path,
    deploymentUrl: config.railway.deploymentUrl || 'localhost',
    securityEnabled: true,
    errorTrackingEnabled: errorTracking.isEnabled(),
    category: 'startup'
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  
  // Flush Sentry events before shutdown
  if (errorTracking.isEnabled()) {
    logger.info('Flushing error tracking events...');
    await errorTracking.flush(2000);
  }
  
  logger.info('Graceful shutdown preparations completed');
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown...');
  
  // Flush Sentry events before shutdown
  if (errorTracking.isEnabled()) {
    logger.info('Flushing error tracking events...');
    await errorTracking.flush(2000);
  }
  
  logger.info('Graceful shutdown preparations completed');
});
