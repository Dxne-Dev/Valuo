// ============================================================================
// VALUO SECURITY UTILITIES
// Cryptographically secure generators, input sanitizers, password validation,
// and client-side anti-bruteforce rate limiting.
// ============================================================================

/**
 * Generate a cryptographically strong temporary password.
 * Format: Valuo-[8 secure random alphanumeric characters]!
 * Uses crypto.getRandomValues() for unguessable entropy.
 */
export function generateSecureTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789#$*";
  const array = new Uint8Array(8);
  
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback if crypto is unavailable
    for (let i = 0; i < 8; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let randomPart = "";
  for (let i = 0; i < 8; i++) {
    randomPart += chars[array[i] % chars.length];
  }

  return `Valuo-${randomPart}!`;
}

/**
 * Sanitize text inputs to prevent XSS (Cross-Site Scripting).
 * Escapes HTML characters: &, <, >, ", '
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

/**
 * Validate password strength.
 * Requires:
 * - Minimum 8 characters
 * - At least one letter
 * - At least one number
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  if (!hasLetter || !hasDigit) {
    return {
      isValid: false,
      error: "Le mot de passe doit contenir au moins une lettre et un chiffre.",
    };
  }

  return { isValid: true };
}

/**
 * In-memory client-side rate limiter for authentication operations.
 * Prevents rapid-fire automated brute force submissions.
 */
interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  actionKey: string,
  maxAttempts = 5,
  windowMs = 60000,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(actionKey);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(actionKey, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.attempts >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.attempts += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(actionKey: string): void {
  rateLimitStore.delete(actionKey);
}
