import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TodoForm } from '../components/TodoForm';

describe('TodoForm', () => {
  it('renders input and submit button', () => {
    render(<TodoForm onSubmit={vi.fn()} />);

    expect(screen.getByTestId('todo-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('has correct placeholder text', () => {
    render(<TodoForm onSubmit={vi.fn()} />);

    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    render(<TodoForm onSubmit={vi.fn()} />);

    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });

  it('submit button is enabled when input has value', async () => {
    const user = userEvent.setup();
    render(<TodoForm onSubmit={vi.fn()} />);

    await user.type(screen.getByTestId('todo-input'), 'New todo');

    expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
  });

  it('calls onSubmit with trimmed value on form submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TodoForm onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('todo-input'), '  New todo  ');
    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('New todo');
    });
  });

  it('clears input after successful submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TodoForm onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('todo-input'), 'New todo');
    await user.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('todo-input')).toHaveValue('');
    });
  });

  it('does not submit when input is only whitespace', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TodoForm onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('todo-input'), '   ');

    expect(screen.getByTestId('submit-btn')).toBeDisabled();
  });
});
