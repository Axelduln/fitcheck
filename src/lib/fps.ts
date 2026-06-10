const WINDOW_MS = 1000

/**
 * Rolling frames-per-second meter: counts frames recorded within the
 * last second.
 */
export class FpsMeter {
  private timestamps: number[] = []

  /** Record a frame at `nowMs` and return the current FPS. */
  tick(nowMs: number): number {
    this.timestamps.push(nowMs)
    const cutoff = nowMs - WINDOW_MS
    let firstInWindow = 0
    while (firstInWindow < this.timestamps.length) {
      const t = this.timestamps[firstInWindow]
      if (t === undefined || t > cutoff) break
      firstInWindow++
    }
    this.timestamps.splice(0, firstInWindow)
    return this.timestamps.length
  }

  reset(): void {
    this.timestamps = []
  }
}
