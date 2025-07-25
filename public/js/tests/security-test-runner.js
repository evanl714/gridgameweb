/**
 * Security Test Runner
 * Coordinates running all security tests and provides results
 */

class SecurityTestRunner {
  constructor() {
    this.testSuites = [];
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    };
  }

  /**
   * Register a test suite
   */
  registerSuite(name, suite) {
    this.testSuites.push({ name, suite });
  }

  /**
   * Run all registered test suites
   */
  async runAll() {
    console.log('🚀 Starting Security Test Suite...\n');
    
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    };

    for (const { name, suite } of this.testSuites) {
      console.log(`\n📋 Running ${name}...`);
      
      try {
        const suiteResults = await suite.run();
        
        this.results.suites.push({
          name,
          passed: suiteResults.passed,
          failed: suiteResults.failed,
          status: suiteResults.failed === 0 ? 'PASSED' : 'FAILED'
        });
        
        this.results.totalTests += suiteResults.passed + suiteResults.failed;
        this.results.passedTests += suiteResults.passed;
        this.results.failedTests += suiteResults.failed;
        
      } catch (error) {
        console.error(`❌ Test suite ${name} crashed:`, error);
        this.results.suites.push({
          name,
          passed: 0,
          failed: 1,
          status: 'CRASHED',
          error: error.message
        });
        this.results.failedTests += 1;
        this.results.totalTests += 1;
      }
    }

    this.printFinalResults();
    return this.results;
  }

  /**
   * Print final test results
   */
  printFinalResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY TEST RESULTS');
    console.log('='.repeat(60));
    
    this.results.suites.forEach(suite => {
      const status = suite.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${suite.name}: ${suite.passed} passed, ${suite.failed} failed`);
      
      if (suite.error) {
        console.log(`   Error: ${suite.error}`);
      }
    });
    
    console.log('-'.repeat(60));
    console.log(`📊 TOTAL: ${this.results.totalTests} tests`);
    console.log(`✅ PASSED: ${this.results.passedTests}`);
    console.log(`❌ FAILED: ${this.results.failedTests}`);
    
    if (this.results.failedTests === 0) {
      console.log('\n🎉 ALL SECURITY TESTS PASSED! 🎉');
      console.log('✅ XSS vulnerabilities have been successfully mitigated.');
    } else {
      console.log('\n⚠️  SECURITY ISSUES DETECTED!');
      console.log('❌ Please review and fix the failing tests before deployment.');
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    const timestamp = new Date().toISOString();
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Test Report</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .stat-card.passed { border-left-color: #28a745; }
        .stat-card.failed { border-left-color: #dc3545; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9em; }
        .suite { margin-bottom: 20px; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .suite-status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; }
        .suite-status.passed { background: #28a745; }
        .suite-status.failed { background: #dc3545; }
        .suite-status.crashed { background: #6c757d; }
        .suite-details { padding: 15px; }
        .timestamp { color: #666; font-size: 0.9em; text-align: center; margin-top: 20px; }
        .overall-status { text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; font-size: 1.1em; }
        .overall-status.passed { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .overall-status.failed { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Test Report</h1>
            <p>Grid Game Web Application - XSS Vulnerability Assessment</p>
        </div>

        <div class="overall-status ${this.results.failedTests === 0 ? 'passed' : 'failed'}">
            ${this.results.failedTests === 0 ? 
              '🎉 ALL SECURITY TESTS PASSED - Application is secure against tested XSS vulnerabilities' : 
              '⚠️ SECURITY ISSUES DETECTED - Please review failing tests before deployment'
            }
        </div>

        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${this.results.totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${this.results.passedTests}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${this.results.failedTests}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.suites.length}</div>
                <div class="stat-label">Test Suites</div>
            </div>
        </div>

        <h2>Test Suite Results</h2>
        ${this.results.suites.map(suite => `
            <div class="suite">
                <div class="suite-header">
                    <span>${suite.name}</span>
                    <span class="suite-status ${suite.status.toLowerCase()}">${suite.status}</span>
                </div>
                <div class="suite-details">
                    <p><strong>Passed:</strong> ${suite.passed} | <strong>Failed:</strong> ${suite.failed}</p>
                    ${suite.error ? `<p><strong>Error:</strong> ${suite.error}</p>` : ''}
                </div>
            </div>
        `).join('')}

        <div class="timestamp">
            Report generated on ${timestamp}
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Save HTML report to file (browser download)
   */
  downloadHTMLReport() {
    const html = this.generateHTMLReport();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-test-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Quick security check - run essential tests only
   */
  async quickSecurityCheck() {
    console.log('⚡ Running quick security check...');
    
    const essentialChecks = [
      () => this.checkHTMLSanitizerAvailable(),
      () => this.checkBasicXSSPrevention(),
      () => this.checkDOMManipulationSafety()
    ];

    let passed = 0;
    let failed = 0;

    for (const check of essentialChecks) {
      try {
        await check();
        passed++;
      } catch (error) {
        console.error(`❌ Quick check failed: ${error.message}`);
        failed++;
      }
    }

    const status = failed === 0 ? 'SECURE' : 'VULNERABLE';
    console.log(`\n⚡ Quick Security Check: ${status} (${passed} passed, ${failed} failed)`);
    
    return { status, passed, failed };
  }

  checkHTMLSanitizerAvailable() {
    if (!window.htmlSanitizer) {
      throw new Error('HTMLSanitizer not available');
    }
    if (typeof window.htmlSanitizer.escapeText !== 'function') {
      throw new Error('HTMLSanitizer.escapeText not available');
    }
    console.log('✅ HTMLSanitizer is available');
  }

  checkBasicXSSPrevention() {
    const dangerous = '<script>alert("xss")</script>';
    const escaped = window.htmlSanitizer.escapeText(dangerous);
    
    if (escaped.includes('<script>')) {
      throw new Error('Basic XSS prevention failed');
    }
    console.log('✅ Basic XSS prevention working');
  }

  checkDOMManipulationSafety() {
    try {
      const element = window.htmlSanitizer.createElement('div', { class: 'test' }, 'Safe content');
      if (!element || element.tagName !== 'DIV') {
        throw new Error('Safe DOM creation failed');
      }
      console.log('✅ Safe DOM manipulation working');
    } catch (error) {
      throw new Error('DOM manipulation safety check failed');
    }
  }
}

// Create global test runner instance
const securityTestRunner = new SecurityTestRunner();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityTestRunner, securityTestRunner };
}

// Make available globally
if (typeof window !== 'undefined') {
  window.SecurityTestRunner = SecurityTestRunner;
  window.securityTestRunner = securityTestRunner;
  
  // Console commands for manual testing
  window.runSecurityTests = () => securityTestRunner.runAll();
  window.quickSecurityCheck = () => securityTestRunner.quickSecurityCheck();
  window.downloadSecurityReport = () => securityTestRunner.downloadHTMLReport();
}