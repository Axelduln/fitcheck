import type { NormalizedLandmark } from '../lib/pose'

/**
 * Synthetic front-pose landmarks of an idealized standing person used
 * by unit tests until real recorded fixtures (debug panel → "Export
 * landmarks") are added. Coordinates are normalized; the person spans
 * eyes y=0.15 to heels y=0.90.
 */
export function syntheticStandingPose(visibility = 0.95): NormalizedLandmark[] {
  const lm = (x: number, y: number): NormalizedLandmark => ({
    x,
    y,
    z: 0,
    visibility,
  })
  const pose: NormalizedLandmark[] = Array.from({ length: 33 }, () =>
    lm(0.5, 0.5),
  )
  pose[0] = lm(0.5, 0.17) // nose
  pose[1] = lm(0.49, 0.15) // left eye inner
  pose[2] = lm(0.48, 0.15) // left eye
  pose[3] = lm(0.47, 0.15) // left eye outer
  pose[4] = lm(0.51, 0.15) // right eye inner
  pose[5] = lm(0.52, 0.15) // right eye
  pose[6] = lm(0.53, 0.15) // right eye outer
  pose[7] = lm(0.46, 0.16) // left ear
  pose[8] = lm(0.54, 0.16) // right ear
  pose[9] = lm(0.49, 0.19) // mouth left
  pose[10] = lm(0.51, 0.19) // mouth right
  pose[11] = lm(0.42, 0.3) // left shoulder
  pose[12] = lm(0.58, 0.3) // right shoulder
  pose[13] = lm(0.4, 0.45) // left elbow
  pose[14] = lm(0.6, 0.45) // right elbow
  pose[15] = lm(0.39, 0.58) // left wrist
  pose[16] = lm(0.61, 0.58) // right wrist
  pose[17] = lm(0.385, 0.61) // left pinky
  pose[18] = lm(0.615, 0.61) // right pinky
  pose[19] = lm(0.38, 0.61) // left index
  pose[20] = lm(0.62, 0.61) // right index
  pose[21] = lm(0.39, 0.6) // left thumb
  pose[22] = lm(0.61, 0.6) // right thumb
  pose[23] = lm(0.46, 0.52) // left hip
  pose[24] = lm(0.54, 0.52) // right hip
  pose[25] = lm(0.455, 0.7) // left knee
  pose[26] = lm(0.545, 0.7) // right knee
  pose[27] = lm(0.45, 0.88) // left ankle
  pose[28] = lm(0.55, 0.88) // right ankle
  pose[29] = lm(0.445, 0.9) // left heel
  pose[30] = lm(0.555, 0.9) // right heel
  pose[31] = lm(0.46, 0.92) // left foot index
  pose[32] = lm(0.54, 0.92) // right foot index
  return pose
}
