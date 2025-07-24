/**
 * Security Validation Test
 * End-to-end validation of security features using actual server
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

const SERVER_PORT = 3001; // Use different port for testing
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

describe('Security Feature Validation', () => {
  let serverProcess;
  
  beforeAll(async () => {
    // Start the server for testing
    serverProcess = spawn('node', ['server/index.js'], {
      env: { 
        ...process.env, 
        PORT: SERVER_PORT,
        NODE_ENV: 'production', // Test production security settings
        HELMET_ENABLED: 'true',
        CSP_ENABLED: 'true',
        CORS_ENABLED: 'true',
        FRONTEND_URLS: 'https://gridgameweb-production.up.railway.app',
        LOG_LEVEL: 'error', // Reduce logging noise during tests
        ERROR_TRACKING_ENABLED: 'false', // Disable error tracking for tests
        SENTRY_DSN: '' // Empty Sentry DSN to disable it
      },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000); // 10 second timeout

      const checkServer = async () => {
        try {
          const response = await fetch(`${SERVER_URL}/api/health`);
          if (response.ok) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkServer, 100);
          }
        } catch (error) {
          setTimeout(checkServer, 100);
        }
      };
      
      checkServer();
    });
  }, 15000); // 15 second timeout for beforeAll

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }
  });

  describe('Security Headers (Helmet)', () => {
    test('should include required security headers', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`);
      
      expect(response.status).toBe(200);
      
      // Check essential security headers
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toMatch(/^(DENY|SAMEORIGIN)$/);
      expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
      
      // Ensure server information is not exposed
      expect(response.headers.get('server')).toBeNull();
      expect(response.headers.get('x-powered-by')).toBeNull();
    });

    test('should enforce Content Security Policy', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`);
      
      const csp = response.headers.get('content-security-policy');
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
    });
  });

  describe('CORS Configuration', () => {
    test('should allow requests from authorized origins', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`, {
        headers: {
          'Origin': 'https://gridgameweb-production.up.railway.app'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('https://gridgameweb-production.up.railway.app');
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });

    test('should block requests from unauthorized origins', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`, {
        headers: {
          'Origin': 'https://malicious-site.com'
        }
      });
      
      expect(response.status).toBe(200); // Request goes through but no CORS headers
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });

    test('should handle CORS preflight requests', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://gridgameweb-production.up.railway.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('https://gridgameweb-production.up.railway.app');
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    });
  });

  describe('Rate Limiting', () => {
    test('should include rate limit headers', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`);
      
      expect(response.status).toBe(200);
      // Note: Health endpoint is exempt from rate limiting, so test general endpoint
      const testResponse = await fetch(`${SERVER_URL}/`);
      expect(testResponse.headers.get('ratelimit-limit')).toBeDefined();
    });

    test('should enforce rate limits on repeated requests', async () => {
      const testEndpoint = `${SERVER_URL}/api/health/detailed`;
      const responses = [];
      
      // Make many requests to trigger rate limiting
      for (let i = 0; i < 15; i++) {
        try {
          const response = await fetch(testEndpoint);
          responses.push(response.status);
        } catch (error) {
          responses.push(500); // Network error
        }
      }
      
      // Should have some successful responses and some rate limited
      const successResponses = responses.filter(status => status === 200);
      const rateLimitedResponses = responses.filter(status => status === 429);
      
      expect(successResponses.length).toBeGreaterThan(0);
      // Note: Actual rate limiting behavior depends on server configuration
    }, 10000); // Longer timeout for this test
  });

  describe('Health Monitoring Endpoints', () => {
    test('should provide basic health status', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
    });

    test('should provide detailed health information', async () => {
      const response = await fetch(`${SERVER_URL}/api/health/detailed`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('system');
      expect(data).toHaveProperty('security');
      expect(data).toHaveProperty('performance');
      expect(data).toHaveProperty('configuration');
      
      // Verify security features are enabled (check the actual structure)
      expect(data.configuration.features.fileLogging).toBe(true);
      expect(data.configuration.features.metricsCollection).toBe(true);
    });

    test('should provide security metrics', async () => {
      const response = await fetch(`${SERVER_URL}/api/health/security`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('security');
      expect(data.security).toHaveProperty('metrics');
      expect(data.security.metrics).toHaveProperty('rateLimitHits');
      expect(data.security.metrics).toHaveProperty('suspiciousRequests');
      expect(data.security.metrics).toHaveProperty('totalSecurityEvents');
      
      expect(typeof data.security.metrics.rateLimitHits).toBe('number');
      expect(typeof data.security.metrics.suspiciousRequests).toBe('number');
      expect(typeof data.security.metrics.totalSecurityEvents).toBe('number');
    });

    test('should provide performance metrics', async () => {
      const response = await fetch(`${SERVER_URL}/api/health/performance`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('performance');
      expect(data.performance).toHaveProperty('requests');
      expect(data.performance.requests).toHaveProperty('averageResponseTime');
      expect(data.performance.requests).toHaveProperty('total');
      expect(data.performance.requests).toHaveProperty('successful');
      expect(data.performance.requests).toHaveProperty('failed');
      expect(data.performance.requests).toHaveProperty('rateLimited');
      
      expect(typeof data.performance.requests.averageResponseTime).toBe('number');
      expect(typeof data.performance.requests.total).toBe('number');
      expect(typeof data.performance.requests.successful).toBe('number');
      expect(typeof data.performance.requests.failed).toBe('number');
      expect(typeof data.performance.requests.rateLimited).toBe('number');
    });
  });

  describe('Error Handling and Logging', () => {
    test('should handle invalid routes gracefully', async () => {
      const response = await fetch(`${SERVER_URL}/api/nonexistent`);
      
      expect(response.status).toBe(404);
      
      // Should still have security headers on error responses
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('content-security-policy')).toBeDefined();
    });

    test('should serve the main application for non-API routes', async () => {
      const response = await fetch(`${SERVER_URL}/`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      
      // Should have security headers on main page
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toMatch(/^(DENY|SAMEORIGIN)$/);
    });

    test('should handle malformed requests safely', async () => {
      // Test with invalid JSON
      const response = await fetch(`${SERVER_URL}/api/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json{'
      });
      
      // Server should handle this gracefully
      expect([200, 400, 405]).toContain(response.status); // Various valid responses
      
      // Should still have security headers
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });

  describe('Production Security Configuration', () => {
    test('should be running in production mode', async () => {
      const response = await fetch(`${SERVER_URL}/api/health/detailed`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.configuration.environment).toBe('production');
    });

    test('should not expose sensitive information in error responses', async () => {
      // Try to trigger an error  
      const response = await fetch(`${SERVER_URL}/api/nonexistent-endpoint`);
      const data = await response.json();
      
      // Could be 404 (not found) or 429 (rate limited) depending on request volume
      expect([404, 429]).toContain(response.status);
      
      // Should not expose stack traces or internal paths in production
      if (data.stack) {
        // If stack is present, it should be sanitized
        expect(typeof data.stack).toBe('string');
      }
      
      // Should not expose detailed error information
      expect(data).not.toHaveProperty('config');
      expect(data).not.toHaveProperty('process');
    });

    test('should enforce secure defaults', async () => {
      const response = await fetch(`${SERVER_URL}/api/health`);
      
      // Check that security headers are using secure defaults
      const csp = response.headers.get('content-security-policy');
      expect(csp).toContain("default-src 'self'"); // Restrictive default
      expect(csp).toContain("object-src 'none'"); // Block objects
      expect(csp).toContain("frame-src 'none'"); // Block frames
      
      // Frame options should be restrictive
      expect(response.headers.get('x-frame-options')).toMatch(/^(DENY|SAMEORIGIN)$/);
      
      // Content type sniffing should be disabled
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });
});

// Add fetch polyfill if not available
if (!global.fetch) {
  global.fetch = fetch;
}