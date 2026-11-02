#!/usr/bin/env bash
set -euo pipefail
pkg=com.saradhinitish.lightboxstudio.android
apk=android-downloads/lightbox-studio-1.0.6.apk
adb install android-downloads/lightbox-studio-1.0.5-preview.apk
adb install "$apk"
adb install -r "$apk"
adb shell pm path com.saradhinitish.lightboxstudio.preview
adb shell dumpsys package "$pkg" > /tmp/lightbox-package
for provider in QuickProvider WideProvider LargeProvider; do grep -F "$provider" /tmp/lightbox-package; done
adb shell am start -W -n "$pkg/com.lightbox.widgets.StudioLauncherActivity"
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetHubActivity"
adb shell uiautomator dump /sdcard/collection.xml
adb shell cat /sdcard/collection.xml > /tmp/lightbox-collection
grep -F 'Widget collection' /tmp/lightbox-collection
grep -F 'Add Quick Capture widget' /tmp/lightbox-collection
adb exec-out screencap -p > android-gallery-top.png
adb shell input swipe 450 1750 450 650 350
sleep 1
adb exec-out screencap -p > android-gallery-lower.png
adb uninstall "$pkg"
adb install "$apk"
adb shell pm path "$pkg"
