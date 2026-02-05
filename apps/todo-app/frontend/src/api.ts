import type { Todo, TodoStats } from './types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  async getTodos(completed?: boolean): Promise<Todo[]> {
    const params = completed !== undefined ? `?completed=${completed}` : '';
    const response = await fetch(`${API_BASE}/todos${params}`);
    const data = await handleResponse<{ todos: Todo[] }>(response);
    return data.todos;
  },

  async getTodo(id: string): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos/${id}`);
    const data = await handleResponse<{ todo: Todo }>(response);
    return data.todo;
  },

  async createTodo(title: string): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const data = await handleResponse<{ todo: Todo }>(response);
    return data.todo;
  },

  async updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'completed'>>): Promise<Todo> {
    const response = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await handleResponse<{ todo: Todo }>(response);
    return data.todo;
  },

  async deleteTodo(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<void>(response);
  },

  async getStats(): Promise<TodoStats> {
    const response = await fetch(`${API_BASE}/stats`);
    return handleResponse<TodoStats>(response);
  },
};
