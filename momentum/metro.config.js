// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Focus sounds ship as Ogg Vorbis loops (see scripts/generate_focus_sounds.py).
config.resolver.assetExts.push('ogg');

module.exports = config;
