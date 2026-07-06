/** Run timer with injected clock so it stays testable and Phaser-free. */
export class RunTimer {
  private startedAt: number | null = null;
  private frozenElapsed: number | null = null;

  start(nowMs: number): void {
    this.startedAt = nowMs;
    this.frozenElapsed = null;
  }

  /** Freezes the elapsed time; further calls are ignored. */
  stop(nowMs: number): void {
    if (this.startedAt === null || this.frozenElapsed !== null) return;
    this.frozenElapsed = nowMs - this.startedAt;
  }

  elapsedMs(nowMs: number): number {
    if (this.startedAt === null) return 0;
    if (this.frozenElapsed !== null) return this.frozenElapsed;
    return nowMs - this.startedAt;
  }

  /** Formats milliseconds as "mm:ss.t", e.g. 83400 ⇒ "01:23.4". */
  static format(ms: number): string {
    const clamped = Math.max(0, ms);
    const minutes = Math.floor(clamped / 60000);
    const seconds = Math.floor((clamped % 60000) / 1000);
    const tenths = Math.floor((clamped % 1000) / 100);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${mm}:${ss}.${tenths}`;
  }
}
