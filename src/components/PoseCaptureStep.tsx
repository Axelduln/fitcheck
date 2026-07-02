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

export function PoseCaptureStep({
  mode,
  instruction,
  onCaptured,
}: PoseCaptureStepProps) {
  const [message, setMessage] = useState(instruction)
  const [countdown, setCountdown] = useState<number | null>(null)
  const sessionRef = useRef(new CaptureCountdown())
  const announcerRef = useRef<VoiceAnnouncer | null>(null)
  const capturedRef = useRef(false)
  const profilesRef = useRef<number[][]>([])

  const onProfile = useCallback((profile: number[]) => {
    if (capturedRef.current) return
    profilesRef.current.push(profile)
    if (profilesRef.current.length > PROFILE_BUFFER) profilesRef.current.shift()
  }, [])

  const onFrame = useCallback(
    (pose: NormalizedLandmark[] | null, dims: FrameDims, nowMs: number) => {
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
        beep(CAPTURED_BEEP_HZ, 250)
        announcer.stop()
        onCaptured({
          frames: event.frames,
          dims,
          widthProfile: medianProfile(profilesRef.current),
        })
      }
    },
    [mode, onCaptured],
  )

  return (
    <div className="pose-capture">
      <CameraView onFrame={onFrame} onProfile={onProfile} quiet withMasks />
      {countdown !== null && (
        <div key={countdown} className="countdown">
          {countdown}
        </div>
      )}
      <p className="measure-status">{message}</p>
    </div>
  )
}
