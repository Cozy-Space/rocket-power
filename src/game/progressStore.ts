/**
 * Persists sealed progress (see rules/progress.ts) scattered across storage:
 * the ciphertext and one pad share sit in localStorage under names that look
 * like engine caches, the other pad share travels as a cookie. The pad itself
 * (share1 XOR share2) is never stored, and every save draws a fresh pad, so
 * all three values change completely on each write. Deliberately obfuscated —
 * losing any piece just resets progress, which is the intended failure mode.
 */
import { openProgress, sealProgress, xorBytes, type Progress } from './rules/progress';

const CIPHER_KEY = 'glsl.cache.v2';
const SHARE1_KEY = 'audio.mixer.state';
const SHARE2_COOKIE = '_pwa_inst';
const COOKIE_MAX_AGE_S = 10 * 365 * 24 * 3600;

export function loadProgress(): Progress {
  try {
    const cipher = fromBase64Url(localStorage.getItem(CIPHER_KEY));
    const share1 = fromBase64Url(localStorage.getItem(SHARE1_KEY));
    const share2 = fromBase64Url(readCookie(SHARE2_COOKIE));
    if (!cipher || !share1 || !share2 || share1.length !== share2.length) return {};
    return openProgress(cipher, xorBytes(share1, share2)) ?? {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: Progress): void {
  try {
    const { cipher, pad } = sealProgress(progress, randomBytes);
    const share1 = randomBytes(pad.length);
    const share2 = xorBytes(pad, share1);
    localStorage.setItem(CIPHER_KEY, toBase64Url(cipher));
    localStorage.setItem(SHARE1_KEY, toBase64Url(share1));
    document.cookie = `${SHARE2_COOKIE}=${toBase64Url(share2)}; max-age=${COOKIE_MAX_AGE_S}; path=/; SameSite=Lax`;
  } catch {
    // Storage blocked (privacy mode etc.) — progress just won't persist.
  }
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

/** base64url (no +/=) so values are cookie-safe. */
function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string | null): Uint8Array | null {
  if (!value) return null;
  try {
    const b64 = value.replaceAll('-', '+').replaceAll('_', '/');
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
