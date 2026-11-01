# Lightbox W.I.P. — Three native Android widgets

Separate Android widget companion for the existing Lightbox Studio web app. The PWA and its stored projects are not replaced or migrated.

## Three widget formats

- 2×2 Quick Return — story title and one-tap studio action.
- 4×2 Current Scene — current title, scene number, word count, resume action.
- 4×4 Story in Progress — scene heading, draft word progress, resume and offline quick capture.

All three are native Android AppWidgetProvider components rendered with Canvas to RemoteViews, not a fake web screenshot. Android's launcher can slightly adjust grid cell sizes. Preview layouts are provided on Android 12-14; dynamic native previews on Android 15+.

## Install a test build

GitHub Actions creates the debug APK from this folder and attaches it to the Android widgets debug build workflow run as artifact lightbox-widgets-debug-apk. This is a debug build, not a signed Play Store release. Run the Lightbox Widgets companion and use its Add Widget controls, or use your Android launcher's Widgets picker.

## Connect real projects

Open https://lightbox-studio.vercel.app/widgets.html in the same Chrome profile that contains your workspace. Pick a project, then tap Sync Selected Story to Android. Your small metadata snapshot passes to the companion using a user-initiated Android intent.

The source of truth is your browser's IndexedDB database lightbox-portable-v64, object store workspace, key current. The site reads it without writing. The transfer includes project title, internal IDs, scene number, scene heading, draft label, word count, and optional word goal. It never transfers full screenplay text.

The widget displays the last manual sync; it does not magically observe the Chrome database in the background. Return to the sync page after writing to refresh the widget.

Resume opens Lightbox's website using Android's normal browser resolution. It does not yet guarantee automatic navigation to a particular screenplay scene.

## Quick Capture

4×4 Capture opens an offline native notes screen. Notes stay in the companion's private device storage and can be copied to the clipboard and pasted into Lightbox. They are not silently written into the screenplay. Copy important notes before uninstalling the companion.

## Build locally

Prerequisites: Java 17, Android SDK 35 and Gradle 8.11.1. From android-widgets run: gradle assembleDebug. APK output: app/build/outputs/apk/debug/app-debug.apk.

This native companion requests no runtime permissions and does not embed a WebView or expose a JavaScript interface. The main Lightbox Install App website button still installs the PWA; it does not install this companion.