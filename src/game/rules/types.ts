export interface LandingThresholds {
  /** Max impact speed (px/s) for a soft landing. */
  maxSpeed: number;
  /** Max deviation from upright (degrees) for a valid landing. */
  maxAngleDeg: number;
}

export interface TouchdownInfo {
  /** Pre-impact velocity in px/s. */
  velocityX: number;
  velocityY: number;
  /** Rocket angle in degrees, 0 = upright. May be outside ±180. */
  angleDeg: number;
  /** True when the contact came from below (rocket standing on something). */
  contactFromBelow: boolean;
  /** True when the touchdown point is on the landing pad. */
  onPad: boolean;
}

export type CrashReason = 'side-impact' | 'not-on-pad' | 'too-fast' | 'bad-angle';

export type TouchdownResult = { outcome: 'landed' } | { outcome: 'crashed'; reason: CrashReason };
