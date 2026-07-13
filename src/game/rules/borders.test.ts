import { describe, expect, it } from 'vitest';
import {
  EXPOSED_E,
  EXPOSED_N,
  EXPOSED_S,
  EXPOSED_W,
  exposureMask,
  ROCK,
  type GidAt,
} from './borders';

/** Grid accessor over string rows; out of bounds reads as rock (map edge). */
function grid(rows: string[]): GidAt {
  return (x, y) => {
    const ch = rows[y]?.[x];
    return ch === undefined ? ROCK : Number(ch);
  };
}

describe('exposureMask', () => {
  it('is 0 deep inside rock', () => {
    const g = grid(['111', '111', '111']);
    expect(exposureMask(g, 1, 1)).toBe(0);
  });

  it('exposes only the side facing air', () => {
    const g = grid(['000', '111', '111']);
    expect(exposureMask(g, 1, 1)).toBe(EXPOSED_N);
  });

  it('exposes all four sides of a free-standing pillar', () => {
    const g = grid(['000', '010', '000']);
    expect(exposureMask(g, 1, 1)).toBe(EXPOSED_N | EXPOSED_E | EXPOSED_S | EXPOSED_W);
  });

  it('treats the pad (gid 2) as cover', () => {
    const g = grid(['020', '111', '111']);
    expect(exposureMask(g, 1, 1)).toBe(0);
  });

  it('covers only the solid edges of triangle neighbors', () => {
    // Rock below a bottom-left triangle (3): the triangle's bottom is solid.
    expect(exposureMask(grid(['030', '111', '111']), 1, 1)).toBe(0);
    // Rock below a top-left triangle (5): the triangle's bottom is empty.
    expect(exposureMask(grid(['050', '111', '111']), 1, 1)).toBe(EXPOSED_N);
    // Rock left of a bottom-right triangle (4): the triangle's left is empty.
    expect(exposureMask(grid(['114', '111', '111']), 1, 0)).toBe(EXPOSED_E);
    // Rock right of a bottom-right triangle (4): the triangle's right is solid.
    expect(exposureMask(grid(['411', '111', '111']), 1, 0)).toBe(0);
  });
});
