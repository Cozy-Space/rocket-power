export interface FuelState {
  readonly capacity: number;
  readonly remaining: number;
}

export function createFuel(capacity: number): FuelState {
  return { capacity, remaining: capacity };
}

/** Burns fuel proportionally to elapsed time; never goes below zero. */
export function burn(state: FuelState, deltaMs: number, ratePerSec: number): FuelState {
  const burned = (deltaMs / 1000) * ratePerSec;
  return { ...state, remaining: Math.max(0, state.remaining - burned) };
}

export function hasFuel(state: FuelState): boolean {
  return state.remaining > 0;
}

/** Fraction 0..1 for the HUD bar. */
export function fuelFraction(state: FuelState): number {
  if (state.capacity <= 0) return 0;
  return state.remaining / state.capacity;
}
