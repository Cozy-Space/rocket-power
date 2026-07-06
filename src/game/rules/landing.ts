import type { LandingThresholds, TouchdownCheck, TouchdownInfo } from './types';

export function speed(vx: number, vy: number): number {
  return Math.hypot(vx, vy);
}

/**
 * Judges the moment of first terrain contact. Crash reasons are checked in
 * order: side impact, off pad, too fast. Surviving the touchdown does not
 * mean the run is won — the settle phase (see settle.ts) decides whether the
 * rocket stays upright or tips over.
 */
export function evaluateTouchdown(
  info: TouchdownInfo,
  thresholds: LandingThresholds,
): TouchdownCheck {
  if (!info.contactFromBelow) {
    return { ok: false, reason: 'side-impact' };
  }
  if (!info.onPad) {
    return { ok: false, reason: 'not-on-pad' };
  }
  if (speed(info.velocityX, info.velocityY) > thresholds.maxSpeed) {
    return { ok: false, reason: 'too-fast' };
  }
  return { ok: true };
}
