/**
 * Security Integration Tests
 * Tests all security components working together in realistic scenarios
 */

import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import logger from '../../server/modules/Logger.js';
import healthMonitor from '../../server/modules/HealthMonitor.js';
import errorTracking from '../../server/modules/ErrorTracking.js';

describe('Security Integration Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();
    
    // Mock production environment
    process.env.NODE_ENV = 'production';
    
    // Setup complete security stack similar to production
    
    // 1. Helmet for security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // 2. CORS configuration
    app.use(cors({
      origin: ['https://gridgameweb-production.up.railway.app'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
      credentials: true,
      optionsSuccessStatus: 200
    }));

    // 3. Rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10, // Low limit for testing
      message: { error: 'Rate limit exceeded' },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/api/health',
      handler: (req, res, next, options) => {
        logger.security('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        healthMonitor.recordSecurityEvent('rate_limit', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        res.status(options.statusCode).json(options.message);
      }
    });

    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      message: { error: 'API rate limit exceeded' },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next, options) => {
        logger.security('API rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          severity: 'medium'
        });
        healthMonitor.recordSecurityEvent('api_rate_limit', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          severity: 'medium'
        });
        res.status(options.statusCode).json(options.message);
      }
    });

    app.use(generalLimiter);
    app.use('/api', apiLimiter);

    // 4. Body parsing with limits
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 5. Error tracking middleware
    if (errorTracking.isEnabled()) {
      app.use(errorTracking.createRequestTracingMiddleware());
    }

    // 6. Request logging and metrics
    app.use('/api', (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        
        logger[logLevel](`${req.method} ${req.path}`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          category: 'api-request'
        });
        
        const isRateLimited = res.statusCode === 429;
        healthMonitor.recordRequest(duration, res.statusCode, isRateLimited);
        
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

    // Test routes
    app.get('/api/health', (req, res) => {
      const health = healthMonitor.getHealthStatus();
      res.json(health);
    });

    app.get('/api/health/detailed', (req, res) => {
      const detailed = healthMonitor.getDetailedHealthStatus();
      res.json(detailed);
    });

    app.get('/api/health/security', (req, res) => {
      const security = healthMonitor.getSecurityStatus();
      res.json(security);
    });

    app.get('/api/test/public', (req, res) => {
      res.json({ message: 'Public endpoint', timestamp: Date.now() });
    });

    app.post('/api/test/data', (req, res) => {
      logger.api('Data submission received', {
        dataSize: JSON.stringify(req.body).length,
        clientIp: req.ip
      });
      res.json({ message: 'Data received', received: Object.keys(req.body) });
    });

    app.get('/api/test/secure', (req, res) => {
      // Simulate authentication check
      const authHeader = req.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.security('Unauthorized access attempt', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent')
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      res.json({ message: 'Secure data', user: 'authenticated' });
    });

    app.get('/api/test/error', (req, res) => {
      const testError = new Error('Test error for monitoring');
      errorTracking.captureException(testError, {
        tags: { component: 'test', severity: 'low' },
        request: {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
      res.status(500).json({ error: 'Test error occurred' });
    });

    // Error handling
    if (errorTracking.isEnabled()) {
      app.use(errorTracking.createExpressErrorHandler());
    }

    app.use((error, req, res, next) => {
      logger.error('Server Error', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        statusCode: error.status || 500,
        category: 'server-error'
      });

      res.status(error.status || 500).json({
        error: error.message || 'Internal server error'
      });
    });

    server = app.listen(0);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    // Reset metrics before each test
    healthMonitor.resetMetrics();
  });

  describe('Complete Security Stack Integration', () => {
    test('should apply all security measures to legitimate requests', async () => {
      const response = await request(app)
        .get('/api/test/public')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .expect(200);

      // Check security headers from helmet
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");

      // Check CORS headers
      expect(response.headers['access-control-allow-origin']).toBe('https://gridgameweb-production.up.railway.app');
      expect(response.headers['access-control-allow-credentials']).toBe('true');

      // Check rate limiting headers
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();

      // Check response content
      expect(response.body.message).toBe('Public endpoint');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should block unauthorized CORS requests', async () => {
      const response = await request(app)
        .get('/api/test/public')
        .set('Origin', 'https://malicious-site.com')
        .expect(200);

      // Request goes through but CORS headers are not set
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      
      // Security headers should still be present
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should handle rate limiting with security logging', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/test/public')
          .set('Origin', 'https://gridgameweb-production.up.railway.app')
          .expect(200);
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/api/test/public')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .expect(429);

      expect(response.body.error).toBe('Rate limit exceeded');

      // Check that security metrics were recorded
      const securityStatus = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(securityStatus.body.rateLimitViolations).toBeGreaterThan(0);
      expect(securityStatus.body.recentSecurityEvents.length).toBeGreaterThan(0);
    });

    test('should handle API-specific rate limiting', async () => {
      // Exhaust API rate limit (5 requests)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/test/data')
          .set('Origin', 'https://gridgameweb-production.up.railway.app')
          .send({ test: `data ${i}` })
          .expect(200);
      }

      // Next API request should be rate limited
      const response = await request(app)
        .post('/api/test/data')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .send({ test: 'over limit' })
        .expect(429);

      expect(response.body.error).toBe('API rate limit exceeded');
    });

    test('should exempt health checks from rate limiting', async () => {
      // Exhaust general rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/test/public')
          .expect(200);
      }

      // Verify general endpoints are blocked
      await request(app)
        .get('/api/test/public')
        .expect(429);

      // Health check should still work
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
    });

    test('should handle authentication failures with security logging', async () => {
      const response = await request(app)
        .get('/api/test/secure')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');

      // Check that security event was recorded
      const securityStatus = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(securityStatus.body.suspiciousRequests).toBeGreaterThan(0);
      
      const securityEvents = securityStatus.body.recentSecurityEvents;
      const unauthorizedEvent = securityEvents.find(event => 
        event.type === 'suspicious_request'
      );
      expect(unauthorizedEvent).toBeDefined();
    });

    test('should handle successful authentication', async () => {
      const response = await request(app)
        .get('/api/test/secure')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(response.body.message).toBe('Secure data');
      expect(response.body.user).toBe('authenticated');

      // Should have security headers
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should integrate error tracking with request handling', async () => {
      const response = await request(app)
        .get('/api/test/error')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .expect(500);

      expect(response.body.error).toBe('Test error occurred');

      // Error should be tracked in performance metrics
      const performanceMetrics = await request(app)
        .get('/api/health/performance')
        .expect(200);

      expect(performanceMetrics.body.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Security Monitoring and Metrics', () => {
    test('should provide comprehensive security status', async () => {
      // Generate some security events
      await request(app).get('/api/test/secure').expect(401); // Unauthorized
      await request(app).get('/api/test/public').expect(200); // Success
      await request(app).post('/api/test/data').send({ data: 'test' }).expect(200); // API call

      const securityResponse = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(securityResponse.body).toHaveProperty('rateLimitViolations');
      expect(securityResponse.body).toHaveProperty('suspiciousRequests');
      expect(securityResponse.body).toHaveProperty('recentSecurityEvents');
      expect(securityResponse.body).toHaveProperty('securityScore');
      expect(securityResponse.body).toHaveProperty('lastSecurityEvent');

      expect(securityResponse.body.suspiciousRequests).toBeGreaterThan(0);
      expect(securityResponse.body.recentSecurityEvents.length).toBeGreaterThan(0);
    });

    test('should provide detailed health status including security', async () => {
      const detailedResponse = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(detailedResponse.body).toHaveProperty('success', true);
      expect(detailedResponse.body).toHaveProperty('status', 'healthy');
      expect(detailedResponse.body).toHaveProperty('database');
      expect(detailedResponse.body).toHaveProperty('system');
      expect(detailedResponse.body).toHaveProperty('security');
      expect(detailedResponse.body).toHaveProperty('performance');
      expect(detailedResponse.body).toHaveProperty('configuration');

      // Configuration should show security features enabled
      expect(detailedResponse.body.configuration.features).toHaveProperty('helmet', true);
      expect(detailedResponse.body.configuration.features).toHaveProperty('cors', true);
      expect(detailedResponse.body.configuration.features).toHaveProperty('rateLimiting', true);
    });

    test('should track performance metrics alongside security', async () => {
      // Make several requests of different types
      await request(app).get('/api/test/public').expect(200);
      await request(app).post('/api/test/data').send({ test: 'data' }).expect(200);
      await request(app).get('/api/health').expect(200);

      const performanceResponse = await request(app)
        .get('/api/health/performance')
        .expect(200);

      expect(performanceResponse.body).toHaveProperty('averageResponseTime');
      expect(performanceResponse.body).toHaveProperty('requestCount');
      expect(performanceResponse.body).toHaveProperty('errorRate');
      expect(performanceResponse.body).toHaveProperty('rateLimitedRequests');
      expect(performanceResponse.body).toHaveProperty('recentRequests');

      expect(performanceResponse.body.requestCount).toBeGreaterThan(0);
      expect(performanceResponse.body.averageResponseTime).toBeGreaterThan(0);
      expect(performanceResponse.body.recentRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Attack Simulation', () => {
    test('should handle rapid-fire requests (rate limit testing)', async () => {
      const promises = [];
      
      // Send 20 requests simultaneously
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/test/public')
            .set('User-Agent', `AttackBot/1.0-${i}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some should succeed, some should be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses.length).toBeLessThanOrEqual(10); // General limit
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check security monitoring captured the events
      const securityStatus = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(securityStatus.body.rateLimitViolations).toBeGreaterThan(0);
    });

    test('should handle malicious headers and data', async () => {
      const maliciousHeaders = {
        'X-Forwarded-For': '1.1.1.1, 2.2.2.2, 3.3.3.3',
        'User-Agent': '<script>alert("xss")</script>',
        'Referer': 'https://malicious-site.com/steal-data',
        'Origin': 'https://evil.com'
      };

      const maliciousData = {
        script: '<script>alert("xss")</script>',
        sql: "'; DROP TABLE users; --",
        largeData: 'x'.repeat(1000),
        deepObject: {
          level1: {
            level2: {
              level3: 'nested attack data'
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/test/data')
        .set(maliciousHeaders)
        .send(maliciousData)
        .expect(200); // Should handle gracefully

      // CORS should block the malicious origin
      expect(response.headers['access-control-allow-origin']).toBeUndefined();

      // Security headers should still be present
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();

      // Data should be processed (sanitization is application-level)
      expect(response.body.message).toBe('Data received');
      expect(response.body.received).toContain('script');
      expect(response.body.received).toContain('sql');
    });

    test('should handle mixed legitimate and malicious traffic', async () => {
      const requests = [
        // Legitimate requests
        request(app)
          .get('/api/test/public')
          .set('Origin', 'https://gridgameweb-production.up.railway.app')
          .set('User-Agent', 'LegitimateClient/1.0'),
        
        request(app)
          .post('/api/test/data')
          .set('Origin', 'https://gridgameweb-production.up.railway.app')
          .set('Authorization', 'Bearer valid-token')
          .send({ gameMove: { x: 5, y: 3 } }),

        // Malicious requests
        request(app)
          .get('/api/test/secure')
          .set('Origin', 'https://evil.com')
          .set('User-Agent', 'AttackBot/1.0'),

        request(app)
          .post('/api/test/data')
          .set('Origin', 'https://malicious.com')
          .send({ payload: '<script>attack()</script>' }),

        // Health check (should always work)
        request(app).get('/api/health')
      ];

      const responses = await Promise.all(requests);

      // Legitimate requests should succeed with proper CORS
      expect(responses[0].status).toBe(200);
      expect(responses[0].headers['access-control-allow-origin']).toBe('https://gridgameweb-production.up.railway.app');
      
      expect(responses[1].status).toBe(200);
      expect(responses[1].headers['access-control-allow-origin']).toBe('https://gridgameweb-production.up.railway.app');

      // Malicious requests should be handled appropriately
      expect(responses[2].status).toBe(401); // Unauthorized
      expect(responses[2].headers['access-control-allow-origin']).toBeUndefined();

      expect(responses[3].status).toBe(200); // Processes but no CORS
      expect(responses[3].headers['access-control-allow-origin']).toBeUndefined();

      // Health check should always work
      expect(responses[4].status).toBe(200);

      // Security monitoring should track the events
      const securityStatus = await request(app)
        .get('/api/health/security')
        .expect(200);

      expect(securityStatus.body.suspiciousRequests).toBeGreaterThan(0);
    });
  });

  describe('Security Configuration Validation', () => {
    test('should enforce Content Security Policy', async () => {
      const response = await request(app)
        .get('/api/test/public')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
    });

    test('should have proper security headers configuration', async () => {
      const response = await request(app)
        .get('/api/test/public')
        .expect(200);

      // Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['referrer-policy']).toBeDefined();
      
      // Should not expose server information
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should validate CORS configuration strictness', async () => {
      const testOrigins = [
        'https://gridgameweb-production.up.railway.app', // Should allow
        'http://gridgameweb-production.up.railway.app',  // Should deny (HTTP)
        'https://malicious.gridgameweb-production.up.railway.app', // Should deny (subdomain)
        'https://gridgameweb-production.up.railway.app.evil.com', // Should deny (domain spoofing)
        'null', // Should deny
        undefined // No origin
      ];

      const results = await Promise.all(
        testOrigins.map(origin => {
          const req = request(app).get('/api/test/public');
          if (origin) {
            req.set('Origin', origin);
          }
          return req;
        })
      );

      // Only the first origin should get CORS headers
      expect(results[0].headers['access-control-allow-origin']).toBe('https://gridgameweb-production.up.railway.app');
      expect(results[1].headers['access-control-allow-origin']).toBeUndefined();
      expect(results[2].headers['access-control-allow-origin']).toBeUndefined();
      expect(results[3].headers['access-control-allow-origin']).toBeUndefined();
      expect(results[4].headers['access-control-allow-origin']).toBeUndefined();
      expect(results[5].headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});