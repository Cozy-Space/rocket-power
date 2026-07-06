import { describe, expect, it } from 'vitest';
import { RunTimer } from './timer';

describe('RunTimer', () => {
  it('reports zero before starting', () => {
    expect(new RunTimer().elapsedMs(5000)).toBe(0);
  });

  it('tracks elapsed time while running', () => {
    const timer = new RunTimer();
    timer.start(1000);
    expect(timer.elapsedMs(1500)).toBe(500);
    expect(timer.elapsedMs(4000)).toBe(3000);
  });

  it('freezes on stop and ignores later stops', () => {
    const timer = new RunTimer();
    timer.start(1000);
    timer.stop(3000);
    timer.stop(9000);
    expect(timer.elapsedMs(60000)).toBe(2000);
  });

  it('restarts cleanly after a stop', () => {
    const timer = new RunTimer();
    timer.start(1000);
    timer.stop(2000);
    timer.start(10000);
    expect(timer.elapsedMs(10500)).toBe(500);
  });

  describe('format', () => {
    it('formats minutes, seconds, and tenths', () => {
      expect(RunTimer.format(83400)).toBe('01:23.4');
    });

    it('pads small values', () => {
      expect(RunTimer.format(0)).toBe('00:00.0');
      expect(RunTimer.format(999)).toBe('00:00.9');
    });

    it('clamps negative input', () => {
      expect(RunTimer.format(-500)).toBe('00:00.0');
    });
  });
});
