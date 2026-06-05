# Deployment

PersonaShield is a static web app. It does not require an application server, database, cloud face API, or API backend.

For the current course delivery, local preview is the accepted deployment mode. GitHub Pages, Vercel, or Netlify are
optional future/public sharing paths, not required deliverables.

## Local Preview

```powershell
cd .\PartyFaceAR
python -m http.server 8000
```

Open:

- Main PersonaShield prototype: <http://127.0.0.1:8000/mediapipe-ar.html>
- Root redirect: <http://127.0.0.1:8000/>

Camera mode must run on `localhost`, `127.0.0.1`, or HTTPS because browser camera access requires a secure context.

## GitHub Pages

This repository includes `.github/workflows/pages.yml`. If this folder is pushed as the root of a standalone GitHub
repository, the workflow deploys the static site automatically.

1. Push this directory as the root of a GitHub repository.
2. In GitHub, open `Settings -> Pages`.
3. Set source to `GitHub Actions`.
4. Push to `main` or run the workflow manually.
5. After deployment, open:

```text
https://<username>.github.io/<repo>/mediapipe-ar.html
```

Use the video mode for the course demo because the bundled sample clip gives repeatable 3-4 face verification.

## Vercel or Netlify

Deploy the repository as a static site with the project root set to `PartyFaceAR` if deploying from the parent course
folder. No build command is required.

Recommended settings:

```text
Build command: none
Output directory: .
Install command: npm install
```

The public demo URL should point to:

```text
https://<deployment-host>/mediapipe-ar.html
```

## Deployment Acceptance Check

After deployment, run the same browser verification against the public HTTPS URL:

```powershell
$env:PARTY_FACE_AR_URL="https://<deployment-host>"
npm run verify:mediapipe-ar

$env:MP_AR_REALTIME="1"
$env:MP_AR_MIN_FPS="24"
npm run verify:mediapipe-ar
```

Acceptance requires at least 3 active tracks in realtime mode and FPS >= 24 on the verification machine.
