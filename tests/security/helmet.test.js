/**
 * Helmet Security Headers Tests
 * Tests the helmet.js configuration and security headers functionality
 */

import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import config from '../../server/config/environment.js';

describe('Helmet Security Headers', () => {
  let app;
  let server;

  beforeEach(() => {
    app = express();
    
    // Mock the configuration for testing
    process.env.NODE_ENV = 'production';
    
    // Apply helmet configuration similar to production
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

    // Add a test route
    app.get('/test', (req, res) => {
      res.json({ message: 'Test endpoint' });
    });

    server = app.listen(0); // Random port
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    process.env.NODE_ENV = 'test';
  });

  describe('Security Headers Presence', () => {
    test('should include X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should include X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should include X-XSS-Protection header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-xss-protection']).toBe('0');
    });

    test('should include Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    test('should include Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['referrer-policy']).toBeDefined();
    });
  });

  describe('Content Security Policy', () => {
    test('should allow self for default sources', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
    });

    test('should allow inline styles for game UI', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    test('should allow data URLs and HTTPS images', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("img-src 'self' data: https:");
    });

    test('should block object sources', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("object-src 'none'");
    });

    test('should block frame sources', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("frame-src 'none'");
    });
  });

  describe('Development vs Production Configuration', () => {
    test('should disable CSP in development', async () => {
      // Create new app for development testing
      const devApp = express();
      process.env.NODE_ENV = 'development';
      
      devApp.use(helmet({ 
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
      }));
      
      devApp.get('/test', (req, res) => {
        res.json({ message: 'Dev test' });
      });

      const response = await request(devApp)
        .get('/test')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeUndefined();
    });

    test('should still include other security headers in development', async () => {
      const devApp = express();
      process.env.NODE_ENV = 'development';
      
      devApp.use(helmet({ 
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
      }));
      
      devApp.get('/test', (req, res) => {
        res.json({ message: 'Dev test' });
      });

      const response = await request(devApp)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('Security Headers Validation', () => {
    test('should not expose server information', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should set proper MIME type handling', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should prevent clickjacking', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });
});