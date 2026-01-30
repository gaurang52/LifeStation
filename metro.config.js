const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    ...defaultConfig.resolver,
    alias: {
      ...defaultConfig.resolver.alias,
      '@': './src',
      '@core': './src/core',
      '@features': './src/features',
      '@shared': './src/shared',
    },
    resolveRequest: (context, moduleName, platform) => {
      // Handle @babel/runtime helper resolution - Metro has issues with package.json exports
      if (moduleName.startsWith('@babel/runtime/helpers/')) {
        const helperName = moduleName.replace('@babel/runtime/helpers/', '');
        const helperPath = path.join(
          __dirname,
          'node_modules',
          '@babel',
          'runtime',
          'helpers',
          `${helperName}.js`,
        );
        if (fs.existsSync(helperPath)) {
          return {
            filePath: helperPath,
            type: 'sourceFile',
          };
        }
      }
      // Use default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
