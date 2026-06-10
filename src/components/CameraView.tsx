import { useEffect, useRef, useState } from 'react'
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision'
import { createPoseLandmarker, selectMostProminent } from '../lib/pose'
import { FpsMeter } from '../lib/fps'
import { DebugPanel } from './DebugPanel'

type CameraState = 'starting' | 'running' | 'denied' | 'unavailable' | 'error'

const DEBUG_UPDATE_MS = 250

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<CameraState>('starting')
  const [mirrored, setMirrored] = useState(false)
  const [personVisible, setPersonVisible] = useState(false)
  const [fps, setFps] = useState(0)
  const [visibilities, setVisibilities] = useState<number[]>([])
  const [debugOpen, setDebugOpen] = useState(false)

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
    let lastPersonVisible: boolean | null = null
    const fpsMeter = new FpsMeter()

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

      const visible = pose !== null
      if (visible !== lastPersonVisible) {
        lastPersonVisible = visible
        setPersonVisible(visible)
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
        {state === 'running' && !personVisible && (
          <p className="camera-status">No person detected — step into view</p>
        )}
      </div>
      <button
        type="button"
        className="debug-toggle"
        onClick={() => setDebugOpen((open) => !open)}
      >
        {debugOpen ? 'Hide debug' : 'Show debug'}
      </button>
      {debugOpen && <DebugPanel fps={fps} visibilities={visibilities} />}
    </div>
  )
}
