# ACCURACY.md — tape-measure comparisons

This file is the kill/continue instrument for FitCheck. Every milestone
that changes measurement math gets a real-person comparison recorded
here. Targets: **lengths ±4 cm** (Milestone 2), **circumferences ±8 cm**
(Milestone 4) — if circumferences can't reach ±8 cm, that must be stated
plainly here with options, not papered over.

## How to record a comparison

1. Tape-measure the subject (over fitted clothing):
   - Shoulder width: across the back, acromion to acromion plus deltoid
   - Arm length: shoulder point over slightly bent elbow to wrist bone
   - Inseam: crotch to floor minus shoe, or trouser inseam of a
     well-fitting pair
   - Torso: C7-ish shoulder line midpoint down to hip line midpoint
2. Run the app (height entered correctly), note the displayed ranges.
3. Add a row: app range vs tape value, error = |range midpoint − tape|.

## Milestone 2 — length measurements

| Date       | Subject | Height cm | Measure        | Tape cm | App range cm | Error cm | Within ±4? |
| ---------- | ------- | --------- | -------------- | ------- | ------------ | -------- | ---------- |
| 2026-06-10 | Alex    | (tbd)     | Shoulder width | ≈41–42  | 41–42        | ~0       | ✅         |
| 2026-06-10 | Alex    | (tbd)     | Arm length     | 55      | 55–56        | ~0.5     | ✅         |
| 2026-06-10 | Alex    | (tbd)     | Inseam (v1)    | 87–89   | 75–77        | ~12      | ❌         |
| 2026-06-10 | Alex    | (tbd)     | Inseam (v2)    | 87–89   | (retest)     |          |            |
| 2026-06-10 | Alex    | (tbd)     | Torso length   | (tbd)   | 54–55        |          |            |

Notes:

- Arm convention confirmed: tape from shoulder joint (1–2 cm in from the
  highest point), relaxed straight arm, down to the wrist bone — matches
  the landmark path, no tuning needed.
- **Inseam v1 failed**: formula measured hip→knee→ankle, but the ankle
  landmark sits ~4% of stature above the floor while the tape reference
  (and garment convention) is crotch→floor. Reformulated (v2) as
  vertical hip-joint→heel distance minus the crotch offset — retest
  pending.
- Torso: Alex's tape follows the body surface from the iliac crest up to
  ~1–2 cm below the acromion; the app measures a straight chord between
  shoulder-joint and hip-joint midpoints. Tape value pending — endpoint
  convention vs. surface-curvature question still open.
- Laptop webcam, ~2–3 m distance.

## Milestone 4 — circumferences

_(table added with Milestone 4)_
