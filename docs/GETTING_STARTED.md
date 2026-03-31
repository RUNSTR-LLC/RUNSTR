# RUNSTR Getting Started

Canonical first-run setup for local development.

## 1) Prerequisites

- Node.js 18+
- npm 9+
- Xcode + iOS Simulator (for iOS)
- Android Studio + emulator (for Android)
- Expo Go or a physical device (optional)

Verify your tooling:

```bash
node -v
npm -v
```

## 2) Clone and install

```bash
git clone https://github.com/RUNSTR-LLC/RUNSTR.git
cd RUNSTR
npm install
```

## 3) Start the app

Start Metro:

```bash
npm run start
```

Run a platform target in another terminal:

```bash
npm run ios
# or
npm run android
```

## 4) Quality checks before opening a PR

```bash
npm run typecheck
npm run lint
npm test
```

## 5) Common troubleshooting

- **Port already in use (Metro):** stop existing Metro processes, then rerun `npm run start`.
- **iOS build fails after dependency changes:** run `npx pod-install` and rebuild.
- **Stale cache / weird runtime errors:** run `npx expo start -c`.

## 6) Next docs

- Contribution rules: [../CONTRIBUTING.md](../CONTRIBUTING.md)
- Project overview and architecture: [../README.md](../README.md)
