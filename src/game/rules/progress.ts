/**
 * Level progress (plays + best time) and its sealed wire format.
 *
 * Sealing XORs the serialized progress with a fresh random one-time pad so
 * the stored bytes look different after every save and casual localStorage
 * edits are useless — the pad's shares live in other storage locations (see
 * progressStore.ts). This is tamper *obfuscation*, not security: the source
 * ships to the client, so anyone determined can decode it.
 */

export interface LevelStats {
  plays: number;
  /** Best landing time in ms, or null if the level was never landed. */
  bestMs: number | null;
  /** Fuel used on the best-time run, or null if the level was never landed. */
  bestFuel: number | null;
}

/** Keyed by level index. Absent key = never played. */
export type Progress = Record<number, LevelStats>;

/** One finished run: count the play, keep the best landing time and its fuel. */
export function recordRun(
  progress: Progress,
  levelIndex: number,
  landed: boolean,
  elapsedMs: number,
  fuelUsed: number,
): Progress {
  const prev = progress[levelIndex] ?? { plays: 0, bestMs: null, bestFuel: null };
  const improved = landed && (prev.bestMs === null || elapsedMs < prev.bestMs);
  return {
    ...progress,
    [levelIndex]: {
      plays: prev.plays + 1,
      bestMs: improved ? elapsedMs : prev.bestMs,
      bestFuel: improved ? fuelUsed : prev.bestFuel,
    },
  };
}

/**
 * The level ENTER should continue at: the lowest level never landed yet.
 * With everything finished, start over at the first level.
 */
export function firstUnfinished(progress: Progress, levelCount: number): number {
  for (let i = 0; i < levelCount; i++) {
    if (progress[i]?.bestMs == null) return i;
  }
  return 0;
}

// --- sealed wire format ------------------------------------------------------
// plaintext = [magic, version, checksum(4B, FNV-1a over payload), payload…]
// cipher    = plaintext XOR pad          (pad is single-use, same length)

const MAGIC = 0x52; // 'R'
const VERSION = 1;
const HEADER_LEN = 6;

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

/** 32-bit FNV-1a — a cheap integrity check, not a MAC. */
export function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Seals progress with a one-time pad drawn from `randomBytes`. Returns both;
 * the caller must store cipher and pad in different places and never reuse
 * the pad.
 */
export function sealProgress(
  progress: Progress,
  randomBytes: (length: number) => Uint8Array,
): { cipher: Uint8Array; pad: Uint8Array } {
  const payload = new TextEncoder().encode(JSON.stringify(progress));
  const plain = new Uint8Array(HEADER_LEN + payload.length);
  plain[0] = MAGIC;
  plain[1] = VERSION;
  new DataView(plain.buffer).setUint32(2, fnv1a(payload));
  plain.set(payload, HEADER_LEN);
  const pad = randomBytes(plain.length);
  return { cipher: xorBytes(plain, pad), pad };
}

/** Opens a sealed progress blob; any mismatch or tampering yields null. */
export function openProgress(cipher: Uint8Array, pad: Uint8Array): Progress | null {
  if (cipher.length !== pad.length || cipher.length < HEADER_LEN) return null;
  const plain = xorBytes(cipher, pad);
  if (plain[0] !== MAGIC || plain[1] !== VERSION) return null;
  const payload = plain.subarray(HEADER_LEN);
  if (new DataView(plain.buffer).getUint32(2) !== fnv1a(payload)) return null;
  try {
    return sanitize(JSON.parse(new TextDecoder().decode(payload)));
  } catch {
    return null;
  }
}

/** Shape-checks parsed JSON so corrupted data resets instead of crashing. */
function sanitize(value: unknown): Progress | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const progress: Progress = {};
  for (const [key, stats] of Object.entries(value)) {
    const index = Number(key);
    const s = stats as Partial<LevelStats> | null;
    if (!Number.isInteger(index) || index < 0 || typeof s !== 'object' || s === null) return null;
    if (!Number.isInteger(s.plays) || (s.plays as number) < 1) return null;
    if (!isNullOrNonNegative(s.bestMs)) return null;
    // Absent in pre-bestFuel saves — treat as null instead of resetting.
    const bestFuel = s.bestFuel ?? null;
    if (!isNullOrNonNegative(bestFuel)) return null;
    progress[index] = { plays: s.plays as number, bestMs: s.bestMs as number | null, bestFuel };
  }
  return progress;
}

function isNullOrNonNegative(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}
