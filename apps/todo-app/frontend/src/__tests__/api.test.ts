import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

describe('api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTodos', () => {
    it('fetches todos without filter', async () => {
      const mockTodos = [{ id: '1', title: 'Test', completed: false, createdAt: '' }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ todos: mockTodos }),
      });

      const result = await api.getTodos();

      expect(fetch).toHaveBeenCalledWith('/api/todos');
      expect(result).toEqual(mockTodos);
    });

    it('fetches completed todos', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      });

      await api.getTodos(true);

      expect(fetch).toHaveBeenCalledWith('/api/todos?completed=true');
    });

    it('fetches active todos', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      });

      await api.getTodos(false);

      expect(fetch).toHaveBeenCalledWith('/api/todos?completed=false');
    });
  });

  describe('getTodo', () => {
    it('fetches single todo by id', async () => {
      const mockTodo = { id: '1', title: 'Test', completed: false, createdAt: '' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ todo: mockTodo }),
      });

      const result = await api.getTodo('1');

      expect(fetch).toHaveBeenCalledWith('/api/todos/1');
      expect(result).toEqual(mockTodo);
    });

    it('throws error for not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Todo not found' }),
      });

      await expect(api.getTodo('999')).rejects.toThrow('Todo not found');
    });
  });

  describe('createTodo', () => {
    it('creates todo with title', async () => {
      const mockTodo = { id: '1', title: 'New', completed: false, createdAt: '' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ todo: mockTodo }),
      });

      const result = await api.createTodo('New');

      expect(fetch).toHaveBeenCalledWith('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New' }),
      });
      expect(result).toEqual(mockTodo);
    });

    it('throws error for invalid input', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Title is required' }),
      });

      await expect(api.createTodo('')).rejects.toThrow('Title is required');
    });
  });

  describe('updateTodo', () => {
    it('updates todo title', async () => {
      const mockTodo = { id: '1', title: 'Updated', completed: false, createdAt: '' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ todo: mockTodo }),
      });

      const result = await api.updateTodo('1', { title: 'Updated' });

      expect(fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      expect(result).toEqual(mockTodo);
    });

    it('updates todo completed status', async () => {
      const mockTodo = { id: '1', title: 'Test', completed: true, createdAt: '' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ todo: mockTodo }),
      });

      const result = await api.updateTodo('1', { completed: true });

      expect(fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });
      expect(result).toEqual(mockTodo);
    });
  });

  describe('deleteTodo', () => {
    it('deletes todo', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      await api.deleteTodo('1');

      expect(fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE',
      });
    });

    it('throws error for not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Todo not found' }),
      });

      await expect(api.deleteTodo('999')).rejects.toThrow('Todo not found');
    });
  });

  describe('getStats', () => {
    it('fetches statistics', async () => {
      const mockStats = { total: 5, completed: 2, pending: 3 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await api.getStats();

      expect(fetch).toHaveBeenCalledWith('/api/stats');
      expect(result).toEqual(mockStats);
    });
  });
});
