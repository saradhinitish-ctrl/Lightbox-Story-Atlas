#!/usr/bin/env bash
# Android 15 emulator acceptance for the repaired installed native Lightbox app.
set -euo pipefail
mkdir -p android-launcher-qa
pkg="com.saradhinitish.lightboxstudio"
apk="android-widgets/app/build/outputs/apk/debug/app-debug.apk"
gradle -p android-widgets --no-daemon assembleDebug
test -s "$apk"
adb install -r "$apk"
adb shell pm path "$pkg" | tee android-launcher-qa/package-path.txt

# The native studio must remain open, not bounce back to the Android home screen.
adb logcat -c
adb shell am force-stop "$pkg"
adb shell am start -W -n "$pkg/com.lightbox.widgets.StudioLauncherActivity" | tee android-launcher-qa/launch-command.txt
sleep 6
adb shell pidof "$pkg" | tee android-launcher-qa/launch-pid.txt
adb shell dumpsys window > android-launcher-qa/window-dump.txt
adb shell dumpsys activity activities > android-launcher-qa/activity-dump.txt
if ! (grep -q "$pkg" android-launcher-qa/window-dump.txt && grep -q "$pkg" android-launcher-qa/activity-dump.txt); then
  echo "::error::Native studio was not present after launch"
  exit 1
fi
adb exec-out screencap -p > android-launcher-qa/studio-launch.png
test -s android-launcher-qa/studio-launch.png
adb logcat -d -v brief > android-launcher-qa/logcat.txt
if grep -A 8 -E 'FATAL EXCEPTION:' android-launcher-qa/logcat.txt | grep -q "$pkg"; then
  echo "::error::App reported a fatal exception after launching"
  exit 1
fi

# The native widget hub must remain alive and all widget receivers be registered.
adb shell dumpsys package "$pkg" > android-launcher-qa/package-dump.txt
for provider in QuickProvider WideProvider LargeProvider; do
  grep -q "$provider" android-launcher-qa/package-dump.txt || { echo "Missing $provider"; exit 1; }
done
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetHubActivity" | tee android-launcher-qa/hub-command.txt
sleep 3
adb shell pidof "$pkg" | tee android-launcher-qa/hub-pid.txt
adb exec-out screencap -p > android-launcher-qa/widget-hub.png
test -s android-launcher-qa/widget-hub.png
# Launch the ACTUAL RemoteViews layout for each size, not a bitmap gallery.
for variant in 0 1 2; do
  adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetGalleryActivity" --ei variant "$variant" | tee "android-launcher-qa/live-layout-$variant.txt"
  sleep 2
  adb exec-out screencap -p > "android-launcher-qa/real-widget-$variant.png"
  test -s "android-launcher-qa/real-widget-$variant.png"
done

# Programmatically perform a real click on the RemoteViews 'NOTE +' control.
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetGalleryActivity" --ei variant 2 --ei testAction 1 > android-launcher-qa/capture-tap.txt
sleep 2
adb shell dumpsys activity activities > android-launcher-qa/capture-activity.txt
if ! grep -q 'QuickCaptureActivity' android-launcher-qa/capture-activity.txt; then
  echo "::error::Native RemoteViews Capture click did not open QuickCaptureActivity"
  exit 1
fi

# Tap the actual widget 'SYNC' control and check that Lightbox Studio opened.
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetGalleryActivity" --ei variant 2 --ei testAction 2 > android-launcher-qa/sync-tap.txt
sleep 2
adb shell dumpsys activity activities > android-launcher-qa/sync-activity.txt
if ! grep -q 'StudioLauncherActivity' android-launcher-qa/sync-activity.txt; then
  echo "::error::Native RemoteViews Sync click did not open StudioLauncherActivity"
  exit 1
fi

echo "PASS: native app remains open, its Widget Hub remains open, and 3 providers and visible buttons are functional" | tee android-launcher-qa/result.txt
