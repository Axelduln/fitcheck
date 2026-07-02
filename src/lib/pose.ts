import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

export type { NormalizedLandmark }

// BASE_URL keeps the paths working when the app is served from a
// subpath (GitHub Pages: /fitcheck/).
const BASE = import.meta.env.BASE_URL
const WASM_PATH = `${BASE}wasm`
const FULL_MODEL = `${BASE}models/pose_landmarker_full.task`
const LITE_MODEL = `${BASE}models/pose_landmarker_lite.task`

export interface PoseLandmarkerOptions {
  /** Enable segmentation masks (needed for circumference estimation). */
  withMasks?: boolean
}

// numPoses: 2 lets us detect when a second person walks into frame and
// still measure only the most prominent one (see selectMostProminent).
export async function createPoseLandmarker(
  options: PoseLandmarkerOptions = {},
): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  const make = (modelAssetPath: string) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 2,
      outputSegmentationMasks: options.withMasks ?? false,
    })
  try {
    return await make(FULL_MODEL)
  } catch {
    // low-end / constrained devices: fall back to the lite model
    return make(LITE_MODEL)
  }
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
