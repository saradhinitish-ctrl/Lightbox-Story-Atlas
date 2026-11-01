# Lightbox Studio / free Android publication

**One install, three native widgets.** The public site provides a unified Android APK, not a separate widget companion.

## Public download path
`https://lightbox-studio.vercel.app/android-downloads/lightbox-studio.apk`

The site's `/widgets.html` page shows its download button only after this actual Android package is present. The verified public signing certificate is already in `/.well-known/assetlinks.json`.

## If you already have the signed release APK
Save the file as **`lightbox-studio.apk`** (exact lowercase spelling), then upload **just that file** to the repository's `android-downloads/` folder using:

`https://github.com/saradhinitish-ctrl/Lightbox-Story-Atlas/upload/main/android-downloads`

This requires write access to the repo. Commit the upload to main; Vercel then deploys the file. The verification workflow checks its SHA-256 digest, Android APK v2 signature and Android website association. Do not upload the private signing keystore or the owner's backup zip.

The signed release file's expected SHA-256 is:

`9453702e4698a73e516ad8ef39f946d8f4cee5e74b0a9f6cf60685e6db2d3647`

### Verify post-publication
- The public APK URL returns a real Android package, not a 404 or HTML fallback.
- `/widgets.html` shows **INSTALL LIGHTBOX FOR ANDROID**.
- Install the native app once; tap **Add Widgets** inside Lightbox.
- Test the 2×2, 4×2, 4×4 widgets and verify sync/taps across Android launchers.
- Android 8+ is the intended OS range, but not every launcher or model has been tested.

This GitHub UI upload route is an alternative to configuring signing secrets right now. For future updates, use the **same private signing key** and increase the Android version code.
