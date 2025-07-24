import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// Create log format for development (colorized console output)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create log format for production (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine log level based on environment
const logLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Create transports array
const transports = [];

// Console transport (always present)
transports.push(
  new winston.transports.Console({
    level: logLevel(),
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  })
);

// File transports for production
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, '../../logs');
  
  // Combined log (all levels)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'info',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Error log (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Security events log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      level: 'warn',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10, // Keep more security logs
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel(),
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, {
    ...meta,
    category: 'security',
    timestamp: new Date().toISOString(),
  });
};

logger.database = (message, meta = {}) => {
  logger.info(`[DATABASE] ${message}`, {
    ...meta,
    category: 'database',
  });
};

logger.api = (message, meta = {}) => {
  logger.info(`[API] ${message}`, {
    ...meta,
    category: 'api',
  });
};

logger.game = (message, meta = {}) => {
  logger.info(`[GAME] ${message}`, {
    ...meta,
    category: 'game',
  });
};

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
  });
}

export default logger;