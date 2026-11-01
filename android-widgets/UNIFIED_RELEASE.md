# Unified Lightbox Android release checklist

The **one-app architecture** is implemented in `android-widgets`: the launcher starts the live Lightbox web studio using a Trusted Web Activity, while the *same Android package* contains the three native home-screen widgets and the native quick-capture screen.

## Already implemented
- One app icon launches Lightbox Studio (not a second widget-only app).
- Widgets 2×2, 4×2 and 4×4 are registered in the same Android manifest.
- Widget buttons open the native Lightbox launcher.
- The existing website's widget setup flow syncs only project metadata via a user-triggered Android intent.
- Android CI compiles a debug APK and an **unsigned** release AAB for development and signing preparation. The AAB is not uploadable to Play until signed by the account owner.
- Android 8.0+ minSdk; no unnecessary runtime permissions.

## Required before a public, frictionless release
1. Sign a production Android App Bundle with a **stable signing identity**. Keep all private signing keys in the app-store/CI secret store, not in the GitHub repository.
2. Enrol the package in Google Play app signing, obtain the **app signing** SHA-256 certificate fingerprint (not the upload key or a transient debug cert).
3. Publish `/.well-known/assetlinks.json` on the website with:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.saradhinitish.lightbox",
       "sha256_cert_fingerprints": ["FINGERPRINT_FROM_PLAY_APP_SIGNING"]
     }
   }]
   ```
   The placeholder must be replaced with the **actual** app signing certificate fingerprint. An incomplete or invented fingerprint will make trusted fullscreen launching fail.
4. Test that the site serves the file as `application/json` with HTTP 200 and no redirect.
5. Test on the user's Oppo/ColorOS launcher and on Samsung/Pixel launchers: all three sizes, resizability, font clipping, widget buttons and widget picker previews.
6. Test TWA fullscreen validation, widget-to-TWA resume, local project access, page load offline, and project selection in the Android package.
7. Distribute through Google Play (including internal testing first). The Chrome "file might be harmful" warning is associated with the **sideloaded APK flow**; it cannot be removed with HTML/CSS or replaced by a web-install prompt. The Chrome-installed PWA cannot gain Android widget providers through an update.
8. Export a complete workspace backup before deleting or migrating old installs. TWA generally shares Chrome-origin site storage, but do **not** rely on that as a replacement for a verified backup.

## Current limitations
- The published website still serves the old separate widget-only test APK; this branch is not a production release.
- The unified debug build is code-compiled, **not yet physically tested** on a phone.
- Without the final Digital Asset Links fingerprint, a TWA may show a Custom Tab toolbar.
- Widget metadata updates on explicit Sync (not automatically).
- Quick Capture stores notes locally within Android companion private storage until copied to the screenplay.
- No Play Store listing has been created or approved.
- As of August 31, 2026, new Google Play phone apps must target Android 16 (API 36); targetSdk has been updated accordingly.

Do not merge this feature branch into the live install/download flow until its signing, trusted-site verification, real-device visual tests, and distribution are ready.


Note: the unified application has a distinct package name from the legacy `com.lightbox.widgets` companion. This allows side-by-side installation without overwriting old private notes. The web sync intent must target the new package when this version ships.

## Prepared website widget flow
The feature branch `widgets.html` now opens the native widget manager via `intent://manager` and routes manual sync to package `com.saradhinitish.lightbox`. It removes the old extra APK download. **Do not merge these changes to the live website until the unified app has a verified distribution channel.**
