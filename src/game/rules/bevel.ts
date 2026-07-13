import { EXPOSED_E, EXPOSED_N, EXPOSED_S, EXPOSED_W } from './borders';

/**
 * Auto-beveling: a rock tile forming a convex corner — exactly two adjacent
 * edges facing air — swaps to the triangle that keeps its two covered edges.
 * Applied at load time, so authored maps stay plain rock and every 90° step
 * gets a 45° chamfer. Removes terrain only; passages never get tighter.
 *
 * Returns the triangle gid (3-6, see rules/triangles.ts) or null to keep the
 * tile square.
 */
export function bevelGid(exposure: number): number | null {
  switch (exposure) {
    case EXPOSED_N | EXPOSED_E:
      return 3; // keep bottom-left ◣
    case EXPOSED_N | EXPOSED_W:
      return 4; // keep bottom-right ◢
    case EXPOSED_S | EXPOSED_E:
      return 5; // keep top-left ◤
    case EXPOSED_S | EXPOSED_W:
      return 6; // keep top-right ◥
    default:
      return null;
  }
}
