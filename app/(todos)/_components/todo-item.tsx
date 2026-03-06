'use client';

import { Todo } from '@/app/generated/prisma/client';
import { toggleTodo, deleteTodo } from '@/app/(todos)/_actions';
import { useState } from 'react';

interface TodoItemProps {
  todo: Todo;
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-900',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-red-100 text-red-900',
};

export default function TodoItem({ todo }: TodoItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    await toggleTodo(todo.id);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this todo?')) {
      setIsLoading(true);
      await deleteTodo(todo.id);
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        todo.completed
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggle}
          disabled={isLoading}
          className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-medium break-words flex-1 ${
                todo.completed ? 'line-through text-gray-600' : 'text-gray-900'
              }`}
            >
              {todo.title}
            </h3>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 text-sm font-medium flex-shrink-0"
            >
              Delete
            </button>
          </div>

          {todo.description && (
            <p
              className={`mt-1 text-sm break-words ${
                todo.completed ? 'text-gray-600' : 'text-gray-700'
              }`}
            >
              {todo.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                priorityColors[todo.priority as keyof typeof priorityColors]
              }`}
            >
              {todo.priority}
            </span>

            {todo.dueDate && (
              <span className="text-xs text-gray-700">
                Due: {formatDate(todo.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
