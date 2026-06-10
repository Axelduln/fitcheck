# FitCheck

Camera-based body measurement web app. Uses in-browser pose estimation
(MediaPipe PoseLandmarker) to estimate body measurements — shoulder width, arm
length, inseam, torso length, and estimated chest/waist/hip circumferences —
and map them to clothing sizes.

**Privacy by design:** all processing happens in the browser. No video frame,
image, or landmark data is ever sent to a server. There is no backend.

## Status

Milestone 0 — project scaffold. See `ACCURACY.md` (from Milestone 2 onward)
for tape-measure comparisons.

## Stack

- Vite + React + TypeScript (strict mode)
- `@mediapipe/tasks-vision` (PoseLandmarker) — model file is bundled in
  `public/models/` so the app works offline
- Vitest for unit tests, ESLint + Prettier

## Develop

```sh
npm install
npm run dev      # dev server (camera works on localhost)
npm test         # unit tests
npm run lint     # eslint
npm run build    # static production build in dist/
```

Camera access requires HTTPS in production (localhost is fine in dev).

## Layout

```
/src
  /components    # React UI
  /lib           # pure, unit-tested measurement math
/public/models   # MediaPipe pose landmarker model (binary, ~9 MB)
```
