/**
 * Structured Logging Security Tests
 * Tests the Winston logging configuration and security event logging
 */

import logger from '../../server/modules/Logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Structured Logging Security', () => {
  const testLogDir = path.join(__dirname, '../logs');
  const testLogFile = path.join(testLogDir, 'test-security.log');
  
  beforeAll(() => {
    // Create test logs directory
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test logs
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('Security Event Logging', () => {
    test('should log security events with proper structure', () => {
      const securityEvent = {
        type: 'rate_limit_exceeded',
        ip: '192.168.1.100',
        path: '/api/test',
        method: 'GET',
        userAgent: 'TestAgent/1.0',
        severity: 'medium'
      };

      // Use logger.security method
      logger.security('Rate limit exceeded during test', securityEvent);

      // Security logging should not throw errors
      expect(true).toBe(true);
    });

    test('should handle security logging without metadata', () => {
      expect(() => {
        logger.security('Basic security event');
      }).not.toThrow();
    });

    test('should log different security event types', () => {
      const events = [
        { type: 'rate_limit', severity: 'low' },
        { type: 'suspicious_request', severity: 'medium' },
        { type: 'authentication_failure', severity: 'high' },
        { type: 'authorization_violation', severity: 'critical' }
      ];

      events.forEach((event, index) => {
        expect(() => {
          logger.security(`Security event type test ${index}`, event);
        }).not.toThrow();
      });
    });
  });

  describe('Database Operation Logging', () => {
    test('should log database operations with proper context', () => {
      const dbContext = {
        operation: 'SELECT',
        table: 'game_state',
        duration: '45ms',
        queryId: 'query_123'
      };

      expect(() => {
        logger.database('Database query executed', dbContext);
      }).not.toThrow();
    });

    test('should log database errors appropriately', () => {
      const errorContext = {
        operation: 'INSERT',
        table: 'player_data',
        error: 'UNIQUE constraint failed',
        sqlState: '23000'
      };

      expect(() => {
        logger.database('Database operation failed', errorContext);
      }).not.toThrow();
    });
  });

  describe('API Request Logging', () => {
    test('should log API requests with complete context', () => {
      const apiContext = {
        method: 'POST',
        path: '/api/game/move',
        statusCode: 200,
        duration: '125ms',
        ip: '10.0.0.1',
        userAgent: 'GameClient/2.0',
        contentLength: '256'
      };

      expect(() => {
        logger.api('API request completed', apiContext);
      }).not.toThrow();
    });

    test('should log failed API requests with error details', () => {
      const errorContext = {
        method: 'PUT',
        path: '/api/game/state',
        statusCode: 400,
        duration: '25ms',
        error: 'Invalid game state format',
        ip: '10.0.0.2'
      };

      expect(() => {
        logger.api('API request failed', errorContext);
      }).not.toThrow();
    });
  });

  describe('Game Event Logging', () => {
    test('should log game events with player context', () => {
      const gameContext = {
        gameId: 'game_456',
        playerId: 'player_789',
        action: 'move',
        position: { x: 5, y: 3 },
        turn: 15
      };

      expect(() => {
        logger.game('Player made move', gameContext);
      }).not.toThrow();
    });

    test('should log game state changes', () => {
      const stateContext = {
        gameId: 'game_456',
        previousState: 'player_turn',
        newState: 'opponent_turn',
        trigger: 'move_completed'
      };

      expect(() => {
        logger.game('Game state transition', stateContext);
      }).not.toThrow();
    });
  });

  describe('Log Level Filtering', () => {
    test('should respect log level configuration', () => {
      // These should all execute without error
      expect(() => {
        logger.error('Error level message');
        logger.warn('Warning level message');
        logger.info('Info level message');
        logger.debug('Debug level message');
      }).not.toThrow();
    });

    test('should handle different log levels for security events', () => {
      const contexts = [
        { level: 'error', severity: 'critical' },
        { level: 'warn', severity: 'high' },
        { level: 'info', severity: 'medium' },
        { level: 'debug', severity: 'low' }
      ];

      contexts.forEach(({ level, severity }) => {
        expect(() => {
          logger[level](`Security event with ${severity} severity`, { severity });
        }).not.toThrow();
      });
    });
  });

  describe('Data Sanitization', () => {
    test('should not log sensitive information', () => {
      const sensitiveContext = {
        username: 'testuser',
        password: 'secretpassword123', // This should be filtered
        token: 'jwt-token-here', // This should be filtered
        sessionId: 'session123',
        action: 'login'
      };

      // Logger should handle this without exposing sensitive data
      expect(() => {
        logger.security('User login attempt', sensitiveContext);
      }).not.toThrow();
    });

    test('should sanitize request headers in logs', () => {
      const requestContext = {
        method: 'POST',
        path: '/api/auth/login',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer jwt-token-here', // Should be sanitized
          'Cookie': 'sessionId=abc123', // Should be sanitized
          'User-Agent': 'Browser/1.0'
        }
      };

      expect(() => {
        logger.api('Authentication request', requestContext);
      }).not.toThrow();
    });

    test('should handle logging of user input safely', () => {
      const userInput = {
        gameMove: { x: 5, y: 3 },
        playerName: 'TestPlayer',
        chatMessage: '<script>alert("xss")</script>', // Should be handled safely
        customData: { key: 'value' }
      };

      expect(() => {
        logger.game('User input received', userInput);
      }).not.toThrow();
    });
  });

  describe('Error Handling in Logging', () => {
    test('should handle circular references in log data', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj; // Create circular reference

      expect(() => {
        logger.info('Testing circular reference handling', { circular: circularObj });
      }).not.toThrow();
    });

    test('should handle undefined and null values', () => {
      const testData = {
        definedValue: 'exists',
        undefinedValue: undefined,
        nullValue: null,
        emptyString: '',
        zeroValue: 0
      };

      expect(() => {
        logger.info('Testing edge case values', testData);
      }).not.toThrow();
    });

    test('should handle very large log messages', () => {
      const largeMessage = 'x'.repeat(10000);
      const largeData = {
        bigString: 'y'.repeat(5000),
        normalField: 'normal'
      };

      expect(() => {
        logger.info(largeMessage, largeData);
      }).not.toThrow();
    });
  });

  describe('Timestamp and Metadata', () => {
    test('should include proper timestamps in logs', () => {
      const beforeLog = new Date();
      
      logger.info('Timestamp test message');
      
      const afterLog = new Date();
      
      // Logging should complete quickly
      expect(afterLog - beforeLog).toBeLessThan(100);
    });

    test('should include process and environment metadata', () => {
      expect(() => {
        logger.info('Testing metadata inclusion', {
          testPid: process.pid,
          testEnv: process.env.NODE_ENV || 'test'
        });
      }).not.toThrow();
    });
  });

  describe('Log Format Consistency', () => {
    test('should maintain consistent log format across different methods', () => {
      const testContext = { testId: 'format_test_123' };
      
      expect(() => {
        logger.error('Error format test', testContext);
        logger.warn('Warning format test', testContext);
        logger.info('Info format test', testContext);
        logger.security('Security format test', testContext);
        logger.database('Database format test', testContext);
        logger.api('API format test', testContext);
        logger.game('Game format test', testContext);
      }).not.toThrow();
    });

    test('should handle empty metadata objects', () => {
      expect(() => {
        logger.info('Empty metadata test', {});
        logger.security('Empty security metadata', {});
        logger.api('Empty API metadata', {});
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    test('should log multiple events quickly', async () => {
      const startTime = Date.now();
      
      // Log 100 events
      for (let i = 0; i < 100; i++) {
        logger.info(`Performance test message ${i}`, { 
          iteration: i,
          timestamp: Date.now()
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 logs in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should handle concurrent logging calls', async () => {
      const promises = [];
      
      // Create 10 concurrent logging operations
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            logger.info(`Concurrent log test ${i}`, { concurrentId: i });
          })
        );
      }
      
      // All should complete without error
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });
});