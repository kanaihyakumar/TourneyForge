# TourneyForge

Tournaments, groups and bragging rights. Hosted on Firebase (project `tournamentspeedygenerator`) with Firestore as the database.

## Folders

- `Forge Angular/` - the current app (Angular). Live at https://tournamentspeedygenerator.web.app
- `Version 1/` - the original plain HTML, CSS and JS version, kept for reference (`Version 1/public`)
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` - Firebase config used to deploy the Angular app

## Run the Angular app locally

```bash
cd "Forge Angular"
npm install
npm start
```

Opens on http://localhost:4200. Run the tests with `npm test`.

## Build and deploy to Firebase

One time: `npm install -g firebase-tools` and `firebase login`.

From the repository root:

```bash
cd "Forge Angular"
npm install
npm run build
cd ..
firebase deploy --only hosting
```

Or build and deploy in one step from `Forge Angular`:

```bash
npm run deploy
```

The build is written to `Forge Angular/dist/tourney-forge/browser`, which `firebase.json` serves with every route rewritten to `index.html`.

To also publish the Firestore rules and indexes, run `firebase deploy` from the repository root (without `--only hosting`).

## Deploy the old plain version (Version 1)

```bash
cd "Version 1"
firebase deploy --only hosting
```

This replaces the live site with the old version.
