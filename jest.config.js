const { defaults } = require('jest-config');

module.exports = {
  preset: 'react-native',
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@core$': '<rootDir>/src/core',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@features$': '<rootDir>/src/features',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@shared$': '<rootDir>/src/shared',
    '^@env$': '<rootDir>/src/__mocks__/env.js',
  },
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|react-native-gesture-handler' +
      '|react-native-reanimated' +
      '|react-native-safe-area-context' +
      '|react-native-screens' +
      ')/)',
  ],
};
