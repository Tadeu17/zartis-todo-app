'use client';

import { Todo } from '@/app/generated/prisma/client';
import TodoItem from './todo-item';

interface TodoListProps {
  todos: Todo[];
}

export default function TodoList({ todos }: TodoListProps) {
  const activeTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div className="space-y-6">
      {activeTodos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Active Tasks</h2>
          <div className="space-y-2">
            {activeTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </div>
      )}

      {completedTodos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-600">Completed</h2>
          <div className="space-y-2">
            {completedTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </div>
      )}

      {todos.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <p className="text-lg">No todos yet. Create your first one!</p>
        </div>
      )}
    </div>
  );
}
