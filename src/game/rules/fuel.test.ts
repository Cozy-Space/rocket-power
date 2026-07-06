import { describe, expect, it } from 'vitest';
import { burn, createFuel, fuelFraction, hasFuel } from './fuel';

describe('fuel', () => {
  it('starts full', () => {
    const fuel = createFuel(100);
    expect(fuel.remaining).toBe(100);
    expect(fuelFraction(fuel)).toBe(1);
    expect(hasFuel(fuel)).toBe(true);
  });

  it('burns proportionally to elapsed time', () => {
    const fuel = burn(createFuel(100), 2000, 5);
    expect(fuel.remaining).toBe(90);
    expect(fuelFraction(fuel)).toBeCloseTo(0.9);
  });

  it('accumulates across multiple burns', () => {
    let fuel = createFuel(10);
    fuel = burn(fuel, 500, 4);
    fuel = burn(fuel, 500, 4);
    expect(fuel.remaining).toBe(6);
  });

  it('clamps at zero and reports empty', () => {
    const fuel = burn(createFuel(1), 60000, 5);
    expect(fuel.remaining).toBe(0);
    expect(fuelFraction(fuel)).toBe(0);
    expect(hasFuel(fuel)).toBe(false);
  });

  it('does not mutate the previous state', () => {
    const before = createFuel(100);
    burn(before, 1000, 5);
    expect(before.remaining).toBe(100);
  });
});
