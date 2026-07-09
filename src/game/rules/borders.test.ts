import { describe, expect, it } from 'vitest';
import {
  BORDER_FIRST_GID,
  borderedGid,
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

  it('treats already-bordered rock as cover', () => {
    const g = (_x: number, y: number) => (y === 0 ? BORDER_FIRST_GID : ROCK);
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

describe('borderedGid', () => {
  it('keeps plain rock unexposed', () => {
    expect(borderedGid(0)).toBe(ROCK);
  });

  it('maps each mask to its own gid', () => {
    const gids = new Set<number>();
    for (let mask = 1; mask <= 15; mask++) gids.add(borderedGid(mask));
    expect(gids.size).toBe(15);
    expect(Math.min(...gids)).toBe(BORDER_FIRST_GID);
    expect(Math.max(...gids)).toBe(BORDER_FIRST_GID + 14);
  });
});
