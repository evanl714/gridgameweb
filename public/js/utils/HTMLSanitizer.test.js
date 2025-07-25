/**
 * HTMLSanitizer Security Tests
 * Tests for XSS prevention and safe DOM manipulation
 */

// Mock environment for testing
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      setAttribute: () => {},
      removeAttribute: () => {},
      appendChild: () => {},
      removeChild: () => {},
      textContent: '',
      innerHTML: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {}
      },
      addEventListener: () => {},
      attributes: [],
      childNodes: [],
      firstChild: null
    }),
    body: { appendChild: () => {} }
  };
  global.window = { DOMPurify: null };
  global.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3
  };
}

// Import HTMLSanitizer
import '../utils/HTMLSanitizer.js';

/**
 * Security Test Suite
 */
class SecurityTestSuite {
  constructor() {
    this.tests = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Add a test case
   */
  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  /**
   * Assert that a condition is true
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Assert that two values are equal
   */
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
    }
  }

  /**
   * Assert that a string does not contain dangerous content
   */
  assertSafe(content, message) {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new Error(`Security assertion failed: ${message}. Found dangerous pattern: ${pattern}`);
      }
    }
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('🔒 Running HTMLSanitizer Security Tests...\n');

    for (const test of this.tests) {
      try {
        await test.testFn();
        console.log(`✅ ${test.name}`);
        this.passedTests++;
      } catch (error) {
        console.error(`❌ ${test.name}: ${error.message}`);
        this.failedTests++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passedTests} passed, ${this.failedTests} failed`);
    
    if (this.failedTests > 0) {
      throw new Error(`${this.failedTests} security tests failed!`);
    }

    return { passed: this.passedTests, failed: this.failedTests };
  }
}

// Create test suite
const testSuite = new SecurityTestSuite();

// Test: Basic text escaping
testSuite.test('Basic text escaping', () => {
  const dangerous = '<script>alert("xss")</script>';
  const escaped = htmlSanitizer.escapeText(dangerous);
  
  testSuite.assertSafe(escaped, 'Escaped text should not contain script tags');
  testSuite.assert(!escaped.includes('<script>'), 'Script tags should be escaped');
  testSuite.assert(escaped.includes('&lt;script&gt;'), 'Should contain escaped angle brackets');
});

// Test: HTML sanitization without DOMPurify
testSuite.test('HTML sanitization (basic)', () => {
  const dangerousHTML = '<p>Safe content</p><script>alert("xss")</script><img src="x" onerror="alert(1)">';
  const sanitized = htmlSanitizer.sanitize(dangerousHTML);
  
  testSuite.assertSafe(sanitized, 'Sanitized HTML should not contain dangerous elements');
  testSuite.assert(sanitized.includes('<p>'), 'Should preserve safe tags');
  testSuite.assert(!sanitized.includes('<script>'), 'Should remove script tags');
  testSuite.assert(!sanitized.includes('onerror'), 'Should remove event handlers');
});

// Test: Attribute sanitization
testSuite.test('Attribute sanitization', () => {
  const maliciousInput = 'javascript:alert("xss")';
  const sanitized = htmlSanitizer.validateInput(maliciousInput, 'attribute');
  
  testSuite.assertSafe(sanitized, 'Sanitized attributes should not contain javascript:');
  testSuite.assert(!sanitized.includes('javascript:'), 'Should remove javascript: protocol');
});

// Test: Safe element creation
testSuite.test('Safe element creation', () => {
  const maliciousTag = 'script';
  const safeTag = 'div';
  
  try {
    htmlSanitizer.createElement(maliciousTag, {}, 'alert("xss")');
    testSuite.assert(false, 'Should not allow creation of script elements');
  } catch (error) {
    // Expected to throw
  }
  
  const element = htmlSanitizer.createElement(safeTag, { class: 'test' }, 'Safe content');
  testSuite.assert(element, 'Should create safe elements');
});

// Test: Content length limits
testSuite.test('Content length limits', () => {
  const longContent = 'A'.repeat(1000);
  const limited = htmlSanitizer.validateInput(longContent, 'text', { maxLength: 100 });
  
  testSuite.assert(limited.length <= 100, 'Should enforce length limits');
  testSuite.assert(limited.length === 100, 'Should trim to exact length');
});

// Test: Null and undefined handling
testSuite.test('Null and undefined handling', () => {
  const nullResult = htmlSanitizer.escapeText(null);
  const undefinedResult = htmlSanitizer.escapeText(undefined);
  
  testSuite.assertEqual(nullResult, '', 'Should handle null input');
  testSuite.assertEqual(undefinedResult, '', 'Should handle undefined input');
});

// Test: Edge cases
testSuite.test('Edge cases', () => {
  const emptyString = htmlSanitizer.escapeText('');
  const whitespace = htmlSanitizer.escapeText('   ');
  const specialChars = htmlSanitizer.escapeText('&<>"\'`=/');
  
  testSuite.assertEqual(emptyString, '', 'Should handle empty strings');
  testSuite.assert(specialChars.includes('&amp;'), 'Should escape ampersands');
  testSuite.assert(specialChars.includes('&lt;'), 'Should escape less than');
  testSuite.assert(specialChars.includes('&gt;'), 'Should escape greater than');
});

// Test: Unescaping functionality
testSuite.test('Unescaping functionality', () => {
  const original = 'Hello & goodbye < > " \' `';
  const escaped = htmlSanitizer.escapeText(original);
  const unescaped = htmlSanitizer.unescapeText(escaped);
  
  testSuite.assertEqual(unescaped, original, 'Should properly unescape text');
});

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityTestSuite, testSuite };
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment - run tests when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    testSuite.run().catch(console.error);
  });
} else if (typeof require !== 'undefined' && require.main === module) {
  // Node.js environment - run tests immediately
  testSuite.run().catch(console.error);
}