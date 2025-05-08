const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push('cjs');

// Disable package exports resolution
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;