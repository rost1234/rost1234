#!/usr/bin/env bash
# Prepares a Linux machine (e.g. a Claude Code cloud session) to build the Android APK.
# Idempotent: skips whatever is already installed.
#
#   ANDROID_HOME=/path/to/sdk scripts/android/setup-sdk.sh
#
# Default ANDROID_HOME is ~/android-sdk. Needs Java 17+ (preinstalled in cloud sessions).
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
HERE="$(cd "$(dirname "$0")" && pwd)"
# Versions that Expo SDK 57 / React Native 0.86 ask for. If Gradle reports a missing
# package, add it here.
PACKAGES=("platform-tools" "platforms;android-36" "build-tools;36.0.0" "build-tools;35.0.0" "ndk;27.1.12297006" "cmake;3.22.1")

mkdir -p "$ANDROID_HOME"
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ ! -x "$SDKMANAGER" ]; then
  echo "Downloading Android command-line tools..."
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/clt.zip" https://dl.google.com/android/repository/commandlinetools-linux-9862592_latest.zip
  unzip -q "$tmp/clt.zip" -d "$tmp"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -rf "$tmp"
fi

yes | "$SDKMANAGER" --sdk_root="$ANDROID_HOME" --licenses >/dev/null 2>&1 || true
"$SDKMANAGER" --sdk_root="$ANDROID_HOME" "${PACKAGES[@]}"

# Maven Central rate-limits shared cloud egress (HTTP 429); route it through Google's mirror.
mkdir -p "$HOME/.gradle/init.d"
cp "$HERE/maven-central-mirror.gradle" "$HOME/.gradle/init.d/maven-central-mirror.gradle"

echo "Android SDK ready at $ANDROID_HOME"
echo "export ANDROID_HOME=$ANDROID_HOME"
