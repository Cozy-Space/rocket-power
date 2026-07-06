/**
 * Post-touchdown ground simulation. The rocket arrives with the velocity,
 * tilt, and spin it had at contact and then behaves like a box on its base:
 *
 * - Hard vertical impacts bounce (restitution) into diminishing hops.
 * - On every ground catch, horizontal velocity converts into rotation —
 *   friction grabs the base while the top keeps moving — so an upright rocket
 *   drifting sideways fast tips over in the direction of travel.
 * - Leftover horizontal speed makes it skid along the pad with friction.
 * - Tilted less than the critical angle, gravity rocks it back flat, losing
 *   energy every time the base slams down; past it, gravity wins.
 *
 * Pure and deterministic: feed it deltas, read the status.
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
  /** Downward pull during bounce hops, px/s². */
  gravity: number;
  /** Fraction of impact speed kept as upward bounce velocity (0..1). */
  restitution: number;
  /** Impacts slower than this (px/s) don't bounce, they stick. */
  bounceMinSpeed: number;
  /** Fraction of horizontal velocity surviving each ground catch (0..1). */
  slideKeep: number;
  /** Exponential decay rate of the skid while grounded, 1/s. */
  slideFriction: number;
  /** Spin (deg/s) gained per px/s of horizontal velocity at ground catch. */
  vxTipFactor: number;
  /** At or below this skid speed (px/s) the rocket can come to rest. */
  restSlideSpeed: number;
}

export type SettleStatus = 'settling' | 'upright' | 'tipped';

export interface SettleState {
  readonly angleDeg: number;
  readonly angularVelDeg: number;
  /** Base height above the pad in px; 0 while grounded, >0 mid-hop. */
  readonly height: number;
  /** Upward velocity in px/s during a hop. */
  readonly upVel: number;
  /** Horizontal skid velocity in px/s. */
  readonly slideVel: number;
  /** Accumulated horizontal drift from the touchdown point in px. */
  readonly slideOffset: number;
  readonly status: SettleStatus;
}

export interface TouchdownState {
  angleDeg: number;
  angularVelDeg: number;
  /** Horizontal velocity at contact, px/s (positive = right). */
  velocityX: number;
  /** Downward velocity at contact, px/s (positive = falling). */
  velocityY: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

function resolve(state: SettleState, cfg: SettleConfig): SettleState {
  if (Math.abs(state.angleDeg) >= cfg.tippedAngleDeg) {
    return {
      ...state,
      angleDeg: 90 * Math.sign(state.angleDeg || 1),
      angularVelDeg: 0,
      height: 0,
      upVel: 0,
      slideVel: 0,
      status: 'tipped',
    };
  }
  const grounded = state.height === 0 && state.upVel === 0;
  if (
    grounded &&
    Math.abs(state.angleDeg) <= cfg.restAngleDeg &&
    Math.abs(state.angularVelDeg) <= cfg.restAngularVelDeg &&
    Math.abs(state.slideVel) <= cfg.restSlideSpeed
  ) {
    return { ...state, angleDeg: 0, angularVelDeg: 0, slideVel: 0, status: 'upright' };
  }
  return state;
}

/** The friction catch when the base meets the pad: momentum becomes spin. */
function groundCatch(
  impactSpeed: number,
  omega: number,
  slideVel: number,
  cfg: SettleConfig,
): { omega: number; slideVel: number; upVel: number } {
  return {
    omega: omega + cfg.vxTipFactor * slideVel,
    slideVel: slideVel * cfg.slideKeep,
    upVel: impactSpeed > cfg.bounceMinSpeed ? impactSpeed * cfg.restitution : 0,
  };
}

export function createSettle(touchdown: TouchdownState, cfg: SettleConfig): SettleState {
  const wrapped = (((touchdown.angleDeg % 360) + 540) % 360) - 180;
  const caught = groundCatch(
    Math.max(0, touchdown.velocityY),
    touchdown.angularVelDeg,
    touchdown.velocityX,
    cfg,
  );
  return resolve(
    {
      angleDeg: wrapped,
      angularVelDeg: caught.omega,
      height: 0,
      upVel: caught.upVel,
      slideVel: caught.slideVel,
      slideOffset: 0,
      status: 'settling',
    },
    cfg,
  );
}

export function stepSettle(state: SettleState, deltaMs: number, cfg: SettleConfig): SettleState {
  if (state.status !== 'settling') return state;

  let { angleDeg: angle, angularVelDeg: omega, height, upVel, slideVel, slideOffset } = state;
  let remaining = Math.min(deltaMs, 100) / 1000;
  const substep = 1 / 240; // small fixed steps keep the Euler integration stable

  while (remaining > 0) {
    const dt = Math.min(substep, remaining);
    remaining -= dt;

    if (height > 0 || upVel > 0) {
      // Airborne mid-hop: ballistic flight, free rotation, uninhibited drift.
      upVel -= cfg.gravity * dt;
      height += upVel * dt;
      angle += omega * dt;
      slideOffset += slideVel * dt;
      if (height <= 0) {
        height = 0;
        const caught = groundCatch(-upVel, omega, slideVel, cfg);
        omega = caught.omega;
        slideVel = caught.slideVel;
        upVel = caught.upVel;
      }
    } else {
      // Grounded: box-on-edge rocking plus skid friction.
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
      slideVel *= Math.exp(-cfg.slideFriction * dt);
      slideOffset += slideVel * dt;
    }

    if (Math.abs(angle) >= cfg.tippedAngleDeg) break;
  }

  return resolve(
    {
      angleDeg: angle,
      angularVelDeg: omega,
      height,
      upVel,
      slideVel,
      slideOffset,
      status: 'settling',
    },
    cfg,
  );
}
