const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@': './src',
      '@core': './src/core',
      '@features': './src/features',
      '@shared': './src/shared',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
