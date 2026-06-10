import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

export type { NormalizedLandmark }

const WASM_PATH = '/wasm'
const MODEL_PATH = '/models/pose_landmarker_full.task'

// numPoses: 2 lets us detect when a second person walks into frame and
// still measure only the most prominent one (see selectMostProminent).
export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 2,
  })
}

/**
 * Pick the most prominent person from a multi-pose result: the pose
 * spanning the largest vertical extent of the frame (closest / largest
 * person). Returns null when no pose was detected.
 */
export function selectMostProminent(
  poses: NormalizedLandmark[][],
): NormalizedLandmark[] | null {
  let best: NormalizedLandmark[] | null = null
  let bestSpan = -1
  for (const pose of poses) {
    let minY = Infinity
    let maxY = -Infinity
    for (const landmark of pose) {
      if (landmark.y < minY) minY = landmark.y
      if (landmark.y > maxY) maxY = landmark.y
    }
    const span = maxY - minY
    if (span > bestSpan) {
      bestSpan = span
      best = pose
    }
  }
  return best
}
