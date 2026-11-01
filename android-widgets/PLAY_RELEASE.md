# Lightbox Studio — Android Play release preparation

## Ownership and compliance
- Publishing account must be owned by an eligible adult (Google Play Console minimum age **18**).
- Account holder controls registration payment, legal declarations, store listing, app signing and submissions.
- A new personal Play developer account created after 13 November 2023 normally requires **12 opted-in closed testers continuously for at least 14 days** before requesting production access.
- Never paste upload keystores or passwords into public issues, ChatGPT, build logs, or source control.
- The app targets API 36 in line with the 31 August 2026 requirement.

## Identity
- Product name: Lightbox Studio
- Android application ID: `com.saradhinitish.lightbox`
- Core experience: Trusted Web Activity opens `https://lightbox-studio.vercel.app/`.
- Native widgets: Quick Return (2×2), Current Scene (4×2), Story in Progress (4×4).
- The legacy companion is a different package (`com.lightbox.widgets`) and must not be silently uninstalled or overwritten.

## Store listing draft (review before use)
Title: **Lightbox Studio**
Short description: **Write screenplays, shape scenes and develop your filmmaking workspace.**

Full description:

**From page to frame.** Lightbox Studio brings screenplay writing, scene development and visual planning together in one filmmaking workspace.

Organize story worlds, write scripts, explore character and location profiles, and keep reference boards and beats connected to each scene.

On Android, Lightbox also includes three native home-screen widgets: a compact quick-return card, a current-scene card and a larger story-in-progress view. Resume your project in a tap or capture an observation for later.

Widget scene metadata is updated when you sync a selected project from Lightbox. Quick Capture notes are stored locally and must be copied into your writing manually.

## Release process

1. An eligible adult registers/owns Play Console and creates the app with this application ID.
2. Account owner sets up Play App Signing, obtains **Play app-signing SHA-256** (not the upload certificate), and supplies it for the website's `/.well-known/assetlinks.json` Digital Asset Links file.
3. Upload credentials are configured *only in GitHub Actions Secrets*:
   - `LIGHTBOX_ANDROID_UPLOAD_KEYSTORE_B64`
   - `LIGHTBOX_ANDROID_STORE_PASSWORD`
   - `LIGHTBOX_ANDROID_KEY_ALIAS`
   - `LIGHTBOX_ANDROID_KEY_PASSWORD`
4. With authorized access, execute the manual **Prepare signed Lightbox Android app bundle** workflow from the approved source. It uploads a signed `.aab` as an internal build artifact and does **not** automatically publish it.
5. The authorized Play Console owner submits that bundle to internal testing; test TWA validation, sign-in/storage, widget launcher registration, preview quality and data preservation.
6. Complete store listing, accurate data-safety questionnaire, accessibility, privacy policy, support contact and any other Play declarations based on the actual live backend.
7. For applicable new personal accounts, complete closed testing and obtain production access before public launch.
8. Once the app is available on Play, update the Lightbox website's installation instructions to use its **verified** store listing rather than an APK sideload link.

## Privacy review (required)
The Android host stores a selected widget snapshot and optional quick-capture notes locally. However, the Lightbox website can have separate storage, syncing, account and data flows; these need a proper audit before making Play Data Safety or privacy claims. Do not publish blanket 'no data collected' claims without verifying the whole app.

## Store assets needed
- App icon 512×512, no text unless verified visually
- Feature graphic 1024×500
- Native Android screenshots captured from test device/emulator, including app and 2×2/4×2/4×4 widgets
- Privacy policy URL and support contact owned by publisher

**This document is a release plan, not evidence of Google Play approval or publication.**
