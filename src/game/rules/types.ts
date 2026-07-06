export interface LandingThresholds {
  /** Max impact speed (px/s) for a survivable touchdown. */
  maxSpeed: number;
}

export interface TouchdownInfo {
  /** Pre-impact velocity in px/s. */
  velocityX: number;
  velocityY: number;
  /** True when the contact came from below (rocket standing on something). */
  contactFromBelow: boolean;
  /** True when the touchdown point is on the landing pad. */
  onPad: boolean;
}

export type CrashReason = 'side-impact' | 'not-on-pad' | 'too-fast' | 'tipped-over';

/**
 * Instant verdict at the moment of contact. `ok` means the rocket survived
 * the touchdown — whether it stays upright is decided by the settle phase.
 */
export type TouchdownCheck =
  { ok: true } | { ok: false; reason: Exclude<CrashReason, 'tipped-over'> };

export type RunResult = { outcome: 'landed' } | { outcome: 'crashed'; reason: CrashReason };
