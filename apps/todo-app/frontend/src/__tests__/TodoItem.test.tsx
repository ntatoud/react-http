import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TodoItem } from '../components/TodoItem';
import type { Todo } from '../types';

const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1',
  title: 'Test todo',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('TodoItem', () => {
  const defaultProps = {
    onToggle: vi.fn(),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
  };

  it('renders todo title', () => {
    render(<TodoItem todo={createTodo()} {...defaultProps} />);

    expect(screen.getByTestId('todo-title')).toHaveTextContent('Test todo');
  });

  it('renders unchecked checkbox for incomplete todo', () => {
    render(<TodoItem todo={createTodo({ completed: false })} {...defaultProps} />);

    expect(screen.getByTestId('todo-checkbox')).not.toBeChecked();
  });

  it('renders checked checkbox for completed todo', () => {
    render(<TodoItem todo={createTodo({ completed: true })} {...defaultProps} />);

    expect(screen.getByTestId('todo-checkbox')).toBeChecked();
  });

  it('applies completed class when todo is completed', () => {
    const { container } = render(
      <TodoItem todo={createTodo({ completed: true })} {...defaultProps} />
    );

    expect(container.querySelector('.todo-item')).toHaveClass('completed');
  });

  it('calls onToggle when checkbox is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<TodoItem todo={createTodo()} {...defaultProps} onToggle={onToggle} />);

    await user.click(screen.getByTestId('todo-checkbox'));

    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<TodoItem todo={createTodo()} {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByTestId('delete-btn'));

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('enters edit mode on double click', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={createTodo()} {...defaultProps} />);

    await user.dblClick(screen.getByTestId('todo-title'));

    expect(screen.getByTestId('edit-input')).toBeInTheDocument();
  });

  it('shows current title in edit input', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={createTodo({ title: 'Current title' })} {...defaultProps} />);

    await user.dblClick(screen.getByTestId('todo-title'));

    expect(screen.getByTestId('edit-input')).toHaveValue('Current title');
  });

  it('exits edit mode on blur', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={createTodo()} {...defaultProps} />);

    await user.dblClick(screen.getByTestId('todo-title'));
    fireEvent.blur(screen.getByTestId('edit-input'));

    expect(screen.queryByTestId('edit-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('todo-title')).toBeInTheDocument();
  });

  it('exits edit mode on Escape key', async () => {
    const user = userEvent.setup();
    render(<TodoItem todo={createTodo()} {...defaultProps} />);

    await user.dblClick(screen.getByTestId('todo-title'));
    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('edit-input')).not.toBeInTheDocument();
  });
});
