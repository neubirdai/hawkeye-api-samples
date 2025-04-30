module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  testTimeout: 10000
};
