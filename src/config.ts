import type { SettleConfig } from './game/rules/settle';
import type { LandingThresholds } from './game/rules/types';

/** All gameplay tunables in one place. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 64;

/** Downward pull in px/s². */
export const GRAVITY_Y = 200;
/** Thrust acceleration in px/s² along the rocket's facing. Must beat gravity. */
export const THRUST_ACCEL = 380;
/** Rotation speed in deg/s while Left/Right is held. */
export const ANGULAR_VELOCITY = 150;

/** Fuel units; drains while thrusting. */
export const FUEL_CAPACITY = 100;
/** Fuel units burned per second of thrust. */
export const FUEL_BURN_RATE = 5;

export const LANDING_THRESHOLDS: LandingThresholds = {
  /** Max impact speed in px/s the rocket survives on the pad. */
  maxSpeed: 400,
};

/**
 * Post-touchdown ground physics: bouncing, skidding, and whether the rocket
 * rocks back upright or tips over — decided by simulation, not thresholds.
 */
/**
 * Playback speed of the ground sim: >1 makes the wobble/bounce/tip-over
 * resolve faster without changing its outcome.
 */
export const SETTLE_TIME_SCALE = 1.8;

export const SETTLE_CONFIG: SettleConfig = {
  criticalAngleDeg: 25,
  gravityGain: 600,
  damping: 0.8,
  slamRestitution: 0.45,
  restAngleDeg: 1,
  restAngularVelDeg: 5,
  tippedAngleDeg: 88,
  gravity: GRAVITY_Y,
  restitution: 0.35,
  bounceMinSpeed: 60,
  slideKeep: 0.6,
  slideFriction: 2.5,
  vxTipFactor: 0.6,
  restSlideSpeed: 5,
};

/** How often the HUD receives updates, in ms. */
export const HUD_UPDATE_INTERVAL_MS = 100;
