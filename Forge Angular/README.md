# TourneyForge (Angular)

Angular version of the plain HTML/CSS/JS TourneyForge app. Same Firestore backend, same neumorphic design.

## Scripts

- `npm install`
- `npm start` - dev server on http://localhost:4200
- `npm run build` - production build into `dist/tourney-forge/browser`
- `npm test` - unit tests (Vitest)
- `npm run deploy` - build, then deploy to Firebase Hosting (uses `../firebase.json`)

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
