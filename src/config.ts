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
  /** Max impact speed in px/s that still counts as a soft touchdown. */
  maxSpeed: 100,
  /** Max deviation from upright in degrees. */
  maxAngleDeg: 12,
};

/** How often the HUD receives updates, in ms. */
export const HUD_UPDATE_INTERVAL_MS = 100;
