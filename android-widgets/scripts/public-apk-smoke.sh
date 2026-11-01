#!/usr/bin/env bash
# Smoke-test the publicly released, signed APK (not an unsigned debug build).
set -euo pipefail
apk="android-downloads/lightbox-studio.apk"
pkg="com.saradhinitish.lightbox"
mkdir -p android-public-qa
test -s "$apk"
adb wait-for-device
adb install -r "$apk"
adb shell pm path "$pkg" | tee android-public-qa/package-path.txt
adb shell dumpsys package "$pkg" > android-public-qa/package-dump.txt
for receiver in QuickProvider WideProvider LargeProvider; do
  if ! grep -q "$receiver" android-public-qa/package-dump.txt; then
    echo "::error::Missing native widget receiver: $receiver"
    exit 1
  fi
done
# Real installed activity, not a mock preview.
adb shell am force-stop "$pkg"
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetHubActivity" | tee android-public-qa/hub-launch.txt
sleep 3
adb shell pidof "$pkg" | tee android-public-qa/hub-process-id.txt
adb exec-out screencap -p > android-public-qa/widget-hub.png
test -s android-public-qa/widget-hub.png
# Smoke-test the signed app's main launcher, which may delegate to a browser/TWA.
adb shell am start -W -n "$pkg/com.lightbox.widgets.StudioLauncherActivity" | tee android-public-qa/studio-launch.txt
sleep 3
adb exec-out screencap -p > android-public-qa/studio-launch.png
test -s android-public-qa/studio-launch.png
adb shell getprop ro.build.version.release | tr -d '\r' > android-public-qa/android-version.txt
echo "Public signed Lightbox APK installed. All three widget receivers registered. Native widget manager and main launcher started." | tee android-public-qa/result.txt
