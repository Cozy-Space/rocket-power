import type { LandingThresholds, TouchdownInfo, TouchdownResult } from './types';

export function speed(vx: number, vy: number): number {
  return Math.hypot(vx, vy);
}

/** Absolute deviation from upright in degrees, handling angle wrap (e.g. -350° ⇒ 10°). */
export function angleDeviationFromUpright(angleDeg: number): number {
  const wrapped = (((angleDeg % 360) + 540) % 360) - 180;
  return Math.abs(wrapped);
}

/**
 * Judges the first terrain contact of a run.
 * Crash reasons are checked in order: side impact, off pad, too fast, bad angle.
 */
export function evaluateTouchdown(
  info: TouchdownInfo,
  thresholds: LandingThresholds,
): TouchdownResult {
  if (!info.contactFromBelow) {
    return { outcome: 'crashed', reason: 'side-impact' };
  }
  if (!info.onPad) {
    return { outcome: 'crashed', reason: 'not-on-pad' };
  }
  if (speed(info.velocityX, info.velocityY) > thresholds.maxSpeed) {
    return { outcome: 'crashed', reason: 'too-fast' };
  }
  if (angleDeviationFromUpright(info.angleDeg) > thresholds.maxAngleDeg) {
    return { outcome: 'crashed', reason: 'bad-angle' };
  }
  return { outcome: 'landed' };
}
