#!/usr/bin/env bash
# Builds a release APK (arm64 only, to stay small) and prints where it is.
#
#   ANDROID_HOME=/path/to/sdk scripts/android/build-apk.sh [output.apk]
#
# The JS bundle is built by Gradle, so EXPO_PUBLIC_* values in .env.local are baked in.
# Bump the version first: "version" in app.json and versionCode/versionName in
# android/app/build.gradle (versionCode must increase for installs over an older APK).
set -euo pipefail

cd "$(dirname "$0")/../.."
: "${ANDROID_HOME:?Set ANDROID_HOME (run scripts/android/setup-sdk.sh first)}"
export ANDROID_HOME NODE_ENV=production

if [ ! -d android ]; then
  echo "No android/ folder yet; running expo prebuild..."
  npx expo prebuild --platform android --no-install
fi

(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --console=plain)

APK=android/app/build/outputs/apk/release/app-release.apk
OUT="${1:-$APK}"
[ "$OUT" != "$APK" ] && cp "$APK" "$OUT"
SIZE=$(du -m "$OUT" | cut -f1)
echo "APK: $OUT (${SIZE} MB)"
if [ "$SIZE" -ge 30 ]; then echo "WARNING: over 30 MB; some upload paths reject it." >&2; fi
