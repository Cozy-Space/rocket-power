import { describe, expect, it } from 'vitest';
import { evaluateTouchdown, speed } from './landing';
import type { LandingThresholds, TouchdownInfo } from './types';

const thresholds: LandingThresholds = { maxSpeed: 130 };

function touchdown(overrides: Partial<TouchdownInfo> = {}): TouchdownInfo {
  return {
    velocityX: 0,
    velocityY: 50,
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

describe('evaluateTouchdown', () => {
  it('survives a gentle touchdown on the pad', () => {
    expect(evaluateTouchdown(touchdown(), thresholds)).toEqual({ ok: true });
  });

  it('crashes on side or ceiling impact regardless of speed', () => {
    const result = evaluateTouchdown(
      touchdown({ contactFromBelow: false, velocityY: 1 }),
      thresholds,
    );
    expect(result).toEqual({ ok: false, reason: 'side-impact' });
  });

  it('crashes when touching down off the pad', () => {
    const result = evaluateTouchdown(touchdown({ onPad: false }), thresholds);
    expect(result).toEqual({ ok: false, reason: 'not-on-pad' });
  });

  it('crashes when descending too fast', () => {
    const result = evaluateTouchdown(touchdown({ velocityY: 180 }), thresholds);
    expect(result).toEqual({ ok: false, reason: 'too-fast' });
  });

  it('checks side impact before pad and speed', () => {
    const result = evaluateTouchdown(
      touchdown({ contactFromBelow: false, onPad: false, velocityY: 500 }),
      thresholds,
    );
    expect(result).toEqual({ ok: false, reason: 'side-impact' });
  });

  it('accepts speed exactly at the threshold', () => {
    const result = evaluateTouchdown(touchdown({ velocityY: 130 }), thresholds);
    expect(result).toEqual({ ok: true });
  });
});
