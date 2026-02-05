import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TodoList } from '../components/TodoList';
import type { Todo } from '../types';

const createTodo = (id: string, title: string, completed = false): Todo => ({
  id,
  title,
  completed,
  createdAt: '2024-01-01T00:00:00.000Z',
});

describe('TodoList', () => {
  const defaultProps = {
    onToggle: vi.fn(),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
  };

  it('renders empty state when no todos', () => {
    render(<TodoList todos={[]} {...defaultProps} />);

    expect(screen.getByTestId('empty-state')).toHaveTextContent('No todos to display');
  });

  it('renders list of todos', () => {
    const todos = [
      createTodo('1', 'First todo'),
      createTodo('2', 'Second todo'),
      createTodo('3', 'Third todo'),
    ];

    render(<TodoList todos={todos} {...defaultProps} />);

    expect(screen.getByTestId('todo-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('todo-title')).toHaveLength(3);
  });

  it('renders todos with correct titles', () => {
    const todos = [
      createTodo('1', 'Learn React'),
      createTodo('2', 'Build app'),
    ];

    render(<TodoList todos={todos} {...defaultProps} />);

    expect(screen.getByText('Learn React')).toBeInTheDocument();
    expect(screen.getByText('Build app')).toBeInTheDocument();
  });

  it('renders mix of completed and incomplete todos', () => {
    const todos = [
      createTodo('1', 'Completed', true),
      createTodo('2', 'Incomplete', false),
    ];

    render(<TodoList todos={todos} {...defaultProps} />);

    const checkboxes = screen.getAllByTestId('todo-checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });
});
