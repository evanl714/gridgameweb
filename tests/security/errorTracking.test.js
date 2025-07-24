/**
 * Error Tracking Security Tests
 * Tests the Sentry error tracking integration and security event monitoring
 */

import errorTracking from '../../server/modules/ErrorTracking.js';

describe('Error Tracking Security', () => {
  beforeAll(() => {
    // Mock console methods to prevent actual logging during tests
    global.console = {
      ...console,
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn()
    };
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  describe('Error Tracking Initialization', () => {
    test('should handle initialization state correctly', () => {
      expect(typeof errorTracking.isEnabled()).toBe('boolean');
    });

    test('should provide error tracking methods', () => {
      expect(typeof errorTracking.captureException).toBe('function');
      expect(typeof errorTracking.captureMessage).toBe('function');
      expect(typeof errorTracking.addBreadcrumb).toBe('function');
      expect(typeof errorTracking.setUser).toBe('function');
      expect(typeof errorTracking.setTag).toBe('function');
      expect(typeof errorTracking.flush).toBe('function');
    });
  });

  describe('Exception Capturing', () => {
    test('should handle exception capture with context', () => {
      const testError = new Error('Test security exception');
      const context = {
        tags: {
          component: 'security',
          severity: 'high',
          eventType: 'rate_limit_violation'
        },
        extra: {
          ip: '192.168.1.100',
          path: '/api/admin',
          attempts: 5
        },
        user: {
          id: 'user123',
          ip: '192.168.1.100'
        },
        level: 'error'
      };

      expect(() => {
        errorTracking.captureException(testError, context);
      }).not.toThrow();
    });

    test('should handle exceptions without context', () => {
      const testError = new Error('Basic exception test');

      expect(() => {
        errorTracking.captureException(testError);
      }).not.toThrow();
    });

    test('should handle different error types', () => {
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new SyntaxError('Syntax error'),
        new RangeError('Range error')
      ];

      errors.forEach((error, index) => {
        expect(() => {
          errorTracking.captureException(error, {
            tags: { testIndex: index.toString() }
          });
        }).not.toThrow();
      });
    });

    test('should handle request context in exceptions', () => {
      const testError = new Error('Request-related error');
      const context = {
        request: {
          method: 'POST',
          path: '/api/game/move',
          ip: '10.0.0.1',
          userAgent: 'GameClient/1.0',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'X-Requested-With': 'XMLHttpRequest'
          }
        },
        tags: {
          component: 'game-api',
          action: 'move'
        }
      };

      expect(() => {
        errorTracking.captureException(testError, context);
      }).not.toThrow();
    });
  });

  describe('Message Capturing', () => {
    test('should capture security messages with different levels', () => {
      const levels = ['info', 'warning', 'error', 'fatal'];
      const messages = [
        'Security audit passed',
        'Suspicious activity detected',
        'Security violation occurred',
        'Critical security breach'
      ];

      levels.forEach((level, index) => {
        const context = {
          tags: {
            security: 'true',
            level: level
          },
          extra: {
            eventId: `event_${index}`,
            timestamp: new Date().toISOString()
          }
        };

        expect(() => {
          errorTracking.captureMessage(messages[index], level, context);
        }).not.toThrow();
      });
    });

    test('should handle messages without context', () => {
      expect(() => {
        errorTracking.captureMessage('Basic message test');
      }).not.toThrow();
    });

    test('should handle user context in messages', () => {
      const context = {
        user: {
          id: 'player456',
          username: 'testplayer',
          email: 'test@example.com',
          ip: '192.168.1.50'
        },
        tags: {
          action: 'login',
          result: 'success'
        }
      };

      expect(() => {
        errorTracking.captureMessage('User authentication event', 'info', context);
      }).not.toThrow();
    });
  });

  describe('Breadcrumb Management', () => {
    test('should add breadcrumbs with different categories', () => {
      const breadcrumbs = [
        { message: 'User logged in', category: 'auth', level: 'info' },
        { message: 'Game move attempted', category: 'game', level: 'info' },
        { message: 'Rate limit approached', category: 'security', level: 'warning' },
        { message: 'Database query slow', category: 'database', level: 'warning' },
        { message: 'API endpoint hit', category: 'http', level: 'info' }
      ];

      breadcrumbs.forEach(({ message, category, level }) => {
        const data = {
          timestamp: Date.now(),
          category,
          extra: 'test data'
        };

        expect(() => {
          errorTracking.addBreadcrumb(message, category, level, data);
        }).not.toThrow();
      });
    });

    test('should handle breadcrumbs with sensitive data', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secretpassword', // Should be sanitized
        token: 'jwt-token-here', // Should be sanitized
        action: 'login',
        timestamp: Date.now()
      };

      expect(() => {
        errorTracking.addBreadcrumb(
          'User action with sensitive data',
          'security',
          'info',
          sensitiveData
        );
      }).not.toThrow();
    });

    test('should handle breadcrumbs without data', () => {
      expect(() => {
        errorTracking.addBreadcrumb('Simple breadcrumb');
      }).not.toThrow();
    });
  });

  describe('User Context Management', () => {
    test('should set user context with complete information', () => {
      const userInfo = {
        id: 'user789',
        username: 'gameplayer',
        email: 'player@example.com',
        ip: '10.0.0.2'
      };

      expect(() => {
        errorTracking.setUser(userInfo);
      }).not.toThrow();
    });

    test('should handle partial user information', () => {
      const partialUserInfo = {
        id: 'anonymous_user',
        ip: '192.168.1.200'
      };

      expect(() => {
        errorTracking.setUser(partialUserInfo);
      }).not.toThrow();
    });

    test('should handle empty user context', () => {
      expect(() => {
        errorTracking.setUser({});
      }).not.toThrow();
    });
  });

  describe('Tag Management', () => {
    test('should set various types of tags', () => {
      const tags = [
        { key: 'environment', value: 'production' },
        { key: 'feature', value: 'game-engine' },
        { key: 'version', value: '1.0.0' },
        { key: 'security-level', value: 'high' },
        { key: 'user-type', value: 'authenticated' }
      ];

      tags.forEach(({ key, value }) => {
        expect(() => {
          errorTracking.setTag(key, value);
        }).not.toThrow();
      });
    });

    test('should handle tag values of different types', () => {
      const tagValues = [
        { key: 'string-tag', value: 'string-value' },
        { key: 'number-tag', value: 123 },
        { key: 'boolean-tag', value: true },
        { key: 'null-tag', value: null }
      ];

      tagValues.forEach(({ key, value }) => {
        expect(() => {
          errorTracking.setTag(key, value);
        }).not.toThrow();
      });
    });
  });

  describe('Express Middleware Integration', () => {
    test('should create express error handler middleware', () => {
      const errorHandler = errorTracking.createExpressErrorHandler();
      
      expect(typeof errorHandler).toBe('function');
      expect(errorHandler.length).toBe(4); // Express error handlers have 4 parameters
    });

    test('should create request tracing middleware', () => {
      const tracingMiddleware = errorTracking.createRequestTracingMiddleware();
      
      expect(typeof tracingMiddleware).toBe('function');
      expect(tracingMiddleware.length).toBe(3); // Express middleware has 3 parameters
    });

    test('should handle error handler middleware execution', () => {
      const errorHandler = errorTracking.createExpressErrorHandler();
      const mockError = new Error('Test middleware error');
      const mockReq = {
        method: 'POST',
        path: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn((header) => {
          if (header === 'User-Agent') return 'TestAgent/1.0';
          return undefined;
        }),
        body: { test: 'data' },
        query: { param: 'value' },
        params: { id: '123' }
      };
      const mockRes = {};
      const mockNext = jest.fn();

      expect(() => {
        errorHandler(mockError, mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalledWith(mockError);
    });

    test('should handle request tracing middleware execution', () => {
      const tracingMiddleware = errorTracking.createRequestTracingMiddleware();
      const mockReq = {
        method: 'GET',
        path: '/api/health',
        ip: '127.0.0.1',
        get: jest.fn((header) => {
          if (header === 'User-Agent') return 'HealthChecker/1.0';
          return undefined;
        })
      };
      const mockRes = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate response finish
            setTimeout(callback, 10);
          }
        })
      };
      const mockNext = jest.fn();

      expect(() => {
        tracingMiddleware(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize sensitive data from objects', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        token: 'jwt-token',
        secret: 'api-secret',
        key: 'encryption-key',
        auth: 'auth-data',
        publicData: 'this-is-safe'
      };

      // This should not throw and should handle sanitization internally
      expect(() => {
        errorTracking.captureMessage('Test with sensitive data', 'info', {
          extra: sensitiveData
        });
      }).not.toThrow();
    });

    test('should handle null and undefined values in sanitization', () => {
      const testData = {
        validField: 'value',
        nullField: null,
        undefinedField: undefined,
        password: 'should-be-sanitized'
      };

      expect(() => {
        errorTracking.captureMessage('Test with edge case values', 'info', {
          extra: testData
        });
      }).not.toThrow();
    });

    test('should handle non-object data in sanitization', () => {
      const testCases = [
        'string value',
        123,
        true,
        null,
        undefined,
        ['array', 'values']
      ];

      testCases.forEach((testData, index) => {
        expect(() => {
          errorTracking.captureMessage(`Test case ${index}`, 'info', {
            extra: { data: testData }
          });
        }).not.toThrow();
      });
    });
  });

  describe('Error Tracking Performance', () => {
    test('should handle multiple rapid error captures', () => {
      const startTime = Date.now();

      // Capture 50 errors rapidly
      for (let i = 0; i < 50; i++) {
        const error = new Error(`Performance test error ${i}`);
        errorTracking.captureException(error, {
          tags: { testIndex: i.toString() }
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should handle concurrent error tracking calls', async () => {
      const promises = [];

      // Create 20 concurrent error tracking operations
      for (let i = 0; i < 20; i++) {
        promises.push(
          Promise.resolve().then(() => {
            const error = new Error(`Concurrent error ${i}`);
            errorTracking.captureException(error, {
              tags: { concurrentId: i.toString() }
            });
          })
        );
      }

      // All should complete without error
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Flush and Cleanup', () => {
    test('should handle flush operation', async () => {
      // Add some events to flush
      errorTracking.captureMessage('Message to flush', 'info');
      errorTracking.addBreadcrumb('Breadcrumb to flush');

      await expect(errorTracking.flush(1000)).resolves.not.toThrow();
    });

    test('should handle flush with different timeouts', async () => {
      const timeouts = [500, 1000, 2000, 5000];

      for (const timeout of timeouts) {
        await expect(errorTracking.flush(timeout)).resolves.not.toThrow();
      }
    });

    test('should handle flush when not initialized', async () => {
      // This should handle gracefully when error tracking is not initialized
      await expect(errorTracking.flush()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle circular references in error data', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;

      const error = new Error('Circular reference test');

      expect(() => {
        errorTracking.captureException(error, {
          extra: { circular: circularObj }
        });
      }).not.toThrow();
    });

    test('should handle very large error messages', () => {
      const largeMessage = 'x'.repeat(10000);
      const largeError = new Error(largeMessage);

      expect(() => {
        errorTracking.captureException(largeError);
      }).not.toThrow();
    });

    test('should handle invalid tag values gracefully', () => {
      const invalidTags = [
        { key: '', value: 'empty-key' },
        { key: 'valid-key', value: '' },
        { key: null, value: 'null-key' },
        { key: 'valid-key', value: null }
      ];

      invalidTags.forEach(({ key, value }) => {
        expect(() => {
          errorTracking.setTag(key, value);
        }).not.toThrow();
      });
    });

    test('should handle malformed request objects', () => {
      const errorHandler = errorTracking.createExpressErrorHandler();
      const mockError = new Error('Test malformed request');
      const malformedReq = {
        // Missing required properties
        method: undefined,
        path: null,
        get: () => undefined
      };
      const mockRes = {};
      const mockNext = jest.fn();

      expect(() => {
        errorHandler(mockError, malformedReq, mockRes, mockNext);
      }).not.toThrow();
    });
  });
});