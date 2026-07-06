import type { TouchdownResult } from './rules/types';

/**
 * Cross-scene events, emitted on the global `game.events` emitter so they
 * survive scene restarts (scene-level emitters drop listeners on shutdown).
 */
export const EVT_HUD_UPDATE = 'rp-hud-update';
export const EVT_RUN_ENDED = 'rp-run-ended';

export interface HudUpdate {
  fuelFraction: number;
  /** Current speed in px/s. */
  speed: number;
  elapsedMs: number;
}

export interface RunEnded {
  result: TouchdownResult;
  elapsedMs: number;
}
