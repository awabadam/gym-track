import { randomBytes } from "crypto";

// Unambiguous alphabet: excludes I, O, 0, 1 so codes are easy to read aloud and
// type. 32 symbols → exactly 5 bits each, so byte-masking is unbiased.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/**
 * Generates an 8-char uppercase invite code from an unambiguous alphabet using
 * crypto-strong randomness. Pure: no DB, no uniqueness guarantee (callers
 * retry on the unique-index collision).
 */
export function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
