# Lightbox Studio Android — public APK

**Current native release:** 1.0.1 (package `com.saradhinitish.lightboxstudio`)

- Website: https://lightbox-studio.vercel.app/
- Public APK: https://lightbox-studio.vercel.app/android-downloads/lightbox-studio.apk
- Install page: https://lightbox-studio.vercel.app/widgets.html
- APK SHA-256: `9a51327baabaab44ecf328b62f764e7a066c9b74e0c4f0dcb252bb3b53a2b4a9`
- Signed with certificate SHA-256: `EA:2C:B6:63:C8:09:73:A2:90:A0:3F:7B:F2:0E:72:60:EB:22:BD:DC:33:83:0E:A5:FA:6F:A9:55:26:BA:02:DF`
- Signing and APK are checked in `android-downloads/VERIFIED-RELEASE.txt`.
- Signed public APK was successfully installed and launched on an Android 15 Pixel emulator, including registration of its 2×2, 4×2 and 4×4 native widget providers. See `android-downloads/VERIFIED-PIXEL-QA.txt`.

## Two ways to use Lightbox

Visitors can use the filmmaking workspace directly in a browser and bookmark the website. The separate **Download Android APK** link installs one native Lightbox app, with its three widgets already built in. Chrome's **Install App** shortcut is a PWA, not an APK containing widgets.

Native app: Open the app and tap the **WIDGETS** control, then choose a widget size. If the launcher does not support native placement prompts, use the home-screen Widgets picker under **Lightbox Studio**.

## Why this package ID differs from the original

The first public APK used `com.saradhinitish.lightbox` and an unrelated signing certificate. This corrected build uses `com.saradhinitish.lightboxstudio` to install alongside that older APK without forcing removal or risking its private app data. Users may see two Lightbox icons until they choose to remove the old version. Back up first.

Browser Chrome data and the Android app WebView data are **not automatically shared**. Export/import projects when switching; do not uninstall or clear either environment until backups are verified.

## Release integrity and future updates

The new APK is signed with a persistent private keystore backed up outside the public GitHub repository. Keep that key secure and use the **same** signing certificate for every future update to this package. Never commit private keys, passwords, or signing backups to GitHub. App publication to Google Play is not required for direct website installation.

**Compatibility:** Pixel Android 15 automated checks passed. Physical device tests on Oppo/ColorOS, Samsung and other Android launchers, including actual widget placement and lifecycle, remain device-specific. The website and public APK can be tested now, but this is not a universal compatibility guarantee.
