import {
  PASSWORD_DEFAULT_LENGTH,
  PASSWORD_KEYWORD,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SUGGESTIONS,
} from '../config/constants';

const LETTERS = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const POOL = LETTERS + DIGITS;

function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= limit);
  return bytes[0] % max;
}

const pick = (chars: string): string => chars[randomInt(chars.length)];

export function clampPasswordLength(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return PASSWORD_DEFAULT_LENGTH;
  return Math.min(PASSWORD_MAX_LENGTH, Math.max(PASSWORD_MIN_LENGTH, n));
}

export function generatePassword(length: number = PASSWORD_DEFAULT_LENGTH): string {
  const extras = clampPasswordLength(length) - PASSWORD_KEYWORD.length;
  const chars = [pick(LETTERS), pick(DIGITS)];
  while (chars.length < extras) chars.push(pick(POOL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const at = randomInt(chars.length + 1);
  return chars.slice(0, at).join('') + PASSWORD_KEYWORD + chars.slice(at).join('');
}

export function generatePasswords(
  length: number = PASSWORD_DEFAULT_LENGTH,
  count: number = PASSWORD_SUGGESTIONS,
): string[] {
  const found = new Set<string>();
  while (found.size < count) found.add(generatePassword(length));
  return [...found];
}
