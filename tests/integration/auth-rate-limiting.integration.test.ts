/**
 * Integration Tests: Authentication with Rate Limiting
 *
 * Tests the complete authentication flow including:
 * - Rate limiting enforcement during login
 * - IP-based and email-based lockouts
 * - LoginAttempt table integration
 * - Clearing attempts on password reset
 * - User-friendly error messages
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, recordLoginAttempt, clearLoginAttempts } from '@/lib/auth/rate-limit';
import { hashPassword } from '@/lib/auth/password';

describe('Authentication with Rate Limiting - Integration Tests', () => {
  // Test data - use unique values per test to avoid cross-test contamination
  const baseEmail = 'ratelimit-test';
  const testPassword = 'SecurePass123!';
  const baseIp = '203.0.113';
  let testCounter = 0;
  let testUserId: string;
  let testEmail: string;
  let testIp: string;

  beforeEach(async () => {
    // Generate unique email and IP for this test
    testCounter++;
    testEmail = `${baseEmail}-${testCounter}@example.com`;
    testIp = `${baseIp}.${testCounter}`;

    // Clean up any existing test data for this email
    await prisma.loginAttempt.deleteMany({
      where: { email: testEmail },
    });

    // Create a test user
    const hashedPassword = await hashPassword(testPassword);
    const user = await prisma.user.create({
      data: {
        name: `Rate Limit Test User ${testCounter}`,
        email: testEmail,
        password: hashedPassword,
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.loginAttempt.deleteMany({
      where: {
        OR: [
          { email: testEmail },
          { ipAddress: testIp },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe('AC1: LoginAttempt table tracks failed login attempts per email', () => {
    it('should create LoginAttempt record for each failed login', async () => {
      // Record 3 failed attempts
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, false);

      // Verify records were created in database
      const attempts = await prisma.loginAttempt.findMany({
        where: {
          email: testEmail,
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(attempts).toHaveLength(3);
      expect(attempts[0].success).toBe(false);
      expect(attempts[0].email).toBe(testEmail);
      expect(attempts[0].ipAddress).toBe(testIp);
      expect(attempts[0].createdAt).toBeInstanceOf(Date);
    });

    it('should track both successful and failed attempts', async () => {
      // Record mixed attempts
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, true); // Successful
      await recordLoginAttempt(testEmail, testIp, false);

      const allAttempts = await prisma.loginAttempt.findMany({
        where: { email: testEmail },
      });

      const failedAttempts = allAttempts.filter((a) => !a.success);
      const successfulAttempts = allAttempts.filter((a) => a.success);

      expect(allAttempts).toHaveLength(4);
      expect(failedAttempts).toHaveLength(3);
      expect(successfulAttempts).toHaveLength(1);
    });

    it('should normalize and store email in lowercase', async () => {
      const mixedCaseEmail = 'Test@EXAMPLE.com';

      await recordLoginAttempt(mixedCaseEmail, testIp, false);

      const attempt = await prisma.loginAttempt.findFirst({
        where: { email: 'test@example.com' },
      });

      expect(attempt).toBeTruthy();
      expect(attempt?.email).toBe('test@example.com');
    });

    it('should track IP address for each attempt', async () => {
      const ip1 = '192.0.2.1';
      const ip2 = '198.51.100.1';

      await recordLoginAttempt(testEmail, ip1, false);
      await recordLoginAttempt(testEmail, ip2, false);

      const attempts = await prisma.loginAttempt.findMany({
        where: { email: testEmail },
        orderBy: { createdAt: 'asc' },
      });

      expect(attempts[0].ipAddress).toBe(ip1);
      expect(attempts[1].ipAddress).toBe(ip2);
    });
  });

  describe('AC2: Account temporarily locked after 5 failed attempts (15 minutes)', () => {
    it('should allow login attempts 1-4 without lockout', async () => {
      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      // Check rate limit - should still be allowed
      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(true);
      expect(result.remainingMinutes).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    it('should block login on 5th failed attempt', async () => {
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      // Check rate limit - should be blocked
      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('email');
      expect(result.remainingMinutes).toBeDefined();
      expect(result.remainingMinutes).toBeGreaterThan(0);
      expect(result.remainingMinutes).toBeLessThanOrEqual(15);
    });

    it('should enforce 15-minute lockout duration', async () => {
      const now = new Date();

      // Create 5 failed attempts, oldest one 14 minutes ago
      const attempts = [];
      for (let i = 0; i < 5; i++) {
        const createdAt = new Date(now.getTime() - (14 - i) * 60 * 1000);
        attempts.push(
          await prisma.loginAttempt.create({
            data: {
              email: testEmail,
              ipAddress: testIp,
              success: false,
              createdAt,
            },
          })
        );
      }

      // Should still be locked
      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(false);
      expect(result.remainingMinutes).toBeGreaterThan(0);
      expect(result.remainingMinutes).toBeLessThanOrEqual(15);
    });

    it('should unblock after 15 minutes have passed', async () => {
      const now = new Date();

      // Create 5 failed attempts, all older than 15 minutes
      for (let i = 0; i < 5; i++) {
        const createdAt = new Date(now.getTime() - (16 + i) * 60 * 1000);
        await prisma.loginAttempt.create({
          data: {
            email: testEmail,
            ipAddress: testIp,
            success: false,
            createdAt,
          },
        });
      }

      // Should be allowed (attempts are too old)
      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(true);
    });

    it('should enforce IP-based lockout at 10 attempts', async () => {
      // Use different emails to avoid email-based lockout
      const emails = Array.from({ length: 10 }, (_, i) => `user${i}-${testCounter}@example.com`);

      // Record 10 failed attempts from same IP, different emails
      for (const email of emails) {
        await recordLoginAttempt(email, testIp, false);
      }

      // Check rate limit for a new email from same IP
      const newEmail = `newuser-${testCounter}@example.com`;
      const result = await checkRateLimit(newEmail, testIp);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ip');
      expect(result.remainingMinutes).toBeDefined();
    });

    it('should only count failed attempts, ignore successful ones', async () => {
      // Record 4 failed + 2 successful + 1 failed = 5 failed total
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, true); // Success
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, true); // Success
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, false);

      // Should be blocked (5 failed attempts)
      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('email');
    });
  });

  describe('AC5: Rate limit errors show user-friendly messages', () => {
    it('should provide remaining time in error response', async () => {
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      const result = await checkRateLimit(testEmail, testIp);

      // Verify error provides actionable information
      expect(result.allowed).toBe(false);
      expect(result.remainingMinutes).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(['email', 'ip']).toContain(result.reason);

      // Minutes should be reasonable (between 1-15)
      expect(result.remainingMinutes).toBeGreaterThan(0);
      expect(result.remainingMinutes).toBeLessThanOrEqual(15);
    });

    it('should differentiate between email and IP lockout reasons', async () => {
      // Test email lockout
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      const emailLockout = await checkRateLimit(testEmail, testIp);
      expect(emailLockout.allowed).toBe(false);
      expect(emailLockout.reason).toBe('email');

      // Clean up for IP test
      await prisma.loginAttempt.deleteMany({
        where: { email: testEmail },
      });

      // Use a new IP for IP lockout test to avoid interference
      const ipTestIp = `${baseIp}.${testCounter + 100}`;
      const ipTestEmail = `iptest-${testCounter}@example.com`;

      // Test IP lockout (10 different emails from same IP)
      const emails = Array.from({ length: 10 }, (_, i) => `user${i}-${testCounter}@example.com`);
      for (const email of emails) {
        await recordLoginAttempt(email, ipTestIp, false);
      }

      const ipLockout = await checkRateLimit(ipTestEmail, ipTestIp);
      expect(ipLockout.allowed).toBe(false);
      expect(ipLockout.reason).toBe('ip');
    });

    it('should calculate accurate remaining time', async () => {
      const now = new Date();

      // Create oldest attempt 5 minutes ago (10 minutes remaining)
      await prisma.loginAttempt.create({
        data: {
          email: testEmail,
          ipAddress: testIp,
          success: false,
          createdAt: new Date(now.getTime() - 5 * 60 * 1000),
        },
      });

      // Add 4 more recent attempts
      for (let i = 0; i < 4; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      const result = await checkRateLimit(testEmail, testIp);

      // Should be around 10 minutes remaining (allowing for execution time)
      expect(result.remainingMinutes).toBeGreaterThanOrEqual(9);
      expect(result.remainingMinutes).toBeLessThanOrEqual(11);
    });
  });

  describe('Integration: Password Reset Clears Login Attempts', () => {
    it('should clear all login attempts when password is reset', async () => {
      // Record 5 failed attempts (account locked)
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      // Verify account is locked
      const beforeReset = await checkRateLimit(testEmail, testIp);
      expect(beforeReset.allowed).toBe(false);

      // Simulate password reset by clearing attempts
      await clearLoginAttempts(testEmail);

      // Verify attempts were deleted from database
      const remainingAttempts = await prisma.loginAttempt.findMany({
        where: { email: testEmail },
      });
      expect(remainingAttempts).toHaveLength(0);

      // Verify account is unlocked
      const afterReset = await checkRateLimit(testEmail, testIp);
      expect(afterReset.allowed).toBe(true);
    });

    it('should allow immediate login after password reset', async () => {
      // Lock account
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      // Clear attempts (password reset)
      await clearLoginAttempts(testEmail);

      // Verify deletion worked
      const count = await prisma.loginAttempt.count({
        where: { email: testEmail },
      });
      expect(count).toBe(0);

      // Should allow login immediately
      const result = await checkRateLimit(testEmail, testIp);
      expect(result.allowed).toBe(true);
      expect(result.remainingMinutes).toBeUndefined();
    });
  });

  describe('Integration: Successful Login Clears Previous Attempts', () => {
    it('should clear failed attempts after successful login', async () => {
      // Record 3 failed attempts
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, false);
      await recordLoginAttempt(testEmail, testIp, false);

      // Verify failed attempts exist
      const beforeSuccess = await prisma.loginAttempt.findMany({
        where: { email: testEmail, success: false },
      });
      expect(beforeSuccess).toHaveLength(3);

      // Simulate successful login: record success + clear attempts
      await recordLoginAttempt(testEmail, testIp, true);
      await clearLoginAttempts(testEmail);

      // Verify all attempts were cleared
      const afterSuccess = await prisma.loginAttempt.findMany({
        where: { email: testEmail },
      });
      expect(afterSuccess).toHaveLength(0);
    });

    it('should reset rate limit counter after successful login', async () => {
      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      // Clear attempts (successful login)
      await clearLoginAttempts(testEmail);

      // Verify deletion
      const count1 = await prisma.loginAttempt.count({
        where: { email: testEmail },
      });
      expect(count1).toBe(0);

      // Should be able to try again 4 times and still be allowed
      for (let i = 0; i < 4; i++) {
        await recordLoginAttempt(testEmail, testIp, false);
      }

      // After 4 attempts, should still be allowed
      const result = await checkRateLimit(testEmail, testIp);
      expect(result.allowed).toBe(true);

      // 5th attempt should trigger lockout
      await recordLoginAttempt(testEmail, testIp, false);
      const finalResult = await checkRateLimit(testEmail, testIp);
      expect(finalResult.allowed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent login attempts correctly', async () => {
      // Simulate concurrent failed attempts
      const attempts = Array(5)
        .fill(null)
        .map(() => recordLoginAttempt(testEmail, testIp, false));

      await Promise.all(attempts);

      // Should be locked after concurrent attempts
      const result = await checkRateLimit(testEmail, testIp);
      expect(result.allowed).toBe(false);

      // Verify all attempts were recorded
      const recorded = await prisma.loginAttempt.findMany({
        where: { email: testEmail },
      });
      expect(recorded).toHaveLength(5);
    });

    it('should handle email with whitespace correctly', async () => {
      const emailWithSpace = `  ${testEmail}  `;

      await recordLoginAttempt(emailWithSpace, testIp, false);

      const attempt = await prisma.loginAttempt.findFirst({
        where: { email: testEmail },
      });

      expect(attempt).toBeTruthy();
      expect(attempt?.email).toBe(testEmail);
    });

    it('should handle different IP addresses for same email', async () => {
      const ip1 = `${baseIp}.${testCounter + 1}`;
      const ip2 = `${baseIp}.${testCounter + 2}`;

      // 3 attempts from IP1
      for (let i = 0; i < 3; i++) {
        await recordLoginAttempt(testEmail, ip1, false);
      }

      // 3 attempts from IP2
      for (let i = 0; i < 3; i++) {
        await recordLoginAttempt(testEmail, ip2, false);
      }

      // Total 6 failed attempts for email - should be locked
      const result = await checkRateLimit(testEmail, ip1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('email');
    });

    it('should prioritize email lockout over IP lockout', async () => {
      // Use unique IP for this test
      const uniqueIp = `${baseIp}.${testCounter + 200}`;

      // Lock by email (5 attempts)
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(testEmail, uniqueIp, false);
      }

      // Also create IP lockout situation (10 attempts from same IP, different emails)
      const emails = Array.from({ length: 10 }, (_, i) => `user${i}-${testCounter}@example.com`);
      for (const email of emails) {
        await recordLoginAttempt(email, uniqueIp, false);
      }

      // Check - should return email lockout (checked first)
      const result = await checkRateLimit(testEmail, uniqueIp);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('email');
    });
  });
});
