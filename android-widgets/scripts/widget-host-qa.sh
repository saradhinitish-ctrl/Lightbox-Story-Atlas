#!/usr/bin/env bash
# Real AppWidgetHost acceptance (independent of clean-install smoke test).
set -euo pipefail
pkg="com.saradhinitish.lightboxstudio"
apk="android-widgets/app/build/outputs/apk/debug/app-debug.apk"
mkdir -p android-widget-host-qa
test -s "$apk"
adb install -r "$apk" | tee android-widget-host-qa/install.txt
adb shell pm path "$pkg" | tee android-widget-host-qa/package.txt

# Only the Android shell account can grant the debug widget host binding.
# Real launchers have their own permission to bind installed widget providers.
if ! adb shell cmd appwidget grantbind --package "$pkg" --user 0      > android-widget-host-qa/grantbind.txt 2>&1; then
  cat android-widget-host-qa/grantbind.txt
  echo "::error::Unable to enable test AppWidgetHost binding in emulator"
  exit 1
fi

# A real AppWidgetHostView is required, not just RemoteViews.apply.
adb logcat -c
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetGalleryActivity" --ei variant 2   --ei testAction 1 | tee android-widget-host-qa/capture-launch.txt
sleep 4
adb logcat -d -s LightboxWidgetQA:I > android-widget-host-qa/capture-log.txt
adb shell dumpsys activity activities > android-widget-host-qa/capture-activities.txt
adb exec-out screencap -p > android-widget-host-qa/capture-screen.png
cat android-widget-host-qa/capture-log.txt
grep -q 'allowed=true' android-widget-host-qa/capture-log.txt || {
  echo "::error::AppWidgetHost binding was denied"; exit 1;
}
grep -q 'Action click dispatched=true' android-widget-host-qa/capture-log.txt || {
  echo "::error::Live widget capture click not dispatched"; exit 1;
}
grep -q 'QuickCaptureActivity' android-widget-host-qa/capture-activities.txt || {
  echo "::error::Widget capture did not open the note composer"; exit 1;
}

adb logcat -c
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetGalleryActivity" --ei variant 2   --ei testAction 2 | tee android-widget-host-qa/sync-launch.txt
sleep 4
adb logcat -d -s LightboxWidgetQA:I > android-widget-host-qa/sync-log.txt
adb shell dumpsys activity activities > android-widget-host-qa/sync-activities.txt
adb exec-out screencap -p > android-widget-host-qa/sync-screen.png
grep -q 'allowed=true' android-widget-host-qa/sync-log.txt
grep -q 'Action click dispatched=true' android-widget-host-qa/sync-log.txt
grep -q 'StudioLauncherActivity' android-widget-host-qa/sync-activities.txt || {
  echo "::error::Widget Sync did not open the studio"; exit 1;
}
echo "PASS: real Android home-screen widget host Capture and Sync buttons" | tee android-widget-host-qa/result.txt
