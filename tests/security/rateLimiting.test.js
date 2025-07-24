/**
 * Rate Limiting Security Tests
 * Tests the express-rate-limit configuration and rate limiting functionality
 */

import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import config from '../../server/config/environment.js';

describe('Rate Limiting Security', () => {
  let app;
  let server;

  beforeEach(() => {
    app = express();
    
    // Mock the configuration for testing
    process.env.NODE_ENV = 'production';
    
    // Create rate limiters similar to production
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 5, // Very low limit for testing
      message: {
        error: 'Too many requests, please try again later',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/api/health',
      handler: (req, res, next, options) => {
        res.status(options.statusCode).json(options.message);
      }
    });

    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 3, // Even lower for API testing
      message: {
        error: 'API rate limit exceeded',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next, options) => {
        res.status(options.statusCode).json(options.message);
      }
    });

    const adminLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 2, // Very restrictive for admin testing
      message: {
        error: 'Admin rate limit exceeded',
        retryAfter: '1 hour(s)'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next, options) => {
        res.status(options.statusCode).json(options.message);
      }
    });

    // Apply rate limiters
    app.use(generalLimiter);
    app.use('/api', apiLimiter);
    app.use('/api/database', adminLimiter);

    // Add test routes
    app.get('/test', (req, res) => {
      res.json({ message: 'General test endpoint' });
    });

    app.get('/api/test', (req, res) => {
      res.json({ message: 'API test endpoint' });
    });

    app.get('/api/database/test', (req, res) => {
      res.json({ message: 'Admin test endpoint' });
    });

    app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy' });
    });

    server = app.listen(0); // Random port
  });

  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
    process.env.NODE_ENV = 'test';
  });

  describe('General Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      // First request should succeed
      const response1 = await request(app)
        .get('/test')
        .expect(200);

      expect(response1.body.message).toBe('General test endpoint');
      expect(response1.headers['ratelimit-limit']).toBe('5');
      expect(response1.headers['ratelimit-remaining']).toBe('4');
    });

    test('should block requests when rate limit exceeded', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test').expect(200);
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/test')
        .expect(429);

      expect(response.body.error).toBe('Too many requests, please try again later');
      expect(response.body.retryAfter).toBe('15 minutes');
    });

    test('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('API Rate Limiting', () => {
    test('should apply stricter limits to API endpoints', async () => {
      // API endpoints should have lower limits
      for (let i = 0; i < 3; i++) {
        await request(app).get('/api/test').expect(200);
      }

      // Fourth request should be rate limited (API limit is 3)
      const response = await request(app)
        .get('/api/test')
        .expect(429);

      expect(response.body.error).toBe('API rate limit exceeded');
    });

    test('should apply both general and API rate limits', async () => {
      // API endpoints are subject to both rate limiters
      // First exhaust the API rate limit (3 requests)
      for (let i = 0; i < 3; i++) {
        await request(app).get('/api/test').expect(200);
      }

      // Fourth API request should be blocked by API limiter
      await request(app).get('/api/test').expect(429);
    });
  });

  describe('Admin Rate Limiting', () => {
    test('should apply very strict limits to admin endpoints', async () => {
      // Admin endpoints should have very low limits
      for (let i = 0; i < 2; i++) {
        await request(app).get('/api/database/test').expect(200);
      }

      // Third request should be rate limited (admin limit is 2)
      const response = await request(app)
        .get('/api/database/test')
        .expect(429);

      expect(response.body.error).toBe('Admin rate limit exceeded');
      expect(response.body.retryAfter).toBe('1 hour(s)');
    });
  });

  describe('Health Check Exemption', () => {
    test('should exempt health checks from rate limiting', async () => {
      // First exhaust the general rate limit
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test').expect(200);
      }

      // Verify general endpoints are blocked
      await request(app).get('/test').expect(429);

      // Health check should still work
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
    });

    test('should allow unlimited health check requests', async () => {
      // Make many health check requests
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/health')
          .expect(200);
      }

      // All should succeed
      const finalResponse = await request(app)
        .get('/api/health')
        .expect(200);

      expect(finalResponse.body.status).toBe('healthy');
    });
  });

  describe('Rate Limit Headers', () => {
    test('should provide correct rate limit information', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBe('5');
      expect(response.headers['ratelimit-remaining']).toBe('4');
      expect(response.headers['ratelimit-reset']).toBeDefined();
      
      // Should not have legacy headers
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
      expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
    });

    test('should update remaining count correctly', async () => {
      // First request
      const response1 = await request(app)
        .get('/test')
        .expect(200);
      expect(response1.headers['ratelimit-remaining']).toBe('4');

      // Second request
      const response2 = await request(app)
        .get('/test')
        .expect(200);
      expect(response2.headers['ratelimit-remaining']).toBe('3');

      // Third request
      const response3 = await request(app)
        .get('/test')
        .expect(200);
      expect(response3.headers['ratelimit-remaining']).toBe('2');
    });
  });

  describe('Different Request Methods', () => {
    beforeEach(() => {
      // Add POST route for testing
      app.post('/test', (req, res) => {
        res.json({ message: 'POST test endpoint' });
      });
    });

    test('should apply rate limiting to all HTTP methods', async () => {
      // Mix GET and POST requests
      await request(app).get('/test').expect(200);
      await request(app).post('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).post('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Sixth request should be rate limited regardless of method
      await request(app).post('/test').expect(429);
    });
  });

  describe('Multiple Client Simulation', () => {
    test('should track rate limits per IP address', async () => {
      // This test is limited by supertest using the same IP
      // In real scenarios, different IPs would have separate rate limits
      
      // Make requests up to limit
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test').expect(200);
      }

      // Next request should be blocked
      await request(app).get('/test').expect(429);
    });
  });

  describe('Error Response Format', () => {
    test('should return proper JSON error format when rate limited', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test').expect(200);
      }

      const response = await request(app)
        .get('/test')
        .expect(429);

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('retryAfter');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.retryAfter).toBe('string');
    });
  });
});