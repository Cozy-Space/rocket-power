import { describe, expect, it } from 'vitest';
import {
  firstUnfinished,
  fnv1a,
  openProgress,
  recordRun,
  sealProgress,
  xorBytes,
  type Progress,
} from './progress';

/** Deterministic "random" pad for tests. */
function fakeRandom(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, i) => (i * 37 + 11) & 0xff);
}

describe('recordRun', () => {
  it('creates stats on the first play', () => {
    expect(recordRun({}, 2, false, 5000)).toEqual({ 2: { plays: 1, bestMs: null } });
  });

  it('sets the best time only when landing', () => {
    let p: Progress = {};
    p = recordRun(p, 0, false, 4000);
    expect(p[0].bestMs).toBeNull();
    p = recordRun(p, 0, true, 9000);
    expect(p[0]).toEqual({ plays: 2, bestMs: 9000 });
  });

  it('keeps the best time when a landing is slower', () => {
    let p = recordRun({}, 1, true, 7000);
    p = recordRun(p, 1, true, 8000);
    expect(p[1]).toEqual({ plays: 2, bestMs: 7000 });
    p = recordRun(p, 1, true, 6500);
    expect(p[1]).toEqual({ plays: 3, bestMs: 6500 });
  });

  it('does not mutate the previous progress', () => {
    const before: Progress = { 0: { plays: 1, bestMs: 1000 } };
    recordRun(before, 0, true, 500);
    expect(before[0]).toEqual({ plays: 1, bestMs: 1000 });
  });
});

describe('firstUnfinished', () => {
  it('starts at level 0 with no progress', () => {
    expect(firstUnfinished({}, 13)).toBe(0);
  });

  it('skips landed levels but not merely played ones', () => {
    const p: Progress = {
      0: { plays: 3, bestMs: 41000 },
      1: { plays: 2, bestMs: null },
      2: { plays: 1, bestMs: 60000 },
    };
    expect(firstUnfinished(p, 13)).toBe(1);
  });

  it('continues past a landed prefix', () => {
    const p: Progress = { 0: { plays: 1, bestMs: 1 }, 1: { plays: 1, bestMs: 2 } };
    expect(firstUnfinished(p, 13)).toBe(2);
  });

  it('wraps to level 0 when everything is finished', () => {
    const p: Progress = { 0: { plays: 1, bestMs: 1 }, 1: { plays: 1, bestMs: 2 } };
    expect(firstUnfinished(p, 2)).toBe(0);
  });
});

describe('seal/open round trip', () => {
  const progress: Progress = { 0: { plays: 3, bestMs: 41300 }, 4: { plays: 1, bestMs: null } };

  it('recovers the exact progress', () => {
    const { cipher, pad } = sealProgress(progress, fakeRandom);
    expect(openProgress(cipher, pad)).toEqual(progress);
  });

  it('produces ciphertext that differs from the plaintext', () => {
    const { cipher, pad } = sealProgress(progress, fakeRandom);
    const plain = xorBytes(cipher, pad);
    expect(cipher).not.toEqual(plain);
  });

  it('rejects a flipped cipher byte', () => {
    const { cipher, pad } = sealProgress(progress, fakeRandom);
    cipher[cipher.length - 2] ^= 0x01;
    expect(openProgress(cipher, pad)).toBeNull();
  });

  it('rejects a wrong pad', () => {
    const { cipher } = sealProgress(progress, fakeRandom);
    const wrongPad = fakeRandom(cipher.length).map((b) => b ^ 0xff);
    expect(openProgress(cipher, wrongPad)).toBeNull();
  });

  it('rejects mismatched or truncated inputs', () => {
    const { cipher, pad } = sealProgress(progress, fakeRandom);
    expect(openProgress(cipher.subarray(1), pad)).toBeNull();
    expect(openProgress(new Uint8Array(3), new Uint8Array(3))).toBeNull();
  });

  it('rejects structurally invalid payloads', () => {
    const bad = [
      '[1,2]',
      '{"x":{"plays":1,"bestMs":null}}',
      '{"0":{"plays":0,"bestMs":null}}',
      '{"0":{"plays":1,"bestMs":"fast"}}',
      '{"0":{"plays":1.5,"bestMs":2}}',
    ];
    for (const json of bad) {
      // Build a well-formed sealed blob around the hostile JSON payload.
      const payload = new TextEncoder().encode(json);
      const plain = new Uint8Array(6 + payload.length);
      plain[0] = 0x52;
      plain[1] = 1;
      new DataView(plain.buffer).setUint32(2, fnv1a(payload));
      plain.set(payload, 6);
      const otp = fakeRandom(plain.length);
      expect(openProgress(xorBytes(plain, otp), otp)).toBeNull();
    }
  });
});
