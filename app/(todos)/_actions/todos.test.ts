import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockTodo, createMockPrismaClient } from '@/tests/utils/prisma-mock';
import type { Todo } from '@/app/generated/prisma/client';

const TEST_USER_ID = 'test-user-id';

// Mock the auth module BEFORE importing todos.ts
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user-id', name: 'Test User', email: 'test@example.com' }),
  getAuthUser: vi.fn().mockResolvedValue({ id: 'test-user-id', name: 'Test User', email: 'test@example.com' }),
}));

// Mock the Prisma client module
vi.mock('@/lib/prisma', () => ({
  prisma: createMockPrismaClient(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocking to ensure mocks are applied
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  type CreateTodoInput,
  type UpdateTodoInput,
} from '@/app/(todos)/_actions';

describe('Server Actions - todos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTodos()', () => {
    it('should return sorted todos correctly', async () => {
      const mockTodos: Todo[] = [
        createMockTodo({
          id: '1',
          title: 'Incomplete Todo',
          completed: false,
          createdAt: new Date('2024-01-03'),
        }),
        createMockTodo({
          id: '2',
          title: 'Completed Todo',
          completed: true,
          createdAt: new Date('2024-01-02'),
        }),
        createMockTodo({
          id: '3',
          title: 'Another Incomplete',
          completed: false,
          createdAt: new Date('2024-01-01'),
        }),
      ];

      vi.mocked(prisma.todo.findMany).mockResolvedValue(mockTodos);

      const result = await getTodos();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTodos);
      expect(prisma.todo.findMany).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID },
        orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should handle empty database', async () => {
      vi.mocked(prisma.todo.findMany).mockResolvedValue([]);

      const result = await getTodos();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle database errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.todo.findMany).mockRejectedValue(dbError);

      const result = await getTodos();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch todos');
      expect(result.data).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch todos:', dbError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createTodo()', () => {
    it('should create todo with valid input successfully', async () => {
      const input: CreateTodoInput = {
        title: 'New Todo',
        description: 'Test description',
        priority: 'high',
        dueDate: new Date('2024-12-31'),
      };

      const mockCreatedTodo = createMockTodo({
        id: 'new-id',
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
      });

      vi.mocked(prisma.todo.create).mockResolvedValue(mockCreatedTodo);

      const result = await createTodo(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedTodo);
      expect(prisma.todo.create).toHaveBeenCalledWith({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate,
          userId: TEST_USER_ID,
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should apply default priority when not provided', async () => {
      const input: CreateTodoInput = {
        title: 'Todo without priority',
      };

      const mockCreatedTodo = createMockTodo({
        title: input.title,
        priority: 'medium',
      });

      vi.mocked(prisma.todo.create).mockResolvedValue(mockCreatedTodo);

      const result = await createTodo(input);

      expect(result.success).toBe(true);
      expect(prisma.todo.create).toHaveBeenCalledWith({
        data: {
          title: input.title,
          description: undefined,
          priority: 'medium',
          dueDate: undefined,
          userId: TEST_USER_ID,
        },
      });
    });

    it('should handle missing title gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const input = { title: '' } as CreateTodoInput;
      const dbError = new Error('Title cannot be empty');

      vi.mocked(prisma.todo.create).mockRejectedValue(dbError);

      const result = await createTodo(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create todo');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create todo:', dbError);

      consoleErrorSpy.mockRestore();
    });

    it('should revalidate path after successful creation', async () => {
      const input: CreateTodoInput = {
        title: 'Revalidation Test',
      };

      const mockCreatedTodo = createMockTodo({ title: input.title });
      vi.mocked(prisma.todo.create).mockResolvedValue(mockCreatedTodo);

      await createTodo(input);

      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors during creation', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const input: CreateTodoInput = {
        title: 'Test Todo',
      };
      const dbError = new Error('Database insert failed');

      vi.mocked(prisma.todo.create).mockRejectedValue(dbError);

      const result = await createTodo(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create todo');
      expect(revalidatePath).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateTodo()', () => {
    it('should update todo with partial data correctly', async () => {
      const input: UpdateTodoInput = {
        id: 'test-id',
        title: 'Updated Title',
      };

      const mockExistingTodo = createMockTodo({
        id: input.id,
        userId: TEST_USER_ID,
      });

      const mockUpdatedTodo = createMockTodo({
        id: input.id,
        title: input.title,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      const result = await updateTodo(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedTodo);
      expect(prisma.todo.findUnique).toHaveBeenCalledWith({
        where: { id: input.id },
      });
      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: { title: input.title },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should handle invalid ID gracefully', async () => {
      const input: UpdateTodoInput = {
        id: 'non-existent-id',
        title: 'Updated Title',
      };

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(null);

      const result = await updateTodo(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Todo not found');
      expect(prisma.todo.update).not.toHaveBeenCalled();
    });

    it('should update title field independently', async () => {
      const input: UpdateTodoInput = {
        id: 'test-id',
        title: 'New Title Only',
      };

      const mockExistingTodo = createMockTodo({ id: input.id, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({
        id: input.id,
        title: input.title,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await updateTodo(input);

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: { title: input.title },
      });
    });

    it('should update description field independently', async () => {
      const input: UpdateTodoInput = {
        id: 'test-id',
        description: 'New Description',
      };

      const mockExistingTodo = createMockTodo({ id: input.id, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({
        id: input.id,
        description: input.description,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await updateTodo(input);

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: { description: input.description },
      });
    });

    it('should update completed field independently', async () => {
      const input: UpdateTodoInput = {
        id: 'test-id',
        completed: true,
      };

      const mockExistingTodo = createMockTodo({ id: input.id, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({
        id: input.id,
        completed: true,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await updateTodo(input);

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: { completed: true },
      });
    });

    it('should update priority field independently', async () => {
      const input: UpdateTodoInput = {
        id: 'test-id',
        priority: 'high',
      };

      const mockExistingTodo = createMockTodo({ id: input.id, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({
        id: input.id,
        priority: 'high',
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await updateTodo(input);

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: { priority: 'high' },
      });
    });

    it('should update dueDate field independently', async () => {
      const dueDate = new Date('2024-12-31');
      const input: UpdateTodoInput = {
        id: 'test-id',
        dueDate,
      };

      const mockExistingTodo = createMockTodo({ id: input.id, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({
        id: input.id,
        dueDate,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await updateTodo(input);

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: { dueDate },
      });
    });

    it('should update multiple fields together', async () => {
      const input: UpdateTodoInput = {
        id: 'test-id',
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true,
        priority: 'high',
      };

      const mockExistingTodo = createMockTodo({ id: input.id, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({
        id: input.id,
        title: input.title,
        description: input.description,
        completed: input.completed,
        priority: input.priority,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await updateTodo(input);

      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          completed: input.completed,
          priority: input.priority,
        },
      });
    });

    it('should revalidate path after successful update', async () => {
      const input: UpdateTodoInput = {
        id: 'test-id',
        title: 'Updated',
      };

      const mockExistingTodo = createMockTodo({ id: input.id, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({ ...input, userId: TEST_USER_ID });
      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await updateTodo(input);

      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteTodo()', () => {
    it('should delete existing todo successfully', async () => {
      const todoId = 'test-id';
      const mockExistingTodo = createMockTodo({ id: todoId, userId: TEST_USER_ID });
      const mockDeletedTodo = createMockTodo({ id: todoId, userId: TEST_USER_ID });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.delete).mockResolvedValue(mockDeletedTodo);

      const result = await deleteTodo(todoId);

      expect(result.success).toBe(true);
      expect(prisma.todo.findUnique).toHaveBeenCalledWith({
        where: { id: todoId },
      });
      expect(prisma.todo.delete).toHaveBeenCalledWith({
        where: { id: todoId },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should handle non-existent ID gracefully', async () => {
      const todoId = 'non-existent-id';

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(null);

      const result = await deleteTodo(todoId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Todo not found');
      expect(prisma.todo.delete).not.toHaveBeenCalled();
    });

    it('should revalidate path after successful deletion', async () => {
      const todoId = 'test-id';
      const mockExistingTodo = createMockTodo({ id: todoId, userId: TEST_USER_ID });
      const mockDeletedTodo = createMockTodo({ id: todoId, userId: TEST_USER_ID });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockExistingTodo);
      vi.mocked(prisma.todo.delete).mockResolvedValue(mockDeletedTodo);

      await deleteTodo(todoId);

      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });

    it('should not revalidate path when deletion fails', async () => {
      const todoId = 'test-id';

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(null);

      await deleteTodo(todoId);

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('toggleTodo()', () => {
    it('should flip completion status from false to true correctly', async () => {
      const todoId = 'test-id';
      const mockTodo = createMockTodo({
        id: todoId,
        completed: false,
        userId: TEST_USER_ID,
      });
      const mockUpdatedTodo = createMockTodo({
        id: todoId,
        completed: true,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      const result = await toggleTodo(todoId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedTodo);
      expect(prisma.todo.findUnique).toHaveBeenCalledWith({
        where: { id: todoId },
      });
      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: todoId },
        data: { completed: true },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('should flip completion status from true to false correctly', async () => {
      const todoId = 'test-id';
      const mockTodo = createMockTodo({
        id: todoId,
        completed: true,
        userId: TEST_USER_ID,
      });
      const mockUpdatedTodo = createMockTodo({
        id: todoId,
        completed: false,
        userId: TEST_USER_ID,
      });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      const result = await toggleTodo(todoId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedTodo);
      expect(prisma.todo.update).toHaveBeenCalledWith({
        where: { id: todoId },
        data: { completed: false },
      });
    });

    it('should handle non-existent ID gracefully', async () => {
      const todoId = 'non-existent-id';

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(null);

      const result = await toggleTodo(todoId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Todo not found');
      expect(result.data).toBeUndefined();
      expect(prisma.todo.update).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should handle database errors during findUnique', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const todoId = 'test-id';
      const dbError = new Error('Database read failed');

      vi.mocked(prisma.todo.findUnique).mockRejectedValue(dbError);

      const result = await toggleTodo(todoId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to toggle todo');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to toggle todo:', dbError);

      consoleErrorSpy.mockRestore();
    });

    it('should handle database errors during update', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const todoId = 'test-id';
      const mockTodo = createMockTodo({ id: todoId, completed: false, userId: TEST_USER_ID });
      const dbError = new Error('Database update failed');

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockTodo);
      vi.mocked(prisma.todo.update).mockRejectedValue(dbError);

      const result = await toggleTodo(todoId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to toggle todo');
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to toggle todo:', dbError);

      consoleErrorSpy.mockRestore();
    });

    it('should revalidate path after successful toggle', async () => {
      const todoId = 'test-id';
      const mockTodo = createMockTodo({ id: todoId, completed: false, userId: TEST_USER_ID });
      const mockUpdatedTodo = createMockTodo({ id: todoId, completed: true, userId: TEST_USER_ID });

      vi.mocked(prisma.todo.findUnique).mockResolvedValue(mockTodo);
      vi.mocked(prisma.todo.update).mockResolvedValue(mockUpdatedTodo);

      await toggleTodo(todoId);

      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(revalidatePath).toHaveBeenCalledTimes(1);
    });
  });
});
