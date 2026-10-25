# TourneyForge (Angular)

Angular version of the plain HTML/CSS/JS TourneyForge app. Same Firestore backend, same neumorphic design.

## Scripts

- `npm install`
- `npm start` - dev server on http://localhost:4200
- `npm run build` - production build into `dist/tourney-forge/browser`
- `npm test` - unit tests (Vitest)
- `npm run deploy` - build, then deploy to Firebase Hosting (uses `../firebase.json`)
- `npm run deploy:rules` - publish `../firestore.rules` (needed once for the organizer inbox)

## Install as a mobile app (PWA)

The production build is an installable app (manifest, icons and a service worker, which only runs in production). Players and organizers can tap **📲 Get the app** on the home page card, the dashboard or the footer. Android and desktop Chrome show the real install prompt. iPhone and iPad get step-by-step instructions (Share, then Add to Home Screen), because iOS has no install prompt.

Test it on the production build: `npm run build`, serve `dist/tourney-forge/browser` on localhost or https, and open it in Chrome. Icons live in `public/icons` and the app details in `public/manifest.webmanifest`. Hosting headers for the service worker are in the root `firebase.json`, so deploy with `npm run deploy` (hosting only).

## Deploy

```bash
npm run build
cd ..
firebase deploy --only hosting
```

## Structure

- `src/styles/` - central theme: `_theme.scss` (design tokens as CSS variables), `_mixins.scss` (neumorphic shadows, form control styles), `_base.scss`, `_layout.scss`
- `src/app/core/` - models, config (constants, games catalog, Firebase config), services and pure utils (time, Plato IDs, bracket, scoring, messages)
- `src/app/shared/ui/` - reusable presentational components
- `src/app/shared/forms/` - reusable form controls (`tf-input`, `tf-select`, `tf-textarea`, `tf-checkbox`)
- `src/app/shared/tournament/` - tournament pieces shared across pages
- `src/app/layout/` - page header, account actions, login modal, credit line
- `src/app/features/` - `home`, `dashboard`, `forge`, `not-found` pages
