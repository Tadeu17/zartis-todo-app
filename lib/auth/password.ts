import bcrypt from 'bcrypt';
import { PASSWORD_POLICY } from './password-policy';

// Re-export for convenience (server-side only)
export { PASSWORD_POLICY } from './password-policy';

// Configurable salt rounds (default: 12)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * Hash a plain text password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 * @throws Error if password is empty
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password is required');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return hashedPassword;
}

/**
 * Verify a plain text password against a hashed password
 * Uses bcrypt.compare for timing-safe comparison
 * @param password Plain text password
 * @param hashedPassword Hashed password from database
 * @returns True if passwords match, false otherwise
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false;
  }

  const isValid = await bcrypt.compare(password, hashedPassword);
  return isValid;
}

/**
 * Validate password against policy
 * @param password Plain text password
 * @returns Object with isValid boolean and error messages
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hash a token (for password reset tokens) with lighter hashing
 * @param token Plain text token
 * @returns Hashed token
 */
export async function hashToken(token: string): Promise<string> {
  // Use fewer rounds for tokens (still secure, but faster)
  const hashedToken = await bcrypt.hash(token, 10);
  return hashedToken;
}

/**
 * Verify a token against its hash
 * @param token Plain text token
 * @param hashedToken Hashed token from database
 * @returns True if tokens match
 */
export async function verifyToken(
  token: string,
  hashedToken: string
): Promise<boolean> {
  if (!token || !hashedToken) {
    return false;
  }

  return await bcrypt.compare(token, hashedToken);
}
