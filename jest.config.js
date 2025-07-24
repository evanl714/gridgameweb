export default {
  // Use different environments for different test directories
  projects: [
    {
      displayName: 'client-tests',
      testEnvironment: 'jest-environment-jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testMatch: ['<rootDir>/tests/**/*.test.js', '!<rootDir>/tests/security/**/*.test.js'],
      moduleNameMapper: {
        '^../shared/(.*)$': '<rootDir>/shared/$1',
      },
      transform: {
        '^.+\\.js$': 'babel-jest',
      },
      collectCoverageFrom: [
        'public/**/*.js',
        '!public/game.js', // Exclude main game file that has canvas dependencies
        '!**/node_modules/**',
      ],
    },
    {
      displayName: 'security-tests',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/security/**/*.test.js'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.js$': ['babel-jest', { 
          presets: [['@babel/preset-env', { targets: { node: 'current' } }]] 
        }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!(supertest|@sentry/node)/)'
      ],
    }
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
