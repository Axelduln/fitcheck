const REPEAT_COOLDOWN_MS = 5000

/**
 * Spoken guidance via the browser's built-in speech synthesis.
 *
 * Privacy: only voices with `localService: true` are used — some
 * browsers (Chrome) offer cloud voices that would send the text to a
 * server. If no local English voice exists, announcements are skipped
 * and the on-screen messages remain the only guidance.
 */
export class VoiceAnnouncer {
  enabled = true
  private lastText = ''
  private lastTimeMs = -Infinity

  constructor() {
    if (typeof speechSynthesis !== 'undefined') {
      // Chrome populates getVoices() asynchronously; touching it early
      // warms the list so the first announcement can find a voice.
      speechSynthesis.getVoices()
    }
  }

  speak(text: string, nowMs: number): void {
    if (!this.enabled || typeof speechSynthesis === 'undefined') return
    if (text === this.lastText && nowMs - this.lastTimeMs < REPEAT_COOLDOWN_MS)
      return
    const voice = speechSynthesis
      .getVoices()
      .find((v) => v.localService && v.lang.startsWith('en'))
    if (!voice) return
    this.lastText = text
    this.lastTimeMs = nowMs
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    speechSynthesis.speak(utterance)
  }

  stop(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }
}
