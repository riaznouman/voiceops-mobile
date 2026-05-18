# VoiceOps Mobile

Mobile Application for the VoiceOps Field Service Management System

## Project Overview

The VoiceOps Mobile App is the field technician's companion application built with React Native and Expo. It enables technicians to receive job assignments, update work order statuses, capture job details, and manage their daily workflow on the go.

## Tech Stack

- **Framework:** React Native with Expo SDK 55
- **Routing:** expo-router (file-based routing)
- **State Management:** Redux Toolkit / RTK Query
- **Backend API:** VoiceOps FSM (Next.js 15)
- **Language:** TypeScript

## Team - Group 1

| Name | Role | Responsibilities |
|------|------|-----------------|
| Mehran Abbas | Mobile Application Development Lead | App architecture, navigation, screens, Redux state, mobile features |
| Nouman Riaz | Backend Development Lead | API endpoints consumed by the mobile app |
| Bishal Pandey | Project Management & UI/UX Design Lead | Wireframes, UI/UX design, Figma mockups for mobile screens |

## Related Repository

- [voiceops-fsm](https://github.com/riaznouman/voiceops-fsm) - Backend API and Admin Panel (Next.js 15)

## Getting Started

### Install

```
npm install
```

Create a `.env` file in the project root for local development:

```
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000
```

Run the app in development:

```
npm start
```

## Production Builds

Production builds use **EAS Build** (Expo's cloud build service). The
production API URL (`https://voiceops-fsm.vercel.app`) is set inside
`eas.json` for the `preview` and `production` profiles, so it gets
baked into the build.

### One-time setup

```
npx eas-cli login
```

The EAS project id is already set in `app.config.ts` under
`extra.eas.projectId`, so no `eas init` is needed.

### Android APK (for testing / installing on phones)

```
npm run build:apk
```

This runs the `preview` profile which produces an installable `.apk`
pointing at the production API. Download link is shown when the build
finishes.

### Android App Bundle (for Play Store)

```
npm run build:android
```

Produces an `.aab` from the `production` profile.

### iOS

For TestFlight / App Store (needs an Apple Developer account):

```
npm run build:ios
```

For a build that runs on the iOS Simulator (no Apple account needed):

```
npm run build:ios-sim
```

## License

This project is developed as part of an academic assessment at CQUniversity Australia.
