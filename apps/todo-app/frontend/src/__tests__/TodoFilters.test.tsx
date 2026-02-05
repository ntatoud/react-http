import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TodoFilters } from '../components/TodoFilters';

describe('TodoFilters', () => {
  const defaultProps = {
    filter: 'all' as const,
    onFilterChange: vi.fn(),
    stats: { total: 5, completed: 2, pending: 3 },
  };

  it('displays pending count', () => {
    render(<TodoFilters {...defaultProps} />);

    expect(screen.getByText('3 items left')).toBeInTheDocument();
  });

  it('renders all filter buttons', () => {
    render(<TodoFilters {...defaultProps} />);

    expect(screen.getByTestId('filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-active')).toBeInTheDocument();
    expect(screen.getByTestId('filter-completed')).toBeInTheDocument();
  });

  it('highlights active filter', () => {
    render(<TodoFilters {...defaultProps} filter="active" />);

    expect(screen.getByTestId('filter-active')).toHaveClass('active');
    expect(screen.getByTestId('filter-all')).not.toHaveClass('active');
    expect(screen.getByTestId('filter-completed')).not.toHaveClass('active');
  });

  it('calls onFilterChange when filter button is clicked', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(<TodoFilters {...defaultProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByTestId('filter-completed'));

    expect(onFilterChange).toHaveBeenCalledWith('completed');
  });

  it('updates pending count based on stats', () => {
    render(
      <TodoFilters
        {...defaultProps}
        stats={{ total: 10, completed: 7, pending: 3 }}
      />
    );

    expect(screen.getByText('3 items left')).toBeInTheDocument();
  });

  it('shows 0 items left when all completed', () => {
    render(
      <TodoFilters
        {...defaultProps}
        stats={{ total: 5, completed: 5, pending: 0 }}
      />
    );

    expect(screen.getByText('0 items left')).toBeInTheDocument();
  });
});
