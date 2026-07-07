import { useCallback, useRef, useState } from 'react'
import { CameraView } from './CameraView'
import type { NormalizedLandmark } from '../lib/pose'
import type { FrameDims } from '../lib/measurements'
import { assessFrame, assessSideFrame, QUALITY_GUIDANCE } from '../lib/quality'
import { CaptureCountdown, type CapturedPose } from '../lib/captureSession'
import { medianProfile } from '../lib/silhouette'
import { VoiceAnnouncer } from '../lib/speech'
import { beep } from '../lib/audio'

/** Rolling mask profiles kept for the capture-time median. */
const PROFILE_BUFFER = 10

interface PoseCaptureStepProps {
  mode: 'front' | 'side'
  instruction: string
  onCaptured: (capture: CapturedPose) => void
}

const COUNTDOWN_BEEP_HZ = 660
const CAPTURED_BEEP_HZ = 1320
/** How long the "Captured" confirmation shows before advancing. */
const CONFIRM_HOLD_MS = 1300

export function PoseCaptureStep({
  mode,
  instruction,
  onCaptured,
}: PoseCaptureStepProps) {
  const [message, setMessage] = useState(instruction)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const sessionRef = useRef(new CaptureCountdown())
  const announcerRef = useRef<VoiceAnnouncer | null>(null)
  const capturedRef = useRef(false)
  const profilesRef = useRef<number[][]>([])
  const activeModeRef = useRef(mode)

  const onProfile = useCallback((profile: number[]) => {
    if (capturedRef.current) return
    profilesRef.current.push(profile)
    if (profilesRef.current.length > PROFILE_BUFFER) profilesRef.current.shift()
  }, [])

  const onFrame = useCallback(
    (pose: NormalizedLandmark[] | null, dims: FrameDims, nowMs: number) => {
      // New pose (front → side): the camera keeps running underneath —
      // only the capture session restarts, on the first frame under the
      // new mode.
      if (activeModeRef.current !== mode) {
        activeModeRef.current = mode
        sessionRef.current = new CaptureCountdown()
        capturedRef.current = false
        profilesRef.current = []
        setConfirmed(false)
        setCountdown(null)
        setMessage(instruction)
      }
      if (capturedRef.current) return
      announcerRef.current ??= new VoiceAnnouncer()
      const announcer = announcerRef.current

      const quality = pose
        ? mode === 'front'
          ? assessFrame(pose, dims.width / dims.height)
          : assessSideFrame(pose, dims.width / dims.height)
        : { valid: false, issues: [] as const }

      if (!quality.valid && pose) {
        const issue = quality.issues[0]
        if (issue) {
          setMessage(QUALITY_GUIDANCE[issue])
          announcer.speak(QUALITY_GUIDANCE[issue], nowMs)
        }
      }

      const event = sessionRef.current.tick(quality.valid, pose, nowMs)
      if (!event) return

      if (event.type === 'countdown') {
        setCountdown(event.secondsLeft)
        setMessage('Hold still')
        beep(COUNTDOWN_BEEP_HZ)
        announcer.speak(String(event.secondsLeft), nowMs, { force: true })
      } else if (event.type === 'reset') {
        setCountdown(null)
      } else {
        capturedRef.current = true
        setCountdown(null)
        setConfirmed(true)
        setMessage(
          mode === 'front' ? 'Front pose captured' : 'Side pose captured',
        )
        beep(CAPTURED_BEEP_HZ, 250)
        announcer.speak('Captured', nowMs, { force: true })
        // Hold the confirmation on screen so the capture is unmistakable,
        // then hand off (front → side pose, side → results).
        const capture: CapturedPose = {
          frames: event.frames,
          dims,
          widthProfile: medianProfile(profilesRef.current),
        }
        window.setTimeout(() => onCaptured(capture), CONFIRM_HOLD_MS)
      }
    },
    [mode, instruction, onCaptured],
  )

  return (
    <div className="pose-capture">
      <CameraView onFrame={onFrame} onProfile={onProfile} quiet withMasks />
      <div className="hud-tag" aria-hidden="true">
        <span className="hud-dot" />
        {mode === 'front' ? 'scan 01 · front' : 'scan 02 · side'}
      </div>
      <div className="hud-segs" aria-hidden="true">
        <span className="hud-seg on" />
        <span className={mode === 'side' ? 'hud-seg on' : 'hud-seg'} />
      </div>
      {countdown !== null && (
        <div key={countdown} className="countdown">
          {countdown}
        </div>
      )}
      {confirmed && (
        <div className="capture-flash" aria-hidden="true">
          <span className="capture-check">✓ Captured</span>
        </div>
      )}
      <p className="measure-status">{message}</p>
    </div>
  )
}
