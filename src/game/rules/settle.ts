/**
 * Post-touchdown tip-over simulation: the rocket stands on its base and
 * behaves like a box pivoting on a base edge. Tilted less than the critical
 * angle, gravity rocks it back flat (losing energy every time the base slams
 * down); tilted past it — or arriving with enough spin — gravity wins and it
 * tips over. Pure and deterministic: feed it deltas, read the status.
 */
export interface SettleConfig {
  /** Tilt (deg) beyond which the center of gravity passes the base edge. */
  criticalAngleDeg: number;
  /** Torque scale in deg/s²; bigger = snappier rocking and tipping. */
  gravityGain: number;
  /** Angular velocity damping per second. */
  damping: number;
  /** Fraction of angular velocity kept when the base slams flat (0..1). */
  slamRestitution: number;
  /** At or below this tilt and spin the rocket counts as standing. */
  restAngleDeg: number;
  restAngularVelDeg: number;
  /** At or beyond this tilt the rocket counts as fallen over. */
  tippedAngleDeg: number;
}

export type SettleStatus = 'settling' | 'upright' | 'tipped';

export interface SettleState {
  readonly angleDeg: number;
  readonly angularVelDeg: number;
  readonly status: SettleStatus;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

function resolve(angleDeg: number, angularVelDeg: number, cfg: SettleConfig): SettleState {
  if (Math.abs(angleDeg) >= cfg.tippedAngleDeg) {
    return { angleDeg: 90 * Math.sign(angleDeg || 1), angularVelDeg: 0, status: 'tipped' };
  }
  if (Math.abs(angleDeg) <= cfg.restAngleDeg && Math.abs(angularVelDeg) <= cfg.restAngularVelDeg) {
    return { angleDeg: 0, angularVelDeg: 0, status: 'upright' };
  }
  return { angleDeg, angularVelDeg, status: 'settling' };
}

export function createSettle(
  angleDeg: number,
  angularVelDeg: number,
  cfg: SettleConfig,
): SettleState {
  const wrapped = (((angleDeg % 360) + 540) % 360) - 180;
  return resolve(wrapped, angularVelDeg, cfg);
}

export function stepSettle(state: SettleState, deltaMs: number, cfg: SettleConfig): SettleState {
  if (state.status !== 'settling') return state;

  let angle = state.angleDeg;
  let omega = state.angularVelDeg;
  let remaining = Math.min(deltaMs, 100) / 1000;
  const substep = 1 / 240; // small fixed steps keep the Euler integration stable

  while (remaining > 0) {
    const dt = Math.min(substep, remaining);
    remaining -= dt;
    // Pivot side: the edge under the lean, or where the spin is heading.
    const side = Math.sign(angle) || Math.sign(omega) || 1;
    const alpha =
      cfg.gravityGain * Math.sin(toRad(Math.abs(angle) - cfg.criticalAngleDeg)) * side -
      cfg.damping * omega;
    omega += alpha * dt;
    const next = angle + omega * dt;
    if (angle !== 0 && Math.sign(next) !== Math.sign(angle)) {
      omega *= cfg.slamRestitution; // base slams flat, absorbing energy
    }
    angle = next;
  }

  return resolve(angle, omega, cfg);
}
