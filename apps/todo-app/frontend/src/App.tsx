import { useTodos } from './hooks/useTodos';
import { TodoForm } from './components/TodoForm';
import { TodoList } from './components/TodoList';
import { TodoFilters } from './components/TodoFilters';
import './styles.css';

export function App() {
  const {
    todos,
    stats,
    filter,
    setFilter,
    loading,
    error,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
  } = useTodos();

  return (
    <div className="app">
      <header>
        <h1>todos</h1>
      </header>

      <main className="todo-container">
        <TodoForm onSubmit={addTodo} />

        {error && (
          <div className="error" data-testid="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading" data-testid="loading">
            Loading...
          </div>
        ) : (
          <>
            <TodoList
              todos={todos}
              onToggle={toggleTodo}
              onUpdate={updateTodo}
              onDelete={deleteTodo}
            />
            {stats.total > 0 && (
              <TodoFilters
                filter={filter}
                onFilterChange={setFilter}
                stats={stats}
              />
            )}
          </>
        )}
      </main>

      <footer>
        <p>Double-click to edit a todo</p>
        <p>
          Built with <strong>React</strong> + <strong>react-http</strong>
        </p>
      </footer>
    </div>
  );
}
