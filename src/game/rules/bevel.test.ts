import { describe, expect, it } from 'vitest';
import { bevelGid } from './bevel';
import { EXPOSED_E, EXPOSED_N, EXPOSED_S, EXPOSED_W } from './borders';

describe('bevelGid', () => {
  it('bevels each convex corner into the matching triangle', () => {
    expect(bevelGid(EXPOSED_N | EXPOSED_E)).toBe(3); // step's top-right corner
    expect(bevelGid(EXPOSED_N | EXPOSED_W)).toBe(4); // step's top-left corner
    expect(bevelGid(EXPOSED_S | EXPOSED_E)).toBe(5); // overhang's bottom-right corner
    expect(bevelGid(EXPOSED_S | EXPOSED_W)).toBe(6); // overhang's bottom-left corner
  });

  it('keeps flat faces, tunnels and interiors square', () => {
    expect(bevelGid(0)).toBeNull(); // interior
    expect(bevelGid(EXPOSED_N)).toBeNull(); // flat floor surface
    expect(bevelGid(EXPOSED_N | EXPOSED_S)).toBeNull(); // 1-tile shelf
    expect(bevelGid(EXPOSED_E | EXPOSED_W)).toBeNull(); // 1-tile wall
  });

  it('keeps peninsulas and free-standing tiles square', () => {
    expect(bevelGid(EXPOSED_N | EXPOSED_E | EXPOSED_W)).toBeNull(); // pillar tip
    expect(bevelGid(EXPOSED_N | EXPOSED_E | EXPOSED_S | EXPOSED_W)).toBeNull(); // 1x1 island
  });
});
