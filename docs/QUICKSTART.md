# RUNSTR Quickstart

Use this checklist for a clean first run on a local machine.

## Prerequisites

- Node.js 18+
- npm 9+
- Xcode + iOS Simulator (for iOS)
- CocoaPods (`pod --version`)
- Android Studio (for Android)

## 1) Clone + install

```bash
git clone https://github.com/RUNSTR-LLC/RUNSTR.git
cd RUNSTR
npm install
```

## 2) Configure environment

```bash
cp .env.example .env
```

Then set required values in `.env` (especially `REWARD_SENDER_NWC`).

Reference: [`docs/ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md)

## 3) Install iOS pods

```bash
cd ios
pod install
cd ..
```

## 4) Run the app

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

## 5) Baseline validation

```bash
npm run typecheck
npm run lint
npm test
```

## Common troubleshooting

- Clear Metro cache: `npx expo start --clear`
- Reinstall dependencies: remove `node_modules` then `npm install`
- iOS pod drift: re-run `cd ios && pod install`

## Next reads

- [`../README.md`](../README.md)
- [`../CLAUDE.md`](../CLAUDE.md)
- [`docs/ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md)
- [`docs/HEALTHKIT_XCODE_SETUP.md`](./HEALTHKIT_XCODE_SETUP.md)
