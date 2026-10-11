// No look-alike characters (0/O, 1/l/I), so a password read aloud or written down survives.
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;

function pick(alphabet: string, random: number): string {
  return alphabet[random % alphabet.length] as string;
}

/**
 * A random initial password that satisfies the server policy (10+ chars, a
 * letter and a digit). Uses the browser's CSPRNG.
 */
export function generatePassword(length = 14): string {
  const random = new Uint32Array(length);
  crypto.getRandomValues(random);
  const chars = Array.from(random, (r) => pick(ALL, r));
  // Guarantee at least one letter and one digit at random positions.
  const [a = 0, b = 0, c = 0] = Array.from(crypto.getRandomValues(new Uint32Array(3)));
  const letterAt = a % length;
  const digitAt = (letterAt + 1 + (b % (length - 1))) % length;
  chars[letterAt] = pick(LETTERS, c);
  chars[digitAt] = pick(DIGITS, c >>> 8);
  return chars.join("");
}
