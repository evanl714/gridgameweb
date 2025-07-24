import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper function to parse boolean environment variables
const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// Helper function to parse comma-separated strings
const parseStringArray = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

// Define environment configuration
const environment = process.env.NODE_ENV || 'development';
const isDevelopment = environment === 'development';
const isProduction = environment === 'production';
const isTest = environment === 'test';

const config = {
  // Application settings
  app: {
    name: 'Grid Game Web',
    version: process.env.npm_package_version || '1.0.0',
    environment,
    isDevelopment,
    isProduction,
    isTest,
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
  },

  // Database configuration
  database: {
    path: process.env.DB_PATH || './game.db',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 1, // SQLite is single connection
    enableWAL: parseBoolean(process.env.DB_ENABLE_WAL, true),
    backupEnabled: parseBoolean(process.env.DB_BACKUP_ENABLED, isProduction),
    backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
  },

  // Security configuration
  security: {
    // CORS settings
    cors: {
      enabled: parseBoolean(process.env.CORS_ENABLED, true),
      origins: isProduction 
        ? parseStringArray(process.env.FRONTEND_URLS, ['https://gridgameweb-production.up.railway.app'])
        : ['*'], // Development: allow all
      credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
    },

    // Rate limiting settings
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
      general: {
        max: isProduction ? 100 : 1000,
        message: 'Too many requests from this IP, please try again later.',
      },
      api: {
        max: isProduction ? 60 : 500,
        message: 'Too many API requests from this IP, please try again later.',
      },
      admin: {
        windowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW) || 60 * 60 * 1000, // 1 hour
        max: isProduction ? 10 : 100,
        message: 'Too many admin requests from this IP, please try again later.',
      },
    },

    // Security headers (helmet.js)
    helmet: {
      enabled: parseBoolean(process.env.HELMET_ENABLED, true),
      contentSecurityPolicy: {
        enabled: parseBoolean(process.env.CSP_ENABLED, isProduction),
        reportOnly: parseBoolean(process.env.CSP_REPORT_ONLY, false),
      },
      crossOriginEmbedderPolicy: parseBoolean(process.env.COEP_ENABLED, false),
    },

    // Request size limits
    requestLimits: {
      jsonLimit: process.env.JSON_LIMIT || '10mb', // For large game states
      urlEncodedLimit: process.env.URL_ENCODED_LIMIT || '10mb',
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: process.env.LOG_FORMAT || (isProduction ? 'json' : 'colorized'),
    enableFileLogging: parseBoolean(process.env.LOG_FILE_ENABLED, isProduction),
    logDirectory: process.env.LOG_DIRECTORY || path.join(__dirname, '../../logs'),
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '5MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    enableConsole: parseBoolean(process.env.LOG_CONSOLE_ENABLED, true),
    
    // Security logging
    enableSecurityLogs: parseBoolean(process.env.LOG_SECURITY_ENABLED, true),
    securityLogFile: process.env.LOG_SECURITY_FILE || 'security.log',
    securityLogMaxFiles: parseInt(process.env.LOG_SECURITY_MAX_FILES) || 10,
  },

  // Monitoring and health checks
  monitoring: {
    healthCheck: {
      enabled: parseBoolean(process.env.HEALTH_CHECK_ENABLED, true),
      endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/api/health',
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
    },
    
    metrics: {
      enabled: parseBoolean(process.env.METRICS_ENABLED, isProduction),
      collectInterval: parseInt(process.env.METRICS_COLLECT_INTERVAL) || 30000, // 30 seconds
      retentionDays: parseInt(process.env.METRICS_RETENTION_DAYS) || 7,
    },

    // Error tracking
    errorTracking: {
      enabled: parseBoolean(process.env.ERROR_TRACKING_ENABLED, false), // Disabled by default, requires explicit enable
      dsn: process.env.SENTRY_DSN || '',
      environment: environment,
      release: process.env.npm_package_version || '1.0.0',
      sampleRate: parseFloat(process.env.ERROR_SAMPLE_RATE) || 1.0,
    },
  },

  // Game-specific settings
  game: {
    maxGameStateSize: process.env.MAX_GAME_STATE_SIZE || '5MB',
    autoSaveInterval: parseInt(process.env.AUTO_SAVE_INTERVAL) || 5 * 60 * 1000, // 5 minutes
    maxGamesPerPlayer: parseInt(process.env.MAX_GAMES_PER_PLAYER) || 100,
    gameCleanupInterval: parseInt(process.env.GAME_CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
    
    // Player settings
    maxPlayersTotal: parseInt(process.env.MAX_PLAYERS_TOTAL) || 10000,
    playerInactivityThreshold: parseInt(process.env.PLAYER_INACTIVITY_THRESHOLD) || 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // Railway deployment specific
  railway: {
    enabled: parseBoolean(process.env.RAILWAY_ENVIRONMENT),
    projectId: process.env.RAILWAY_PROJECT_ID,
    serviceId: process.env.RAILWAY_SERVICE_ID,
    deploymentUrl: process.env.RAILWAY_PUBLIC_DOMAIN,
    staticUrl: process.env.RAILWAY_STATIC_URL,
  },
};

// Validation function to check required environment variables
export const validateConfig = () => {
  const errors = [];

  // Check critical settings
  if (isProduction) {
    // CORS origins validation - allow default Railway URL if FRONTEND_URLS not explicitly set
    const corsOrigins = config.security.cors.origins;
    if (!corsOrigins.length || (corsOrigins.length === 1 && corsOrigins[0] === '*')) {
      errors.push('FRONTEND_URLS must be set in production (wildcards not allowed)');
    }

    // Error tracking validation - only require SENTRY_DSN if error tracking is explicitly enabled
    if (config.monitoring.errorTracking.enabled && !config.monitoring.errorTracking.dsn) {
      errors.push('SENTRY_DSN must be set when ERROR_TRACKING_ENABLED=true');
    }
  }

  // Check database path is valid
  if (!config.database.path) {
    errors.push('DB_PATH must be specified');
  }

  // Check port is valid
  if (isNaN(config.app.port) || config.app.port <= 0 || config.app.port > 65535) {
    errors.push('PORT must be a valid port number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper function to get configuration for a specific section
export const getConfig = (section = null) => {
  if (section) {
    return config[section] || {};
  }
  return config;
};

// Helper function to check if we're in a specific environment
export const isEnvironment = (env) => config.app.environment === env;

// Export the main configuration
export default config;