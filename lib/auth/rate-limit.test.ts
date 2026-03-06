import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPrismaClient } from '@/tests/utils/prisma-mock';
import type { LoginAttempt } from '@/app/generated/prisma/client';
import {
  checkRateLimit,
  recordLoginAttempt,
  clearLoginAttempts,
  cleanupOldAttempts,
} from '@/lib/auth/rate-limit';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: createMockPrismaClient(),
}));

import { prisma } from '@/lib/prisma';

describe('Rate Limiting Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('checkRateLimit()', () => {
    const testEmail = 'test@example.com';
    const testIp = '192.0.2.1';

    it('should allow login when no failed attempts exist', async () => {
      vi.mocked(prisma.loginAttempt.count).mockResolvedValue(0);

      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(true);
      expect(result.remainingMinutes).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    it('should allow login when failed attempts are below email threshold', async () => {
      // Mock 4 failed attempts (below limit of 5)
      vi.mocked(prisma.loginAttempt.count)
        .mockResolvedValueOnce(4) // Email attempts
        .mockResolvedValueOnce(4); // IP attempts

      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(true);
    });

    it('should block login when email reaches 5 failed attempts', async () => {
      const now = new Date();
      vi.setSystemTime(now);

      const oldestAttempt: LoginAttempt = {
        id: 'attempt-1',
        email: testEmail,
        ipAddress: testIp,
        success: false,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
      };

      // Mock 5 failed attempts for email
      vi.mocked(prisma.loginAttempt.count)
        .mockResolvedValueOnce(5) // Email attempts (hits limit)
        .mockResolvedValueOnce(5); // IP attempts (below limit of 10)

      vi.mocked(prisma.loginAttempt.findFirst).mockResolvedValueOnce(oldestAttempt);

      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('email');
      expect(result.remainingMinutes).toBe(10); // 15 - 5 = 10 minutes remaining
      expect(prisma.loginAttempt.count).toHaveBeenCalledTimes(1); // Should stop after email check
    });

    it('should block login when IP reaches 10 failed attempts', async () => {
      // Reset all mocks completely (clear implementations, not just call history)
      vi.mocked(prisma.loginAttempt.count).mockReset();
      vi.mocked(prisma.loginAttempt.findFirst).mockReset();

      const now = new Date();
      vi.setSystemTime(now);

      // Use different email to avoid email-based lockout
      const differentEmail = 'other@example.com';

      const oldestAttempt: LoginAttempt = {
        id: 'attempt-1',
        email: differentEmail,
        ipAddress: testIp,
        success: false,
        createdAt: new Date(now.getTime() - 3 * 60 * 1000), // 3 minutes ago
      };

      // Mock attempts - email below limit (4 attempts, limit is 5), IP at limit (10 attempts, limit is 10)
      vi.mocked(prisma.loginAttempt.count)
        .mockResolvedValueOnce(4) // First call: Email attempts (below limit of 5)
        .mockResolvedValueOnce(10); // Second call: IP attempts (hits limit of 10)

      vi.mocked(prisma.loginAttempt.findFirst).mockResolvedValueOnce(oldestAttempt);

      const result = await checkRateLimit(differentEmail, testIp);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ip');
      expect(result.remainingMinutes).toBe(12); // 15 - 3 = 12 minutes remaining
    });

    it('should calculate remaining minutes correctly', async () => {
      const now = new Date();
      vi.setSystemTime(now);

      const testCases = [
        { minutesAgo: 14, expectedRemaining: 1 },
        { minutesAgo: 10, expectedRemaining: 5 },
        { minutesAgo: 5, expectedRemaining: 10 },
        { minutesAgo: 1, expectedRemaining: 14 },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        const oldestAttempt: LoginAttempt = {
          id: 'attempt-1',
          email: testEmail,
          ipAddress: testIp,
          success: false,
          createdAt: new Date(now.getTime() - testCase.minutesAgo * 60 * 1000),
        };

        vi.mocked(prisma.loginAttempt.count).mockResolvedValueOnce(5);
        vi.mocked(prisma.loginAttempt.findFirst).mockResolvedValueOnce(oldestAttempt);

        const result = await checkRateLimit(testEmail, testIp);

        expect(result.remainingMinutes).toBe(testCase.expectedRemaining);
      }
    });

    it('should normalize email to lowercase', async () => {
      vi.mocked(prisma.loginAttempt.count).mockResolvedValue(0);

      await checkRateLimit('Test@EXAMPLE.COM', testIp);

      expect(prisma.loginAttempt.count).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          success: false,
          createdAt: expect.any(Object),
        },
      });
    });

    it('should only count failed attempts within 15-minute window', async () => {
      const now = new Date();
      vi.setSystemTime(now);

      vi.mocked(prisma.loginAttempt.count).mockResolvedValue(0);

      await checkRateLimit(testEmail, testIp);

      const cutoffTime = new Date(now.getTime() - 15 * 60 * 1000);

      expect(prisma.loginAttempt.count).toHaveBeenCalledWith({
        where: {
          email: testEmail,
          success: false,
          createdAt: {
            gte: cutoffTime,
          },
        },
      });
    });

    it('should prioritize email lockout over IP lockout', async () => {
      const now = new Date();
      vi.setSystemTime(now);

      const oldestAttempt: LoginAttempt = {
        id: 'attempt-1',
        email: testEmail,
        ipAddress: testIp,
        success: false,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      };

      // Both email and IP exceed limits
      vi.mocked(prisma.loginAttempt.count).mockResolvedValueOnce(5); // Email (checked first)
      vi.mocked(prisma.loginAttempt.findFirst).mockResolvedValueOnce(oldestAttempt);

      const result = await checkRateLimit(testEmail, testIp);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('email');
      expect(prisma.loginAttempt.count).toHaveBeenCalledTimes(1); // Should stop after email check
    });
  });

  describe('recordLoginAttempt()', () => {
    const testEmail = 'test@example.com';
    const testIp = '192.0.2.1';

    it('should record failed login attempt', async () => {
      vi.mocked(prisma.loginAttempt.create).mockResolvedValue({
        id: 'attempt-1',
        email: testEmail,
        ipAddress: testIp,
        success: false,
        createdAt: new Date(),
      });

      await recordLoginAttempt(testEmail, testIp, false);

      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          email: testEmail,
          ipAddress: testIp,
          success: false,
        },
      });
    });

    it('should record successful login attempt', async () => {
      vi.mocked(prisma.loginAttempt.create).mockResolvedValue({
        id: 'attempt-1',
        email: testEmail,
        ipAddress: testIp,
        success: true,
        createdAt: new Date(),
      });

      await recordLoginAttempt(testEmail, testIp, true);

      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          email: testEmail,
          ipAddress: testIp,
          success: true,
        },
      });
    });

    it('should normalize email to lowercase', async () => {
      vi.mocked(prisma.loginAttempt.create).mockResolvedValue({
        id: 'attempt-1',
        email: 'test@example.com',
        ipAddress: testIp,
        success: false,
        createdAt: new Date(),
      });

      await recordLoginAttempt('Test@EXAMPLE.COM', testIp, false);

      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          ipAddress: testIp,
          success: false,
        },
      });
    });

    it('should trim email whitespace', async () => {
      vi.mocked(prisma.loginAttempt.create).mockResolvedValue({
        id: 'attempt-1',
        email: 'test@example.com',
        ipAddress: testIp,
        success: false,
        createdAt: new Date(),
      });

      await recordLoginAttempt('  test@example.com  ', testIp, false);

      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          ipAddress: testIp,
          success: false,
        },
      });
    });
  });

  describe('clearLoginAttempts()', () => {
    const testEmail = 'test@example.com';

    it('should delete all attempts for a user', async () => {
      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 5 });

      await clearLoginAttempts(testEmail);

      expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: {
          email: testEmail,
        },
      });
    });

    it('should normalize email to lowercase', async () => {
      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 3 });

      await clearLoginAttempts('Test@EXAMPLE.COM');

      expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
        },
      });
    });

    it('should trim email whitespace', async () => {
      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 2 });

      await clearLoginAttempts('  test@example.com  ');

      expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
        },
      });
    });

    it('should handle case when no attempts exist', async () => {
      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 0 });

      await expect(clearLoginAttempts(testEmail)).resolves.not.toThrow();

      expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: {
          email: testEmail,
        },
      });
    });
  });

  describe('cleanupOldAttempts()', () => {
    it('should delete attempts older than 15 minutes', async () => {
      const now = new Date();
      vi.setSystemTime(now);

      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 10 });

      await cleanupOldAttempts();

      const cutoffTime = new Date(now.getTime() - 15 * 60 * 1000);

      expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: cutoffTime,
          },
        },
      });
    });

    it('should handle case when no old attempts exist', async () => {
      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 0 });

      await expect(cleanupOldAttempts()).resolves.not.toThrow();
    });

    it('should calculate cutoff time correctly', async () => {
      const testTime = new Date('2024-01-15T12:00:00Z');
      vi.setSystemTime(testTime);

      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 5 });

      await cleanupOldAttempts();

      const expectedCutoff = new Date('2024-01-15T11:45:00Z'); // 15 minutes earlier

      expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expectedCutoff,
          },
        },
      });
    });
  });

  describe('Integration scenarios', () => {
    const testEmail = 'test@example.com';
    const testIp = '192.0.2.1';

    it('should handle complete brute force scenario', async () => {
      const now = new Date();
      vi.setSystemTime(now);

      // Attempt 1-4: Should be allowed
      for (let i = 1; i <= 4; i++) {
        vi.mocked(prisma.loginAttempt.count).mockResolvedValueOnce(i - 1);
        const result = await checkRateLimit(testEmail, testIp);
        expect(result.allowed).toBe(true);

        vi.mocked(prisma.loginAttempt.create).mockResolvedValue({
          id: `attempt-${i}`,
          email: testEmail,
          ipAddress: testIp,
          success: false,
          createdAt: new Date(),
        });
        await recordLoginAttempt(testEmail, testIp, false);
      }

      // Attempt 5: Should be blocked
      const oldestAttempt: LoginAttempt = {
        id: 'attempt-1',
        email: testEmail,
        ipAddress: testIp,
        success: false,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      };

      vi.mocked(prisma.loginAttempt.count).mockResolvedValueOnce(5);
      vi.mocked(prisma.loginAttempt.findFirst).mockResolvedValueOnce(oldestAttempt);

      const result = await checkRateLimit(testEmail, testIp);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('email');
      expect(result.remainingMinutes).toBeGreaterThan(0);
    });

    it('should unblock after clearing attempts', async () => {
      const now = new Date();
      vi.setSystemTime(now);

      // Simulate locked account
      const oldestAttempt: LoginAttempt = {
        id: 'attempt-1',
        email: testEmail,
        ipAddress: testIp,
        success: false,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      };

      vi.mocked(prisma.loginAttempt.count).mockResolvedValueOnce(5);
      vi.mocked(prisma.loginAttempt.findFirst).mockResolvedValueOnce(oldestAttempt);

      let result = await checkRateLimit(testEmail, testIp);
      expect(result.allowed).toBe(false);

      // Clear attempts (e.g., after password reset)
      vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 5 });
      await clearLoginAttempts(testEmail);

      // Should now be allowed
      vi.mocked(prisma.loginAttempt.count).mockResolvedValueOnce(0);
      result = await checkRateLimit(testEmail, testIp);
      expect(result.allowed).toBe(true);
    });
  });
});
