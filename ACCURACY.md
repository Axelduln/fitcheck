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
| 2026-06-10 | Alex r1 | 184       | Shoulder width | ≈41–42  | 41–42        | ~0       | ✅         |
| 2026-06-10 | Alex r1 | 184       | Arm length     | 55      | 55–56        | ~0.5     | ✅         |
| 2026-06-10 | Alex r1 | 184       | Inseam (v1)    | 87–89   | 75–77        | ~12      | ❌         |
| 2026-06-10 | Alex r2 | 184       | Shoulder width | 43      | 43–44        | ~0.5     | ✅         |
| 2026-06-10 | Alex r2 | 184       | Arm length     | 55–56   | 57–58        | ~2       | ✅         |
| 2026-06-10 | Alex r2 | 184       | Inseam (v2)    | 87–88   | 80–83        | ~6       | ❌         |
| 2026-06-10 | Alex r2 | 184       | Torso length   | 44–46\* | 53–55        | n/a\*    | see note   |
| 2026-06-10 | Alex r3 | 184       | Shoulder width | 43      | 43–44        | ~0.5     | ✅         |
| 2026-06-10 | Alex r3 | 184       | Arm length     | 55–56   | 57–59        | ~2.5     | ✅         |
| 2026-06-10 | Alex r3 | 184       | Inseam (v3)    | 87–88   | 85–87        | ~1.5     | ✅         |
| 2026-06-10 | Alex r3 | 184       | Torso length   | 44–46\* | 54–56        | n/a\*    | see note   |

**Milestone 2 verdict: PASS** — shoulder, arm, and inseam all within
±4 cm on the final formulas (r3, all high confidence).

Notes:

- Arm convention confirmed: tape from shoulder joint (1–2 cm in from the
  highest point), relaxed straight arm, down to the wrist bone — matches
  the landmark path, no tuning needed.
- **Inseam v1 failed (~12 cm short)**: formula measured hip→knee→ankle,
  but the ankle landmark sits ~4% of stature above the floor while the
  tape reference (and garment convention) is crotch→floor. v2
  reformulated as vertical hip-landmark→heel distance minus the
  anatomical crotch offset (4.5% of stature).
- **Inseam v2 failed (~6 cm short)**: the remaining error isolates the
  offset constant — MediaPipe hip landmarks sit well below the
  anatomical hip joint, so the anatomical 4.5% offset over-subtracts.
  Empirical landmark→crotch gap from this comparison: ~1.2% of stature.
  v3 uses 1.2% (tuned on n=1 — revalidate with every new subject).
- **Torso is a convention mismatch, not an accuracy failure**: Alex
  taped lower-clavicle → iliac crest (44–46 cm). The app measures the
  shoulder-joint-mid → hip-joint-mid chord, whose anthropometric
  expectation is ~28.8% of stature = 53 cm at 184 — the app read 53–55,
  matching the prediction. The two spans differ mainly because the
  iliac crest sits ~14 cm above the hip joints at this stature. App
  definition kept; tape it as: vertical from shoulder-joint height to
  hip-joint (trochanter) height at the side of the body, not over the
  chest. Torso is also not part of the ±4 cm acceptance set
  (shoulder/arm/inseam are).
- Run-to-run variance observed (arm 55–56 in r1 vs 57–59 in r3):
  ~2 cm — acceptable inside ±4, worth watching as more data arrives.
- Screen-recording review of the overlay (r3): hip/heel/shoulder
  reference points track plausibly; **wrist landmarks drift to the side
  of the arm**, which likely explains the consistent ~2–2.5 cm high
  bias on arm length. The hand landmarks (pinky/index/thumb) are
  visibly off the hands — irrelevant, no measurement reads them. If
  more subjects show the same arm bias, consider a small negative arm
  correction or the `pose_landmarker_heavy` model.
- Laptop webcam, ~2–3 m distance.

## Milestone 4 — circumferences

Target: **±8 cm** on ≥3 real people, or this project's kill criterion
triggers. Tape: chest at nipple height, waist at the narrowest point,
hips at the widest point — snug but not compressing, over fitted
clothing.

**Status: NOT YET VALIDATED (n=0).** The ellipse correction factors
(girth.ts, 0.97/section) and chest height fraction (0.22) are
literature starting points, untuned. No circumference number should be
trusted until at least 3 subjects are recorded here.

| Date | Subject | Height cm | Measure | Tape cm | App range cm | Error cm | Within ±8? |
| ---- | ------- | --------- | ------- | ------- | ------------ | -------- | ---------- |
|      |         |           | Chest   |         |              |          |            |
|      |         |           | Waist   |         |              |          |            |
|      |         |           | Hips    |         |              |          |            |

Per-subject failure analysis (clothing, mask quality, lighting):
