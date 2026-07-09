import { describe, expect, it } from 'vitest';
import { rectOverlapsTriangle, type LocalRect, type TriangleKind } from './triangles';

const TILE = 64;

function rect(left: number, top: number, right: number, bottom: number): LocalRect {
  return { left, top, right, bottom };
}

describe('rectOverlapsTriangle', () => {
  it('hits when the rect covers the whole tile', () => {
    const kinds: TriangleKind[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
    for (const kind of kinds) {
      expect(rectOverlapsTriangle(kind, rect(-10, -10, 74, 74), TILE)).toBe(true);
    }
  });

  it('misses when the rect does not touch the tile at all', () => {
    expect(rectOverlapsTriangle('bottom-left', rect(70, 0, 90, 64), TILE)).toBe(false);
    expect(rectOverlapsTriangle('top-right', rect(0, -30, 64, -1), TILE)).toBe(false);
  });

  it('misses in the empty half, hits in the solid half', () => {
    // bottom-left: solid below the TL→BR diagonal
    expect(rectOverlapsTriangle('bottom-left', rect(40, 0, 64, 20), TILE)).toBe(false);
    expect(rectOverlapsTriangle('bottom-left', rect(0, 40, 20, 64), TILE)).toBe(true);

    // bottom-right: solid below the BL→TR diagonal
    expect(rectOverlapsTriangle('bottom-right', rect(0, 0, 20, 20), TILE)).toBe(false);
    expect(rectOverlapsTriangle('bottom-right', rect(50, 50, 64, 64), TILE)).toBe(true);

    // top-left: solid above the BL→TR diagonal
    expect(rectOverlapsTriangle('top-left', rect(50, 50, 64, 64), TILE)).toBe(false);
    expect(rectOverlapsTriangle('top-left', rect(0, 0, 20, 20), TILE)).toBe(true);

    // top-right: solid above the TL→BR diagonal
    expect(rectOverlapsTriangle('top-right', rect(0, 40, 20, 64), TILE)).toBe(false);
    expect(rectOverlapsTriangle('top-right', rect(40, 0, 64, 20), TILE)).toBe(true);
  });

  it('hits when the rect straddles the hypotenuse', () => {
    expect(rectOverlapsTriangle('bottom-left', rect(24, 24, 40, 40), TILE)).toBe(true);
    expect(rectOverlapsTriangle('bottom-right', rect(24, 24, 40, 40), TILE)).toBe(true);
    expect(rectOverlapsTriangle('top-left', rect(24, 24, 40, 40), TILE)).toBe(true);
    expect(rectOverlapsTriangle('top-right', rect(24, 24, 40, 40), TILE)).toBe(true);
  });

  it('treats grazing the hypotenuse exactly as no contact', () => {
    // Rect corner exactly on the diagonal line.
    expect(rectOverlapsTriangle('bottom-left', rect(32, 0, 64, 32), TILE)).toBe(false);
    expect(rectOverlapsTriangle('bottom-right', rect(0, 0, 32, 32), TILE)).toBe(false);
    expect(rectOverlapsTriangle('top-left', rect(32, 32, 64, 64), TILE)).toBe(false);
    expect(rectOverlapsTriangle('top-right', rect(0, 32, 32, 64), TILE)).toBe(false);
  });

  it('only counts the part of the rect inside the tile', () => {
    // Rect reaches far below the tile, but inside the tile it only covers the
    // empty top-right sliver of a bottom-left triangle.
    expect(rectOverlapsTriangle('bottom-left', rect(60, -100, 120, 30), TILE)).toBe(false);
  });
});
