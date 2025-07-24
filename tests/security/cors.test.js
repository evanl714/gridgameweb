/**
 * CORS Configuration Security Tests
 * Tests the CORS (Cross-Origin Resource Sharing) configuration and security policies
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';

describe('CORS Security Configuration', () => {
  let app;
  let server;

  describe('Production CORS Configuration', () => {
    beforeEach(() => {
      app = express();
      
      // Mock production environment
      process.env.NODE_ENV = 'production';
      
      // Production CORS configuration - restrictive
      const corsOptions = {
        origin: ['https://gridgameweb-production.up.railway.app', 'https://custom-domain.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
        credentials: true,
        optionsSuccessStatus: 200
      };

      app.use(cors(corsOptions));

      app.get('/api/test', (req, res) => {
        res.json({ message: 'CORS test endpoint' });
      });

      app.post('/api/data', (req, res) => {
        res.json({ message: 'POST endpoint', data: 'received' });
      });

      server = app.listen(0);
    });

    afterEach((done) => {
      if (server) {
        server.close(done);
      } else {
        done();
      }
      process.env.NODE_ENV = 'test';
    });

    test('should allow requests from whitelisted origins', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://gridgameweb-production.up.railway.app');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should allow requests from custom domain', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://custom-domain.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://custom-domain.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should block requests from non-whitelisted origins', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://malicious-site.com')
        .expect(200); // Request goes through but CORS headers are not set

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should block requests from localhost in production', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should handle preflight OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://gridgameweb-production.up.railway.app');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    test('should block preflight requests from unauthorized origins', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://unauthorized-site.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should only allow specified HTTP methods', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .set('Access-Control-Request-Method', 'POST')
        .expect(200);

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('OPTIONS');
      expect(allowedMethods).not.toContain('PATCH');
      expect(allowedMethods).not.toContain('TRACE');
    });

    test('should only allow specified headers', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(200);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toContain('Content-Type');
      expect(allowedHeaders).toContain('Authorization');
      expect(allowedHeaders).toContain('Origin');
      expect(allowedHeaders).toContain('Accept');
    });

    test('should reject requests with unauthorized headers', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .set('Access-Control-Request-Headers', 'X-Custom-Unauthorized-Header')
        .expect(200);

      // The preflight will succeed but the unauthorized header won't be allowed
      const allowedHeaders = response.headers['access-control-allow-headers'] || '';
      expect(allowedHeaders).not.toContain('X-Custom-Unauthorized-Header');
    });
  });

  describe('Development CORS Configuration', () => {
    beforeEach(() => {
      app = express();
      
      // Mock development environment
      process.env.NODE_ENV = 'development';
      
      // Development CORS configuration - permissive
      const corsOptions = {
        origin: true, // Allow all origins in development
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
        credentials: true,
        optionsSuccessStatus: 200
      };

      app.use(cors(corsOptions));

      app.get('/api/test', (req, res) => {
        res.json({ message: 'Development CORS test' });
      });

      server = app.listen(0);
    });

    afterEach((done) => {
      if (server) {
        server.close(done);
      } else {
        done();
      }
      process.env.NODE_ENV = 'test';
    });

    test('should allow requests from any origin in development', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should allow requests from any domain in development', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://any-domain.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://any-domain.com');
    });
  });

  describe('CORS Security Edge Cases', () => {
    beforeEach(() => {
      app = express();
      
      process.env.NODE_ENV = 'production';
      
      const corsOptions = {
        origin: ['https://gridgameweb-production.up.railway.app'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
        optionsSuccessStatus: 200
      };

      app.use(cors(corsOptions));

      app.get('/api/test', (req, res) => {
        res.json({ message: 'Security test endpoint' });
      });

      server = app.listen(0);
    });

    afterEach((done) => {
      if (server) {
        server.close(done);
      } else {
        done();
      }
      process.env.NODE_ENV = 'test';
    });

    test('should reject null origin', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'null')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should reject origins with different protocols', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'http://gridgameweb-production.up.railway.app') // HTTP instead of HTTPS
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should reject origins with different subdomains', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://malicious.gridgameweb-production.up.railway.app')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should reject origins with different ports', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'https://gridgameweb-production.up.railway.app:8080')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should handle requests without Origin header', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      // Requests without Origin header are typically same-origin and should be allowed
      expect(response.body.message).toBe('Security test endpoint');
    });

    test('should handle malformed Origin headers gracefully', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('Origin', 'not-a-valid-origin')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Credentials Handling', () => {
    beforeEach(() => {
      app = express();
      
      const corsOptions = {
        origin: ['https://gridgameweb-production.up.railway.app'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        optionsSuccessStatus: 200
      };

      app.use(cors(corsOptions));

      app.get('/api/secure', (req, res) => {
        res.json({ message: 'Secure endpoint', user: 'authenticated' });
      });

      server = app.listen(0);
    });

    afterEach((done) => {
      if (server) {
        server.close(done);
      } else {
        done();
      }
      process.env.NODE_ENV = 'test';
    });

    test('should allow credentials from whitelisted origins', async () => {
      const response = await request(app)
        .get('/api/secure')
        .set('Origin', 'https://gridgameweb-production.up.railway.app')
        .set('Cookie', 'sessionId=abc123')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-origin']).toBe('https://gridgameweb-production.up.railway.app');
    });

    test('should not expose credentials to unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/secure')
        .set('Origin', 'https://malicious-site.com')
        .set('Cookie', 'sessionId=abc123')
        .expect(200);

      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});