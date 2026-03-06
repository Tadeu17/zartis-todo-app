import { getTodos } from './(todos)/_actions';
import { getCurrentUser } from '@/lib/auth';
import { TodoList, TodoForm } from './(todos)/_components';
import { UserMenu } from './auth/_components';

export default async function Home() {
  const [result, user] = await Promise.all([
    getTodos(),
    getCurrentUser(),
  ]);
  const todos = result.success && result.data ? result.data : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Todo List</h1>
            <p className="text-gray-700">Stay organized and productive</p>
          </div>
          {user && <UserMenu user={user} />}
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Todo</h2>
            <TodoForm />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Todos</h2>
            <TodoList todos={todos} />
          </div>
        </div>
      </div>
    </div>
  );
}
