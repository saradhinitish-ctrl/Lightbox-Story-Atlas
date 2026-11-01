#!/usr/bin/env bash
# Runs as ONE command inside reactivecircus/android-emulator-runner.
# Its "script" field launches each newline separately; do not put cd/commands
# directly in that field without a dedicated shell script.
set -euo pipefail

mkdir -p widget-screenshots
gradle -p android-widgets --no-daemon assembleDebug

apk="android-widgets/app/build/outputs/apk/debug/app-debug.apk"
test -s "$apk"
adb install -r "$apk"
adb shell pm path com.saradhinitish.lightbox

adb shell dumpsys package com.saradhinitish.lightbox > widget-screenshots/package-dump.txt
for provider in QuickProvider WideProvider LargeProvider; do
  if ! grep -q "$provider" widget-screenshots/package-dump.txt; then
    echo "::error::Widget receiver missing: $provider"
    exit 1
  fi
done

for variant in 0 1 2; do
  adb shell am force-stop com.saradhinitish.lightbox
  adb shell am start -W -n com.saradhinitish.lightbox/com.lightbox.widgets.WidgetGalleryActivity --ei variant "$variant"
  sleep 2
  adb exec-out screencap -p > "widget-screenshots/native-widget-${variant}.png"
  test -s "widget-screenshots/native-widget-${variant}.png"
done

adb shell am force-stop com.saradhinitish.lightbox
adb shell am start -W -n com.saradhinitish.lightbox/com.lightbox.widgets.WidgetHubActivity
sleep 2
adb exec-out screencap -p > widget-screenshots/widget-manager.png
test -s widget-screenshots/widget-manager.png
echo "Native widget gallery, manager screenshots and receiver registration captured."
