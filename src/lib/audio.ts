let audioContext: AudioContext | null = null

/**
 * Short progress beep (WebAudio, fully local). Distinct pitches:
 * countdown ticks low, capture confirmation high.
 */
export function beep(frequencyHz = 880, durationMs = 120): void {
  if (typeof AudioContext === 'undefined') return
  try {
    audioContext ??= new AudioContext()
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.frequency.value = frequencyHz
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + durationMs / 1000,
    )
    osc.connect(gain)
    gain.connect(audioContext.destination)
    osc.start()
    osc.stop(audioContext.currentTime + durationMs / 1000)
  } catch {
    // audio is non-essential guidance; never break capture over it
  }
}
