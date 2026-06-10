import { useEffect, useRef, useState } from 'react'
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision'
import {
  createPoseLandmarker,
  selectMostProminent,
  type NormalizedLandmark,
} from '../lib/pose'
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
}

export function CameraView({ onFrame }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
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

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (pose) {
          const drawer = new DrawingUtils(ctx)
          drawer.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS, {
            color: '#22c55e',
            lineWidth: 3,
          })
          drawer.drawLandmarks(pose, { color: '#f97316', radius: 4 })
        }
      }

      const stableStatus = statusDebouncer.tick(computeBodyStatus(pose), nowMs)
      if (stableStatus !== null) {
        setBodyStatus(stableStatus)
        announcer.speak(STATUS_MESSAGES[stableStatus], nowMs)
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
          createPoseLandmarker(),
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
  }, [])

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

  return (
    <div className="camera-view">
      <div className={`camera-stage${mirrored ? ' mirrored' : ''}`}>
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        {state === 'starting' && (
          <p className="camera-status">Starting camera…</p>
        )}
        {state === 'running' && (
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
