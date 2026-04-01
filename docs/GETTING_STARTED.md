# Getting Started (Contributors)

This guide is the fastest path to run RUNSTR locally for development.

## 1) Prerequisites

- Node.js 18+
- npm
- Xcode + iOS Simulator (for iOS)
- Android Studio / emulator (for Android)

## 2) Clone and install

```bash
git clone https://github.com/RUNSTR-LLC/RUNSTR.git
cd RUNSTR
npm install
```

If commands like `tsc` are missing, rerun `npm install` to ensure local dev dependencies are present.

## 3) Start the app

```bash
npm run ios
# or
npm run android
```

You can also start the Metro server directly:

```bash
npm run start
```

## 4) Validate before opening a PR

```bash
npm run typecheck
npm run lint
npm test
```

## 5) Read these docs next

- `docs/ENVIRONMENT_SETUP.md` (env + secrets)
- `docs/GIT_WORKFLOW.md` (branch + PR workflow)
- `CONTRIBUTING.md` (contribution rules)

## Troubleshooting

- iOS HealthKit setup: `docs/HEALTHKIT_XCODE_SETUP.md`
- Android build/setup notes: `docs/ANDROID_BUILD.md`
- Performance checks: `docs/PERFORMANCE_GUIDE.md`
