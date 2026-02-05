import type { FilterType } from '../hooks/useTodos';
import type { TodoStats } from '../types';

interface TodoFiltersProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  stats: TodoStats;
}

export function TodoFilters({ filter, onFilterChange, stats }: TodoFiltersProps) {
  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <div className="todo-filters" data-testid="todo-filters">
      <span className="stats">
        {stats.pending} items left
      </span>
      <div className="filter-buttons">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            className={filter === value ? 'active' : ''}
            onClick={() => onFilterChange(value)}
            data-testid={`filter-${value}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
