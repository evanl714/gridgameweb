/**
 * Health Monitoring Security Tests
 * Tests the health monitoring system and security metrics collection
 */

import request from 'supertest';
import express from 'express';
import healthMonitor from '../../server/modules/HealthMonitor.js';

describe('Health Monitoring Security', () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();
    
    // Add health monitoring routes
    app.get('/api/health', (req, res) => {
      const health = healthMonitor.getHealthStatus();
      res.json(health);
    });

    app.get('/api/health/detailed', (req, res) => {
      const detailedHealth = healthMonitor.getDetailedHealthStatus();
      res.json(detailedHealth);
    });

    app.get('/api/health/security', (req, res) => {
      const securityStatus = healthMonitor.getSecurityStatus();
      res.json(securityStatus);
    });

    app.get('/api/health/performance', (req, res) => {
      const performanceMetrics = healthMonitor.getPerformanceMetrics();
      res.json(performanceMetrics);
    });

    // Test endpoint for generating security events
    app.post('/api/test/security-event', (req, res) => {
      const { type, data } = req.body;
      healthMonitor.recordSecurityEvent(type, data);
      res.json({ message: 'Security event recorded' });
    });

    // Test endpoint for generating requests
    app.get('/api/test/request', (req, res) => {
      const start = Date.now();
      setTimeout(() => {
        const duration = Date.now() - start;
        healthMonitor.recordRequest(duration, 200, false);
        res.json({ message: 'Request recorded', duration });
      }, Math.random() * 100); // Random delay 0-100ms
    });

    server = app.listen(0);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Reset health monitor metrics before each test
    healthMonitor.resetMetrics();
  });

  describe('Basic Health Status', () => {
    test('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.uptime).toBe('string');
    });

    test('should include proper timestamp format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    test('should provide uptime in readable format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.uptime).toMatch(/\d+:\d+:\d+/); // Format: HH:MM:SS
    });
  });

  describe('Detailed Health Status', () => {
    test('should return comprehensive health information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('security');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('configuration');
    });

    test('should include database health status', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.database).toHaveProperty('responseTime');
      expect(response.body.database).toHaveProperty('status');
      
      expect(typeof response.body.database.connected).toBe('boolean');
      expect(typeof response.body.database.responseTime).toBe('string');
      expect(typeof response.body.database.status).toBe('string');
    });

    test('should include system resource information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('nodeVersion');
      
      expect(response.body.system.memory).toHaveProperty('used');
      expect(response.body.system.memory).toHaveProperty('free');
      expect(response.body.system.memory).toHaveProperty('total');
      expect(response.body.system.memory).toHaveProperty('percentage');
    });
  });

  describe('Security Status Monitoring', () => {
    test('should return security metrics', async () => {
      const response = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(response.body).toHaveProperty('rateLimitViolations');
      expect(response.body).toHaveProperty('suspiciousRequests');
      expect(response.body).toHaveProperty('recentSecurityEvents');
      expect(response.body).toHaveProperty('securityScore');
      expect(response.body).toHaveProperty('lastSecurityEvent');
    });

    test('should track rate limit violations', async () => {
      // Record a rate limit violation
      await request(app)
        .post('/api/test/security-event')
        .send({
          type: 'rate_limit',
          data: {
            ip: '192.168.1.100',
            path: '/api/test',
            severity: 'medium'
          }
        })
        .expect(200);

      const response = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(response.body.rateLimitViolations).toBeGreaterThan(0);
      expect(response.body.recentSecurityEvents).toHaveLength(1);
      expect(response.body.recentSecurityEvents[0]).toHaveProperty('type', 'rate_limit');
    });

    test('should track suspicious requests', async () => {
      // Record a suspicious request
      await request(app)
        .post('/api/test/security-event')
        .send({
          type: 'suspicious_request',
          data: {
            ip: '10.0.0.1',
            path: '/api/admin',
            userAgent: 'SuspiciousBot/1.0',
            severity: 'high'
          }
        })
        .expect(200);

      const response = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(response.body.suspiciousRequests).toBeGreaterThan(0);
      expect(response.body.recentSecurityEvents[0]).toHaveProperty('type', 'suspicious_request');
    });

    test('should calculate security score based on events', async () => {
      // Record multiple security events
      const events = [
        { type: 'rate_limit', data: { severity: 'low' } },
        { type: 'suspicious_request', data: { severity: 'medium' } },
        { type: 'authentication_failure', data: { severity: 'high' } }
      ];

      for (const event of events) {
        await request(app)
          .post('/api/test/security-event')
          .send(event)
          .expect(200);
      }

      const response = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(response.body.securityScore).toBeDefined();
      expect(typeof response.body.securityScore).toBe('number');
      expect(response.body.securityScore).toBeGreaterThanOrEqual(0);
      expect(response.body.securityScore).toBeLessThanOrEqual(100);
    });

    test('should track last security event timestamp', async () => {
      const beforeEvent = Date.now();
      
      await request(app)
        .post('/api/test/security-event')
        .send({
          type: 'test_event',
          data: { testData: 'value' }
        })
        .expect(200);

      const response = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(response.body.lastSecurityEvent).toBeDefined();
      const eventTime = new Date(response.body.lastSecurityEvent).getTime();
      expect(eventTime).toBeGreaterThanOrEqual(beforeEvent);
    });
  });

  describe('Performance Metrics', () => {
    test('should return performance metrics', async () => {
      const response = await request(app)
        .get('/api/health/performance')
        .expect(200);

      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('requestCount');
      expect(response.body).toHaveProperty('errorRate');
      expect(response.body).toHaveProperty('rateLimitedRequests');
      expect(response.body).toHaveProperty('recentRequests');
    });

    test('should track request performance', async () => {
      // Make several test requests
      const requestPromises = [];
      for (let i = 0; i < 5; i++) {
        requestPromises.push(
          request(app).get('/api/test/request').expect(200)
        );
      }

      await Promise.all(requestPromises);

      const response = await request(app)
        .get('/api/health/performance')
        .expect(200);

      expect(response.body.requestCount).toBeGreaterThanOrEqual(5);
      expect(response.body.averageResponseTime).toBeGreaterThan(0);
      expect(response.body.recentRequests).toBeInstanceOf(Array);
      expect(response.body.recentRequests.length).toBeGreaterThan(0);
    });

    test('should calculate error rate correctly', async () => {
      // Record some successful requests
      healthMonitor.recordRequest(100, 200, false);
      healthMonitor.recordRequest(150, 200, false);
      
      // Record some error requests
      healthMonitor.recordRequest(50, 500, false);
      healthMonitor.recordRequest(75, 404, false);

      const response = await request(app)
        .get('/api/health/performance')
        .expect(200);

      expect(response.body.errorRate).toBeDefined();
      expect(typeof response.body.errorRate).toBe('number');
      expect(response.body.errorRate).toBeGreaterThan(0);
      expect(response.body.errorRate).toBeLessThanOrEqual(100);
    });

    test('should track rate limited requests separately', async () => {
      // Record rate limited requests
      healthMonitor.recordRequest(25, 429, true);
      healthMonitor.recordRequest(30, 429, true);

      const response = await request(app)
        .get('/api/health/performance')
        .expect(200);

      expect(response.body.rateLimitedRequests).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Request Recording', () => {
    test('should record request metrics correctly', () => {
      const duration = 150;
      const statusCode = 200;
      const isRateLimited = false;

      expect(() => {
        healthMonitor.recordRequest(duration, statusCode, isRateLimited);
      }).not.toThrow();
    });

    test('should handle edge case durations', () => {
      const testCases = [0, 1, 5000, 10000]; // 0ms to 10s

      testCases.forEach(duration => {
        expect(() => {
          healthMonitor.recordRequest(duration, 200, false);
        }).not.toThrow();
      });
    });

    test('should handle various status codes', () => {
      const statusCodes = [200, 201, 301, 400, 401, 403, 404, 429, 500, 502, 503];

      statusCodes.forEach(statusCode => {
        expect(() => {
          healthMonitor.recordRequest(100, statusCode, false);
        }).not.toThrow();
      });
    });
  });

  describe('Security Event Recording', () => {
    test('should record security events with proper structure', () => {
      const eventType = 'test_security_event';
      const eventData = {
        ip: '192.168.1.1',
        userAgent: 'TestAgent',
        severity: 'medium'
      };

      expect(() => {
        healthMonitor.recordSecurityEvent(eventType, eventData);
      }).not.toThrow();
    });

    test('should handle security events without data', () => {
      expect(() => {
        healthMonitor.recordSecurityEvent('basic_event');
      }).not.toThrow();
    });

    test('should handle different severity levels', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical'];

      severityLevels.forEach(severity => {
        expect(() => {
          healthMonitor.recordSecurityEvent('severity_test', { severity });
        }).not.toThrow();
      });
    });
  });

  describe('Metrics Cleanup and Management', () => {
    test('should handle metrics reset', () => {
      // Record some data
      healthMonitor.recordRequest(100, 200, false);
      healthMonitor.recordSecurityEvent('test', { data: 'value' });

      // Reset metrics
      expect(() => {
        healthMonitor.resetMetrics();
      }).not.toThrow();
    });

    test('should handle high volume of events', () => {
      // Record many events
      for (let i = 0; i < 1000; i++) {
        healthMonitor.recordRequest(Math.random() * 1000, 200, false);
        
        if (i % 100 === 0) {
          healthMonitor.recordSecurityEvent('bulk_test', { index: i });
        }
      }

      // Should still provide metrics
      expect(() => {
        const metrics = healthMonitor.getPerformanceMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.requestCount).toBeGreaterThan(0);
        
        const security = healthMonitor.getSecurityStatus();
        expect(security).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Configuration Status', () => {
    test('should report configuration status in detailed health', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.configuration).toBeDefined();
      expect(response.body.configuration).toHaveProperty('status');
      expect(response.body.configuration).toHaveProperty('environment');
      expect(response.body.configuration).toHaveProperty('features');
      
      expect(response.body.configuration.status).toBe('valid');
      expect(typeof response.body.configuration.environment).toBe('string');
      expect(response.body.configuration.features).toBeInstanceOf(Object);
    });
  });

  describe('Health Status Integration', () => {
    test('should maintain consistent status across endpoints', async () => {
      const [basic, detailed, security, performance] = await Promise.all([
        request(app).get('/api/health'),
        request(app).get('/api/health/detailed'),
        request(app).get('/api/health/security'),
        request(app).get('/api/health/performance')
      ]);

      // All should return 200
      expect(basic.status).toBe(200);
      expect(detailed.status).toBe(200);
      expect(security.status).toBe(200);
      expect(performance.status).toBe(200);

      // Timestamps should be reasonably close
      const timestamps = [
        new Date(basic.body.timestamp).getTime(),
        new Date(detailed.body.timestamp).getTime()
      ];

      const timeDiff = Math.abs(timestamps[1] - timestamps[0]);
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });
  });
});