#!/usr/bin/env bash
set -euo pipefail
pkg=com.saradhinitish.lightboxstudio.preview
apk=source/android-widgets/app/build/outputs/apk/preview/app-preview.apk

echo "Installing isolated Lightbox Preview: $pkg"
adb install "$apk"
adb shell pm path "$pkg" | grep -F 'package:'
adb shell am start -W -n "$pkg/com.lightbox.widgets.StudioLauncherActivity"
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetHubActivity"
adb shell am start -W -n "$pkg/com.lightbox.widgets.QuickCaptureActivity"
adb shell dumpsys package "$pkg" | grep -F 'com.lightbox.widgets.QuickProvider'
adb shell dumpsys package "$pkg" | grep -F 'com.lightbox.widgets.WideProvider'
adb shell dumpsys package "$pkg" | grep -F 'com.lightbox.widgets.LargeProvider'

echo "Verifying clean uninstall and reinstallation"
adb uninstall "$pkg"
adb install "$apk"
adb shell pm path "$pkg" | grep -F 'package:'
echo "PASS: side-by-side Lightbox Preview installs, opens and registers all three widget providers"
