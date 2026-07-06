import { describe, expect, it } from 'vitest';
import {
  createSettle,
  stepSettle,
  type SettleConfig,
  type SettleState,
  type TouchdownState,
} from './settle';

const cfg: SettleConfig = {
  criticalAngleDeg: 25,
  gravityGain: 600,
  damping: 0.8,
  slamRestitution: 0.45,
  restAngleDeg: 1,
  restAngularVelDeg: 5,
  tippedAngleDeg: 88,
  gravity: 200,
  restitution: 0.35,
  bounceMinSpeed: 60,
  slideKeep: 0.6,
  slideFriction: 2.5,
  vxTipFactor: 0.6,
  restSlideSpeed: 5,
};

function touchdown(overrides: Partial<TouchdownState> = {}): TouchdownState {
  return { angleDeg: 0, angularVelDeg: 0, velocityX: 0, velocityY: 30, ...overrides };
}

/** Steps at 60fps until the sim resolves (capped at 50 simulated seconds). */
function settleOut(state: SettleState): SettleState {
  let s = state;
  for (let i = 0; i < 3000 && s.status === 'settling'; i++) {
    s = stepSettle(s, 1000 / 60, cfg);
  }
  return s;
}

describe('createSettle', () => {
  it('is upright immediately after a soft, straight, still touchdown', () => {
    expect(createSettle(touchdown(), cfg).status).toBe('upright');
  });

  it('is tipped immediately when arriving past the tipped angle', () => {
    const s = createSettle(touchdown({ angleDeg: 120 }), cfg);
    expect(s.status).toBe('tipped');
    expect(s.angleDeg).toBe(90);
  });

  it('wraps out-of-range angles', () => {
    const s = createSettle(touchdown({ angleDeg: 350 }), cfg); // same as -10°
    expect(s.status).toBe('settling');
    expect(s.angleDeg).toBe(-10);
  });
});

describe('rocking', () => {
  it('rocks back upright from a gentle tilt', () => {
    const s = settleOut(createSettle(touchdown({ angleDeg: 12 }), cfg));
    expect(s.status).toBe('upright');
    expect(s.angleDeg).toBe(0);
  });

  it('tips over past the critical angle', () => {
    const s = settleOut(createSettle(touchdown({ angleDeg: 45 }), cfg));
    expect(s.status).toBe('tipped');
    expect(s.angleDeg).toBe(90);
  });

  it('tips to the matching side', () => {
    expect(settleOut(createSettle(touchdown({ angleDeg: -45 }), cfg)).angleDeg).toBe(-90);
  });

  it('tips from a gentle tilt when spinning hard', () => {
    const s = settleOut(createSettle(touchdown({ angleDeg: 10, angularVelDeg: 200 }), cfg));
    expect(s.status).toBe('tipped');
  });

  it('recovers from a gentle tilt with mild spin', () => {
    const s = settleOut(createSettle(touchdown({ angleDeg: 10, angularVelDeg: 20 }), cfg));
    expect(s.status).toBe('upright');
  });
});

describe('bouncing', () => {
  it('does not bounce below the bounce threshold', () => {
    const s = createSettle(touchdown({ velocityY: 50 }), cfg);
    expect(s.upVel).toBe(0);
  });

  it('bounces on a hard vertical impact and still lands upright', () => {
    let s = createSettle(touchdown({ velocityY: 300 }), cfg);
    expect(s.upVel).toBeGreaterThan(0);
    let peak = 0;
    for (let i = 0; i < 3000 && s.status === 'settling'; i++) {
      s = stepSettle(s, 1000 / 60, cfg);
      peak = Math.max(peak, s.height);
    }
    expect(peak).toBeGreaterThan(10); // it visibly hopped
    expect(s.status).toBe('upright');
  });

  it('keeps rotating through a hop when tilted', () => {
    const s0 = createSettle(touchdown({ velocityY: 300, angleDeg: 40 }), cfg);
    const s = settleOut(s0);
    expect(s.status).toBe('tipped');
  });
});

describe('horizontal momentum', () => {
  it('tips an upright rocket that lands drifting sideways fast', () => {
    const s = settleOut(createSettle(touchdown({ velocityX: 300 }), cfg));
    expect(s.status).toBe('tipped');
    expect(s.angleDeg).toBe(90); // tips in the direction of travel
  });

  it('tips to the left when drifting left', () => {
    const s = settleOut(createSettle(touchdown({ velocityX: -300 }), cfg));
    expect(s.angleDeg).toBe(-90);
  });

  it('survives a mild sideways drift with a wobble', () => {
    const s = settleOut(createSettle(touchdown({ velocityX: 60 }), cfg));
    expect(s.status).toBe('upright');
  });

  it('combines tilt and drift: either alone survivable, together fatal', () => {
    expect(settleOut(createSettle(touchdown({ angleDeg: 12 }), cfg)).status).toBe('upright');
    expect(settleOut(createSettle(touchdown({ velocityX: 100 }), cfg)).status).toBe('upright');
    const both = settleOut(createSettle(touchdown({ angleDeg: 12, velocityX: 100 }), cfg));
    expect(both.status).toBe('tipped');
  });

  it('skids along the pad while settling', () => {
    const s = settleOut(createSettle(touchdown({ velocityX: 60 }), cfg));
    expect(s.slideOffset).toBeGreaterThan(5);
  });
});

describe('stepSettle', () => {
  it('resolves within a few seconds, not instantly', () => {
    let s = createSettle(touchdown({ angleDeg: 12 }), cfg);
    s = stepSettle(s, 1000 / 60, cfg);
    expect(s.status).toBe('settling'); // there is a visible wobble phase
    expect(settleOut(s).status).toBe('upright');
  });

  it('is a no-op on resolved states', () => {
    const done = settleOut(createSettle(touchdown({ angleDeg: 45 }), cfg));
    expect(stepSettle(done, 16, cfg)).toEqual(done);
  });
});
