import { describe, expect, it } from 'vitest';
import { angleDeviationFromUpright, evaluateTouchdown, speed } from './landing';
import type { LandingThresholds, TouchdownInfo } from './types';

const thresholds: LandingThresholds = { maxSpeed: 100, maxAngleDeg: 12 };

function touchdown(overrides: Partial<TouchdownInfo> = {}): TouchdownInfo {
  return {
    velocityX: 0,
    velocityY: 50,
    angleDeg: 0,
    contactFromBelow: true,
    onPad: true,
    ...overrides,
  };
}

describe('speed', () => {
  it('combines both components', () => {
    expect(speed(3, 4)).toBe(5);
  });
});

describe('angleDeviationFromUpright', () => {
  it('is zero when upright', () => {
    expect(angleDeviationFromUpright(0)).toBe(0);
  });

  it('handles plain tilts in both directions', () => {
    expect(angleDeviationFromUpright(10)).toBe(10);
    expect(angleDeviationFromUpright(-10)).toBe(10);
  });

  it('handles wraparound beyond ±180', () => {
    expect(angleDeviationFromUpright(-350)).toBe(10);
    expect(angleDeviationFromUpright(350)).toBe(10);
    expect(angleDeviationFromUpright(720)).toBe(0);
  });

  it('treats upside down as maximum deviation', () => {
    expect(angleDeviationFromUpright(180)).toBe(180);
    expect(angleDeviationFromUpright(-180)).toBe(180);
  });
});

describe('evaluateTouchdown', () => {
  it('lands when gentle, upright, and on the pad', () => {
    expect(evaluateTouchdown(touchdown(), thresholds)).toEqual({ outcome: 'landed' });
  });

  it('crashes on side or ceiling impact regardless of speed', () => {
    const result = evaluateTouchdown(
      touchdown({ contactFromBelow: false, velocityY: 1 }),
      thresholds,
    );
    expect(result).toEqual({ outcome: 'crashed', reason: 'side-impact' });
  });

  it('crashes when touching down off the pad', () => {
    const result = evaluateTouchdown(touchdown({ onPad: false }), thresholds);
    expect(result).toEqual({ outcome: 'crashed', reason: 'not-on-pad' });
  });

  it('crashes when descending too fast', () => {
    const result = evaluateTouchdown(touchdown({ velocityY: 150 }), thresholds);
    expect(result).toEqual({ outcome: 'crashed', reason: 'too-fast' });
  });

  it('crashes when tilted beyond the angle threshold', () => {
    const result = evaluateTouchdown(touchdown({ angleDeg: 20 }), thresholds);
    expect(result).toEqual({ outcome: 'crashed', reason: 'bad-angle' });
  });

  it('checks side impact before pad, speed, and angle', () => {
    const result = evaluateTouchdown(
      touchdown({ contactFromBelow: false, onPad: false, velocityY: 500, angleDeg: 90 }),
      thresholds,
    );
    expect(result).toEqual({ outcome: 'crashed', reason: 'side-impact' });
  });

  it('accepts speed and angle exactly at the thresholds', () => {
    const result = evaluateTouchdown(touchdown({ velocityY: 100, angleDeg: 12 }), thresholds);
    expect(result).toEqual({ outcome: 'landed' });
  });
});
