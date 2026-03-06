/**
 * Password policy constants (client-safe)
 * This file can be safely imported in client components
 */

export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Not required for MVP
} as const;

/**
 * Get password policy description for UI display
 * @returns Array of policy requirement strings
 */
export function getPasswordPolicyDescription(): string[] {
  const requirements: string[] = [];

  requirements.push(`At least ${PASSWORD_POLICY.minLength} characters`);

  if (PASSWORD_POLICY.requireUppercase) {
    requirements.push('At least one uppercase letter (A-Z)');
  }

  if (PASSWORD_POLICY.requireLowercase) {
    requirements.push('At least one lowercase letter (a-z)');
  }

  if (PASSWORD_POLICY.requireNumber) {
    requirements.push('At least one number (0-9)');
  }

  if (PASSWORD_POLICY.requireSpecialChar) {
    requirements.push('At least one special character');
  }

  return requirements;
}
