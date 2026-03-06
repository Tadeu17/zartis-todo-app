'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';

export type Priority = 'low' | 'medium' | 'high';

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  dueDate?: Date;
}

export async function getTodos() {
  try {
    const user = await requireAuth();

    const todos = await prisma.todo.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    return { success: true, data: todos };
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    return { success: false, error: 'Failed to fetch todos' };
  }
}

export async function createTodo(input: CreateTodoInput) {
  try {
    const user = await requireAuth();

    const todo = await prisma.todo.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority || 'medium',
        dueDate: input.dueDate,
        userId: user.id,
      },
    });
    revalidatePath('/');
    return { success: true, data: todo };
  } catch (error) {
    console.error('Failed to create todo:', error);
    return { success: false, error: 'Failed to create todo' };
  }
}

export async function updateTodo(input: UpdateTodoInput) {
  try {
    const user = await requireAuth();
    const { id, ...data } = input;

    // Verify ownership
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return { success: false, error: 'Todo not found' };
    }

    if (existingTodo.userId !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    const todo = await prisma.todo.update({
      where: { id },
      data,
    });
    revalidatePath('/');
    return { success: true, data: todo };
  } catch (error) {
    console.error('Failed to update todo:', error);
    return { success: false, error: 'Failed to update todo' };
  }
}

export async function deleteTodo(id: string) {
  try {
    const user = await requireAuth();

    // Verify ownership
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return { success: false, error: 'Todo not found' };
    }

    if (existingTodo.userId !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    await prisma.todo.delete({
      where: { id },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete todo:', error);
    return { success: false, error: 'Failed to delete todo' };
  }
}

export async function toggleTodo(id: string) {
  try {
    const user = await requireAuth();

    const todo = await prisma.todo.findUnique({
      where: { id },
    });

    if (!todo) {
      return { success: false, error: 'Todo not found' };
    }

    if (todo.userId !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: { completed: !todo.completed },
    });

    revalidatePath('/');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Failed to toggle todo:', error);
    return { success: false, error: 'Failed to toggle todo' };
  }
}
