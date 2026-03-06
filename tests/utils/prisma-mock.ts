import { vi } from 'vitest';
import type { Todo, LoginAttempt } from '@/app/generated/prisma/client';

// Mock todo factory
export function createMockTodo(overrides?: Partial<Todo>): Todo {
  return {
    id: 'test-id-1',
    title: 'Test Todo',
    description: 'Test description',
    completed: false,
    priority: 'medium',
    dueDate: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'test-user-id',
    ...overrides,
  };
}

// Mock login attempt factory
export function createMockLoginAttempt(
  overrides?: Partial<LoginAttempt>
): LoginAttempt {
  return {
    id: 'attempt-1',
    email: 'test@example.com',
    ipAddress: '192.0.2.1',
    success: false,
    createdAt: new Date(),
    ...overrides,
  };
}

// Mock Prisma client for unit tests
export function createMockPrismaClient() {
  return {
    todo: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loginAttempt: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}
