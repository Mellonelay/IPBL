import { timingSafeEqual, createHash } from "node:crypto";

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 * It uses SHA-256 to hash the strings first so that they are guaranteed to be the same length,
 * which is required by `timingSafeEqual`.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
