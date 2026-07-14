/**
 * Client-safe strong password generator for admin-issued credentials.
 * Unambiguous charset (no 0/O/1/l/I) so it survives being read out loud
 * over the phone; rejection sampling avoids modulo bias.
 */
const CHARSET = "abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 12): string {
  const out: string[] = [];
  const limit = 256 - (256 % CHARSET.length);
  while (out.length < length) {
    const buf = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of buf) {
      if (byte < limit) out.push(CHARSET[byte % CHARSET.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}
