#!/usr/bin/env bash
set -euo pipefail
pkg=com.saradhinitish.lightboxstudio
debug=android-widgets/app/build/outputs/apk/debug/app-debug.apk
result=0
check() {
  if "$@"; then echo "PASS: $*"; else echo "::error::Failed: $*"; result=1; fi
}
check bash android-widgets/scripts/launcher-qa.sh
check python3 android-widgets/scripts/webview-qa.py
check bash android-widgets/scripts/widget-host-qa.sh
check python3 android-widgets/scripts/notebook-qa.py
check python3 android-widgets/scripts/pin-qa.py
adb uninstall "$pkg"
adb install /tmp/lightbox-old/android-widgets/app/build/outputs/apk/debug/app-debug.apk
# Seed a legacy capture in the old sandbox, then upgrade in place with the same debug key.
python3 android-widgets/scripts/webview-qa.py seed-old
adb shell am force-stop "$pkg"
adb shell run-as "$pkg" mkdir -p shared_prefs
printf '%s' '<map><string name="notes">[{"text":"Legacy capture","created":1700000000000}]</string></map>' | adb shell "run-as $pkg sh -c 'cat > shared_prefs/lightbox.widget.capture.v1.xml'"
adb install -r "$debug"
python3 android-widgets/scripts/webview-qa.py verify-upgrade
adb shell am start -W -n "$pkg/com.lightbox.widgets.WidgetHubActivity"
adb shell run-as "$pkg" cat shared_prefs/lightbox.widget.capture.v1.xml | grep -F 'Legacy capture'
if [[ -f candidate/lightbox-studio.apk ]]; then
  adb uninstall "$pkg"
  adb install android-downloads/lightbox-studio.apk
  adb install -r candidate/lightbox-studio.apk
  adb shell am start -W -n "$pkg/com.lightbox.widgets.StudioLauncherActivity"
  adb uninstall "$pkg"
  adb install candidate/lightbox-studio.apk
  echo "Retail certificate update and clean reinstall passed."
else
  echo "Debug upgrade passed. Production-signed upgrade blocked pending matching key." >> "$GITHUB_STEP_SUMMARY"
fi

exit "$result"
