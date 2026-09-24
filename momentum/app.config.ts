import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with build-time values. CI sets ANDROID_VERSION_CODE to a
 * monotonically increasing number so every APK installs as an update over the
 * previous one (Android refuses same-or-lower versionCodes).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const versionCode = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? '', 10);
  const hasCiVersion = Number.isInteger(versionCode) && versionCode > 0;

  return {
    ...config,
    name: config.name ?? 'Momentum',
    slug: config.slug ?? 'momentum',
    version: hasCiVersion ? `1.0.${versionCode}` : config.version,
    android: {
      ...config.android,
      versionCode: hasCiVersion ? versionCode : config.android?.versionCode,
    },
  };
};
