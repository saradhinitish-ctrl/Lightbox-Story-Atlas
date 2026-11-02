#!/usr/bin/env bash
set -euo pipefail
pkg=com.saradhinitish.lightboxstudio.android
apk=android-downloads/lightbox-studio-1.0.7.apk
adb install android-downloads/lightbox-studio-1.0.6.apk
adb install -r "$apk"
adb shell dumpsys package "$pkg" | grep "versionName=1.0.7"
adb shell dumpsys package "$pkg" > /tmp/lightbox-package
for provider in QuickProvider WideProvider LargeProvider; do grep -F "$provider" /tmp/lightbox-package; done
adb shell am start -W -n "$pkg/com.lightbox.widgets.StudioLauncherActivity"
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetHubActivity"
for attempt in 1 2 3; do
  adb shell uiautomator dump /sdcard/collection.xml
  adb shell cat /sdcard/collection.xml > /tmp/lightbox-collection
  if grep -q 'Widget collection' /tmp/lightbox-collection; then break; fi
  sleep 2
done
adb logcat -d -b crash
adb shell dumpsys activity activities | grep -E 'topResumedActivity|mResumedActivity' || true
adb exec-out screencap -p > android-gallery-inspect.png
python3 -c 'import xml.etree.ElementTree as E;print([(n.get("package"),n.get("text"),n.get("content-desc")) for n in E.parse("/tmp/lightbox-collection").iter("node") if n.get("text") or n.get("content-desc")])'
grep -q 'Widget collection' /tmp/lightbox-collection
grep -q 'Add Quick Capture widget' /tmp/lightbox-collection
adb exec-out screencap -p > android-gallery-top.png
adb shell input swipe 450 1750 450 650 350
sleep 1
adb exec-out screencap -p > android-gallery-lower.png
adb uninstall "$pkg"
adb install "$apk"
adb shell pm path "$pkg"
