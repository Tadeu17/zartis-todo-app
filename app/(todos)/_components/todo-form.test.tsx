import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import TodoForm from '@/app/(todos)/_components/todo-form';

// Mock server actions
vi.mock('@/app/(todos)/_actions', () => ({
  createTodo: vi.fn(),
  Priority: {
    low: 'low',
    medium: 'medium',
    high: 'high',
  },
}));

describe('TodoForm', () => {
  it('renders the form with all fields', () => {
    render(<TodoForm />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add todo/i })).toBeInTheDocument();
  });

  it('shows validation error when title is empty', async () => {
    const { user } = render(<TodoForm />);

    const submitButton = screen.getByRole('button', { name: /add todo/i });
    await user.click(submitButton);

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });

  it('has correct default priority', () => {
    render(<TodoForm />);

    const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
    expect(prioritySelect.value).toBe('medium');
  });
});
