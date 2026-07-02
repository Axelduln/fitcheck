# FitCheck

Camera-based body measurement web app: point your camera at yourself,
follow the spoken guidance through a front and a side pose, and get
shoulder width, arm length, inseam, torso length, estimated
chest/waist/hip circumferences, and a clothing size recommendation.

**Live app:** https://axelduln.github.io/fitcheck/

**Privacy by design:** all processing happens in the browser. No video
frame, image, or landmark data is ever sent to a server. There is no
backend, no analytics, no cookies.

## Architecture

- **Vite + React + TypeScript (strict)**, static site, PWA (installable,
  offline after first visit via a service worker).
- **Pose estimation:** MediaPipe PoseLandmarker (`@mediapipe/tasks-vision`),
  models + WASM bundled in `public/` — no CDN at runtime. Full model with
  automatic fallback to the lite model.
- **Measurement pipeline** (pure functions in `src/lib/`, all unit tested):
  - `calibration.ts` — entered height → cm/pixel scale (eye-to-vertex
    extrapolation)
  - `measurements.ts` — landmark geometry → shoulder/arm/inseam/torso
  - `quality.ts` — frame gating (visibility, framing, pose) driving the
    spoken guidance
  - `girth.ts` — front width + side depth from segmentation masks →
    elliptical cross-sections → chest/waist/hip
  - `sizing.ts` + `data/sizecharts.json` — measurements → size
    recommendation with honest fit notes
- **Accuracy log:** `ACCURACY.md` records every tape-measure comparison;
  lengths validated to ±4 cm on one subject, circumferences NOT yet
  validated (target ±8 cm on ≥3 people).

## Known limitations

- Circumference estimates are untuned (n=0) — treat as rough estimates.
- Calibration constants tuned on a single subject so far.
- Requires decent lighting, a plain background, and fitted clothing.
- Camera requires HTTPS (or localhost in dev).

## Develop

```sh
npm install
npm run dev      # dev server (camera works on localhost)
npm test         # unit tests
npm run lint     # eslint
npm run build    # static production build in dist/
```

## Deploy

Pushes to `main` auto-deploy to GitHub Pages via
`.github/workflows/deploy.yml` (build → upload artifact →
`actions/deploy-pages`). Pages must be set to "GitHub Actions" as the
source (repo Settings → Pages).
