import { useState, useCallback, useEffect } from 'react';
import type { Todo, TodoStats } from '../types';
import { api } from '../api';

export type FilterType = 'all' | 'active' | 'completed';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats>({ total: 0, completed: 0, pending: 0 });
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const completed = filter === 'all' ? undefined : filter === 'completed';
      const [todosData, statsData] = await Promise.all([
        api.getTodos(completed),
        api.getStats(),
      ]);

      setTodos(todosData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = useCallback(async (title: string) => {
    try {
      setError(null);
      await api.createTodo(title);
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add todo');
      throw err;
    }
  }, [fetchTodos]);

  const toggleTodo = useCallback(async (id: string) => {
    try {
      setError(null);
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      await api.updateTodo(id, { completed: !todo.completed });
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
    }
  }, [todos, fetchTodos]);

  const updateTodo = useCallback(async (id: string, title: string) => {
    try {
      setError(null);
      await api.updateTodo(id, { title });
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
      throw err;
    }
  }, [fetchTodos]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.deleteTodo(id);
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
    }
  }, [fetchTodos]);

  return {
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
    refresh: fetchTodos,
  };
}
