# Free Lightbox Android distribution (one app / three widgets)

The unified native Android app is free to distribute on the Lightbox website. Users install **one Android app** and then add any of its 2×2, 4×2, or 4×4 widgets through **Add Widgets** inside Lightbox or Android's normal home-screen picker.

A Chrome-installed Progressive Web App cannot register native Android widget providers. Sideloading an Android APK triggers an unavoidable Android/Chrome security confirmation; it cannot be silently installed by the website.

## Secure release workflow (no Google Play account required)

A single **persistent private signing key** is required so people can receive updates without uninstalling and losing saved data. Generate it locally using Android Studio or `keytool`, keep a secure backup, and never share it in public GitHub, screenshots or chat.

Save the following in the GitHub repository's encrypted **Actions secrets** (Settings → Secrets and variables → Actions):

- `LIGHTBOX_ANDROID_UPLOAD_KEYSTORE_B64` — base64 of the private release keystore (no line breaks)
- `LIGHTBOX_ANDROID_STORE_PASSWORD`
- `LIGHTBOX_ANDROID_KEY_ALIAS`
- `LIGHTBOX_ANDROID_KEY_PASSWORD`

Do not disclose secret values in conversation or build logs.

On the approved main branch, run **Publish free unified Android download** from GitHub Actions. It:
1. Builds and signs `com.saradhinitish.lightbox` with the same owner-controlled key.
2. Verifies the APK's v2 signature.
3. Derives its public SHA-256 certificate fingerprint.
4. Creates `/.well-known/assetlinks.json` for verified fullscreen TWA.
5. Publishes `/android-downloads/lightbox-studio.apk` with a SHA-256 digest.
6. Produces one publicly downloadable app that includes the filmmaking studio and all three native widget providers.

The workflow **refuses to build a release without signing secrets**. It does not publish the debug APK and does not expose the private key. Use the same signing key for every update. A Play Store transition needs planning because the Play app-signing certificate may differ.

## Manual device acceptance checklist
- On an Android device, install the signed unified APK once.
- Open Lightbox Studio and verify the normal screenplay editor and projects still work.
- Tap **Add Widgets** from the Atlas; the native widget manager should open.
- Add all three sizes from its buttons and verify Android placement approval.
- Verify 2×2, 4×2, and 4×4 appear under Lightbox Studio in the system widget picker.
- Sync a project using `/widgets.html` and verify scene, title and word counts.
- Test Quick Capture and confirm its notes remain saved when returning to Lightbox.
- Test widget taps to reopen the studio.
- Inspect Chrome fullscreen and Digital Asset Links with `https://lightbox-studio.vercel.app/.well-known/assetlinks.json`.
- Verify background, clipping, alignment and accessibility on ColorOS (Oppo), One UI (Samsung) and Pixel Launcher.
- Keep a backup of browser-based Lightbox projects **before uninstalling an old PWA**.

Website distribution is free but Chrome's APK-download warning cannot be removed. Google Play publication, if pursued later, is a separate registration and review process.
