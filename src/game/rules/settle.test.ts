import { describe, expect, it } from 'vitest';
import { createSettle, stepSettle, type SettleConfig, type SettleState } from './settle';

const cfg: SettleConfig = {
  criticalAngleDeg: 25,
  gravityGain: 600,
  damping: 0.8,
  slamRestitution: 0.45,
  restAngleDeg: 1,
  restAngularVelDeg: 5,
  tippedAngleDeg: 88,
};

/** Steps at 60fps until the sim resolves (capped at 50 simulated seconds). */
function settleOut(state: SettleState): SettleState {
  let s = state;
  for (let i = 0; i < 3000 && s.status === 'settling'; i++) {
    s = stepSettle(s, 1000 / 60, cfg);
  }
  return s;
}

describe('createSettle', () => {
  it('is upright immediately when flat and still', () => {
    expect(createSettle(0, 0, cfg).status).toBe('upright');
  });

  it('is tipped immediately when arriving past the tipped angle', () => {
    const s = createSettle(120, 0, cfg);
    expect(s.status).toBe('tipped');
    expect(s.angleDeg).toBe(90);
  });

  it('wraps out-of-range angles', () => {
    const s = createSettle(350, 0, cfg); // same as -10°
    expect(s.status).toBe('settling');
    expect(s.angleDeg).toBe(-10);
  });
});

describe('stepSettle', () => {
  it('rocks back upright from a gentle tilt', () => {
    const s = settleOut(createSettle(12, 0, cfg));
    expect(s.status).toBe('upright');
    expect(s.angleDeg).toBe(0);
  });

  it('tips over past the critical angle', () => {
    const s = settleOut(createSettle(45, 0, cfg));
    expect(s.status).toBe('tipped');
    expect(s.angleDeg).toBe(90);
  });

  it('tips to the matching side', () => {
    expect(settleOut(createSettle(-45, 0, cfg)).angleDeg).toBe(-90);
  });

  it('tips from a gentle tilt when spinning hard', () => {
    const s = settleOut(createSettle(10, 200, cfg));
    expect(s.status).toBe('tipped');
  });

  it('recovers from a gentle tilt with mild spin', () => {
    const s = settleOut(createSettle(10, 20, cfg));
    expect(s.status).toBe('upright');
  });

  it('resolves within a few seconds, not instantly', () => {
    let s = createSettle(12, 0, cfg);
    s = stepSettle(s, 1000 / 60, cfg);
    expect(s.status).toBe('settling'); // there is a visible wobble phase
    expect(settleOut(s).status).toBe('upright');
  });

  it('is a no-op on resolved states', () => {
    const done = settleOut(createSettle(45, 0, cfg));
    expect(stepSettle(done, 16, cfg)).toEqual(done);
  });
});
