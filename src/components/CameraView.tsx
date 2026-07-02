import { useEffect, useRef, useState } from 'react'
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision'
import {
  createPoseLandmarker,
  selectMostProminent,
  type NormalizedLandmark,
} from '../lib/pose'
import { extractWidthProfile } from '../lib/silhouette'
import type { FrameDims } from '../lib/measurements'
import { FpsMeter } from '../lib/fps'
import {
  computeBodyStatus,
  StatusDebouncer,
  type BodyStatus,
} from '../lib/bodyStatus'
import { VoiceAnnouncer } from '../lib/speech'
import { DebugPanel } from './DebugPanel'

type CameraState = 'starting' | 'running' | 'denied' | 'unavailable' | 'error'

const DEBUG_UPDATE_MS = 250

const STATUS_MESSAGES: Record<BodyStatus, string> = {
  none: 'No person detected — step into view',
  partial: 'Whole body not visible — step back from the camera',
  full: 'Full body detected — all measurement points tracked',
}

const EXPORT_BUFFER_FRAMES = 60

/** Landmarks the measurement math reads (calibration + lengths). */
const REFERENCE_LANDMARK_IDS = [2, 5, 11, 12, 13, 14, 15, 16, 23, 24, 29, 30]

/** The exact segments measured: shoulder line and both arm paths. */
const MEASUREMENT_CONNECTIONS = [
  { start: 11, end: 12 },
  { start: 11, end: 13 },
  { start: 13, end: 15 },
  { start: 12, end: 14 },
  { start: 14, end: 16 },
]

const MEASUREMENT_COLOR = '#3b82f6'

/** Torso chord (shoulder mid → hip mid) and inseam line (hip mid → heel mid). */
function drawMeasurementMidlines(
  ctx: CanvasRenderingContext2D,
  pose: NormalizedLandmark[],
  width: number,
  height: number,
) {
  const point = (i: number) => {
    const lm = pose[i]
    return lm ? { x: lm.x * width, y: lm.y * height } : null
  }
  const midpoint = (
    a: { x: number; y: number } | null,
    b: { x: number; y: number } | null,
  ) => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null)

  const shoulderMid = midpoint(point(11), point(12))
  const hipMid = midpoint(point(23), point(24))
  const heelMid = midpoint(point(29), point(30))
  if (!shoulderMid || !hipMid) return

  ctx.strokeStyle = MEASUREMENT_COLOR
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(shoulderMid.x, shoulderMid.y)
  ctx.lineTo(hipMid.x, hipMid.y)
  if (heelMid) ctx.lineTo(heelMid.x, heelMid.y)
  ctx.stroke()
}

interface ExportFrame {
  timestampMs: number
  landmarks: NormalizedLandmark[]
}

interface CameraViewProps {
  /** Called for every processed video frame with the selected pose. */
  onFrame?: (
    pose: NormalizedLandmark[] | null,
    dims: FrameDims,
    nowMs: number,
  ) => void
  /**
   * Suppress the built-in body-status voice and overlay — used when a
   * parent (capture wizard) provides its own guidance.
   */
  quiet?: boolean
  /** Run segmentation masks and report the silhouette width profile. */
  withMasks?: boolean
  /** Called per frame with the mask's width-per-row profile. */
  onProfile?: (profile: number[], dims: FrameDims, nowMs: number) => void
}

export function CameraView({
  onFrame,
  quiet = false,
  withMasks = false,
  onProfile,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onFrameRef = useRef(onFrame)
  const onProfileRef = useRef(onProfile)
  const quietRef = useRef(quiet)
  useEffect(() => {
    onFrameRef.current = onFrame
    onProfileRef.current = onProfile
    quietRef.current = quiet
  })
  const exportFramesRef = useRef<ExportFrame[]>([])
  const [state, setState] = useState<CameraState>('starting')
  const [mirrored, setMirrored] = useState(false)
  const [bodyStatus, setBodyStatus] = useState<BodyStatus>('none')
  const [fps, setFps] = useState(0)
  const [visibilities, setVisibilities] = useState<number[]>([])
  const [debugOpen, setDebugOpen] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const announcerRef = useRef<VoiceAnnouncer | null>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let cancelled = false
    let rafId = 0
    let stream: MediaStream | null = null
    let landmarker: PoseLandmarker | null = null
    let lastVideoTime = -1
    let lastDebugUpdate = 0
    const fpsMeter = new FpsMeter()
    const statusDebouncer = new StatusDebouncer()
    const announcer = new VoiceAnnouncer()
    announcerRef.current = announcer

    const frame = () => {
      if (cancelled || document.hidden) return
      rafId = requestAnimationFrame(frame)
      if (!landmarker || video.readyState < 2) return
      if (video.currentTime === lastVideoTime) return
      lastVideoTime = video.currentTime

      const nowMs = performance.now()
      const result = landmarker.detectForVideo(video, nowMs)
      const currentFps = fpsMeter.tick(nowMs)
      const pose = selectMostProminent(result.landmarks)

      const mask = result.segmentationMasks?.[0]
      if (mask) {
        if (onProfileRef.current) {
          const profile = extractWidthProfile(
            mask.getAsFloat32Array(),
            mask.width,
            mask.height,
          )
          onProfileRef.current(
            profile,
            { width: mask.width, height: mask.height },
            nowMs,
          )
        }
        // MPMask objects must be released, and result arrays can hold
        // one mask per detected pose
        for (const m of result.segmentationMasks ?? []) m.close()
      }

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (pose) {
          const drawer = new DrawingUtils(ctx)
          drawer.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS, {
            color: '#22c55e',
            lineWidth: 2,
          })
          drawer.drawLandmarks(pose, { color: '#f97316', radius: 3 })
          // measurement reference overlay: blue = measured segments,
          // red = the landmarks the math reads
          drawer.drawConnectors(pose, MEASUREMENT_CONNECTIONS, {
            color: MEASUREMENT_COLOR,
            lineWidth: 5,
          })
          drawMeasurementMidlines(ctx, pose, canvas.width, canvas.height)
          const referencePoints = REFERENCE_LANDMARK_IDS.flatMap((i) => {
            const lm = pose[i]
            return lm ? [lm] : []
          })
          drawer.drawLandmarks(referencePoints, {
            color: '#ef4444',
            fillColor: '#ef4444',
            radius: 6,
          })
        }
      }

      const stableStatus = statusDebouncer.tick(computeBodyStatus(pose), nowMs)
      if (stableStatus !== null) {
        setBodyStatus(stableStatus)
        if (!quietRef.current) {
          announcer.speak(STATUS_MESSAGES[stableStatus], nowMs)
        }
      }

      onFrameRef.current?.(
        pose,
        { width: canvas.width, height: canvas.height },
        nowMs,
      )
      if (pose) {
        const buffer = exportFramesRef.current
        buffer.push({ timestampMs: nowMs, landmarks: pose })
        if (buffer.length > EXPORT_BUFFER_FRAMES) buffer.shift()
      }
      if (nowMs - lastDebugUpdate >= DEBUG_UPDATE_MS) {
        lastDebugUpdate = nowMs
        setFps(currentFps)
        setVisibilities(pose ? pose.map((lm) => lm.visibility ?? 0) : [])
      }
    }

    const startLoop = () => {
      cancelAnimationFrame(rafId)
      fpsMeter.reset()
      lastVideoTime = -1
      rafId = requestAnimationFrame(frame)
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
      } else {
        startLoop()
      }
    }

    const setup = async () => {
      try {
        // Rear camera preferred on phones (subject stands away from the
        // device); laptops fall back to their front/built-in camera.
        const [mediaStream, poseLandmarker] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          }),
          createPoseLandmarker({ withMasks }),
        ])
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop())
          poseLandmarker.close()
          return
        }
        stream = mediaStream
        landmarker = poseLandmarker

        const track = mediaStream.getVideoTracks()[0]
        setMirrored(track?.getSettings().facingMode !== 'environment')

        video.srcObject = mediaStream
        await video.play()
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        setState('running')
        startLoop()
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            setState('denied')
            return
          }
          if (
            err.name === 'NotFoundError' ||
            err.name === 'OverconstrainedError'
          ) {
            setState('unavailable')
            return
          }
        }
        setState('error')
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    void setup()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stream?.getTracks().forEach((t) => t.stop())
      landmarker?.close()
      announcer.stop()
      announcerRef.current = null
    }
  }, [withMasks])

  if (state === 'denied') {
    return (
      <div className="camera-error">
        <p>Camera access was denied.</p>
        <p>
          FitCheck needs the camera to estimate your measurements — nothing is
          recorded or uploaded. Allow camera access for this site in your
          browser settings, then reload the page.
        </p>
      </div>
    )
  }
  if (state === 'unavailable') {
    return (
      <div className="camera-error">
        <p>No usable camera was found on this device.</p>
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div className="camera-error">
        <p>The camera could not be started. Reload the page to try again.</p>
      </div>
    )
  }

  const stageClass = [
    'camera-stage',
    mirrored ? 'mirrored' : '',
    state === 'running' && bodyStatus === 'full' ? 'tracking' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="camera-view">
      <div className={stageClass}>
        <span className="vf-corner vf-corner--tl" aria-hidden="true" />
        <span className="vf-corner vf-corner--tr" aria-hidden="true" />
        <span className="vf-corner vf-corner--bl" aria-hidden="true" />
        <span className="vf-corner vf-corner--br" aria-hidden="true" />
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        {state === 'starting' && (
          <p className="camera-status">Starting camera…</p>
        )}
        {state === 'running' && !quiet && (
          <p
            className={`camera-status${bodyStatus === 'full' ? ' status-ok' : ''}`}
          >
            {STATUS_MESSAGES[bodyStatus]}
          </p>
        )}
      </div>
      <div className="camera-controls">
        <button
          type="button"
          className="debug-toggle"
          onClick={() => {
            const next = !voiceOn
            setVoiceOn(next)
            const announcer = announcerRef.current
            if (announcer) {
              announcer.enabled = next
              if (!next) announcer.stop()
            }
          }}
        >
          {voiceOn ? 'Voice on' : 'Voice off'}
        </button>
        <button
          type="button"
          className="debug-toggle"
          onClick={() => setDebugOpen((open) => !open)}
        >
          {debugOpen ? 'Hide debug' : 'Show debug'}
        </button>
        {debugOpen && (
          <button
            type="button"
            className="debug-toggle"
            onClick={() => {
              const canvas = canvasRef.current
              const payload = {
                recordedAt: new Date().toISOString(),
                dims: canvas
                  ? { width: canvas.width, height: canvas.height }
                  : null,
                frames: exportFramesRef.current,
              }
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json',
              })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `landmarks-${Date.now()}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export landmarks
          </button>
        )}
      </div>
      {debugOpen && <DebugPanel fps={fps} visibilities={visibilities} />}
    </div>
  )
}
