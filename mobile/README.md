# Fretlab for Android

The phone app is the same web app, packaged with [Capacitor](https://capacitorjs.com) so it installs like any other app and works offline.

**Download (latest build):** https://github.com/snakesonsketz-gif/fretboard-explorer/releases/download/android-latest/Fretlab.apk

GitHub builds a new APK automatically on every push to `main` (`.github/workflows/android.yml`), so changes made in Lovable reach testers on their own — they just download the link again and install over the old version.

## Install on a phone
1. Open the download link on the phone, download `Fretlab.apk`, tap it.
2. If Android asks, allow your browser to "install unknown apps", then tap **Install**.
3. The first time you press **Start listening**, Android asks for the microphone — allow it.

## Build it yourself
```sh
bun run build:mobile          # repo root: static build into dist/client
cd mobile && npm ci && npx cap sync android
cd android && ./gradlew assembleRelease   # needs Java 21 + the Android SDK (or open mobile/android in Android Studio)
```

## Notes
- `android/app/fretlab-tester.keystore` is a **test-only** signing key, committed on purpose so every build has the same signature (updates install over the top). Make a private key before any Play Store release.
- iPhone / iPad: there is no APK. Testers open the published web link in Safari and tap Share → **Add to Home Screen** — the app shows them a tip saying exactly that. The installed icon opens full screen with the mic working. (An App Store / TestFlight build would need an Apple Developer account.)
- `vite.mobile.config.ts` is only used for this build. Lovable keeps using `vite.config.ts`.
