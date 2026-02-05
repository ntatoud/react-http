import React from 'react';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import {
  createServer,
  Server,
  Route,
  Get,
  Post,
  Put,
  Delete,
  Middleware,
  type RequestContext,
  type MiddlewareHandler,
} from 'react-http';

// ============================================================================
// Types
// ============================================================================

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

// ============================================================================
// Test utilities
// ============================================================================

const request = async (
  port: number,
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 0,
              data: data ? JSON.parse(data) : null,
            });
          } catch {
            resolve({
              status: res.statusCode || 0,
              data: data,
            });
          }
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

// ============================================================================
// Test app setup
// ============================================================================

const createTestApp = () => {
  const todos: Map<string, Todo> = new Map();
  let nextId = 1;

  const cors: MiddlewareHandler = async (ctx, next) => {
    ctx.res.setHeader('Access-Control-Allow-Origin', '*');
    await next();
  };

  const listTodos = (ctx: RequestContext) => {
    const { completed } = ctx.query;
    let result = Array.from(todos.values());

    if (completed !== undefined) {
      const isCompleted = completed === 'true';
      result = result.filter((todo) => todo.completed === isCompleted);
    }

    return { todos: result };
  };

  const getTodo = (ctx: RequestContext) => {
    const todo = todos.get(ctx.params.id);

    if (!todo) {
      ctx.res.statusCode = 404;
      return { error: 'Todo not found' };
    }

    return { todo };
  };

  const createTodo = (ctx: RequestContext) => {
    const { title } = ctx.body || {};

    if (!title || typeof title !== 'string') {
      ctx.res.statusCode = 400;
      return { error: 'Title is required' };
    }

    const id = String(nextId++);
    const todo: Todo = {
      id,
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    todos.set(id, todo);
    ctx.res.statusCode = 201;

    return { todo };
  };

  const updateTodo = (ctx: RequestContext) => {
    const todo = todos.get(ctx.params.id);

    if (!todo) {
      ctx.res.statusCode = 404;
      return { error: 'Todo not found' };
    }

    const { title, completed } = ctx.body || {};

    if (title !== undefined) {
      todo.title = String(title).trim();
    }

    if (completed !== undefined) {
      todo.completed = Boolean(completed);
    }

    return { todo };
  };

  const deleteTodo = (ctx: RequestContext) => {
    const todo = todos.get(ctx.params.id);

    if (!todo) {
      ctx.res.statusCode = 404;
      return { error: 'Todo not found' };
    }

    todos.delete(ctx.params.id);
    ctx.res.statusCode = 204;
  };

  const getStats = () => {
    const all = Array.from(todos.values());
    return {
      total: all.length,
      completed: all.filter((t) => t.completed).length,
      pending: all.filter((t) => !t.completed).length,
    };
  };

  const App = () => (
    <Server>
      <Middleware use={cors} />

      <Route path="/api">
        <Get path="/health" handler={() => ({ status: 'ok' })} />
        <Get path="/stats" handler={getStats} />

        <Route path="/todos">
          <Get handler={listTodos} />
          <Post handler={createTodo} />

          <Route path="/:id">
            <Get handler={getTodo} />
            <Put handler={updateTodo} />
            <Delete handler={deleteTodo} />
          </Route>
        </Route>
      </Route>
    </Server>
  );

  return { App, todos, reset: () => { todos.clear(); nextId = 1; } };
};

// ============================================================================
// Tests
// ============================================================================

describe('Todo API', () => {
  let port: number;
  let server: ReturnType<typeof createServer>;
  let httpServer: http.Server;
  let testApp: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    testApp = createTestApp();
    server = createServer(<testApp.App />);
    httpServer = await server.listen(0);
    port = (httpServer.address() as any).port;
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    testApp.reset();
  });

  describe('GET /api/health', () => {
    it('should return status ok', async () => {
      const res = await request(port, 'GET', '/api/health');
      expect(res.status).toBe(200);
      expect(res.data).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/todos', () => {
    it('should return empty array when no todos exist', async () => {
      const res = await request(port, 'GET', '/api/todos');
      expect(res.status).toBe(200);
      expect(res.data.todos).toEqual([]);
    });

    it('should return all todos', async () => {
      await request(port, 'POST', '/api/todos', { title: 'Test todo 1' });
      await request(port, 'POST', '/api/todos', { title: 'Test todo 2' });

      const res = await request(port, 'GET', '/api/todos');
      expect(res.status).toBe(200);
      expect(res.data.todos).toHaveLength(2);
    });

    it('should filter by completed status', async () => {
      await request(port, 'POST', '/api/todos', { title: 'Incomplete' });
      const { data: { todo } } = await request(port, 'POST', '/api/todos', { title: 'Complete' });
      await request(port, 'PUT', `/api/todos/${todo.id}`, { completed: true });

      const completedRes = await request(port, 'GET', '/api/todos?completed=true');
      expect(completedRes.data.todos).toHaveLength(1);
      expect(completedRes.data.todos[0].title).toBe('Complete');

      const pendingRes = await request(port, 'GET', '/api/todos?completed=false');
      expect(pendingRes.data.todos).toHaveLength(1);
      expect(pendingRes.data.todos[0].title).toBe('Incomplete');
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const res = await request(port, 'POST', '/api/todos', { title: 'New todo' });
      expect(res.status).toBe(201);
      expect(res.data.todo).toMatchObject({
        title: 'New todo',
        completed: false,
      });
      expect(res.data.todo.id).toBeDefined();
      expect(res.data.todo.createdAt).toBeDefined();
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(port, 'POST', '/api/todos', {});
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Title is required');
    });

    it('should trim whitespace from title', async () => {
      const res = await request(port, 'POST', '/api/todos', { title: '  Trimmed title  ' });
      expect(res.data.todo.title).toBe('Trimmed title');
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return a todo by id', async () => {
      const createRes = await request(port, 'POST', '/api/todos', { title: 'Test' });
      const id = createRes.data.todo.id;

      const res = await request(port, 'GET', `/api/todos/${id}`);
      expect(res.status).toBe(200);
      expect(res.data.todo.id).toBe(id);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(port, 'GET', '/api/todos/999');
      expect(res.status).toBe(404);
      expect(res.data.error).toBe('Todo not found');
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update todo title', async () => {
      const createRes = await request(port, 'POST', '/api/todos', { title: 'Original' });
      const id = createRes.data.todo.id;

      const res = await request(port, 'PUT', `/api/todos/${id}`, { title: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.data.todo.title).toBe('Updated');
    });

    it('should update todo completed status', async () => {
      const createRes = await request(port, 'POST', '/api/todos', { title: 'Test' });
      const id = createRes.data.todo.id;

      const res = await request(port, 'PUT', `/api/todos/${id}`, { completed: true });
      expect(res.status).toBe(200);
      expect(res.data.todo.completed).toBe(true);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(port, 'PUT', '/api/todos/999', { title: 'Test' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      const createRes = await request(port, 'POST', '/api/todos', { title: 'To delete' });
      const id = createRes.data.todo.id;

      const deleteRes = await request(port, 'DELETE', `/api/todos/${id}`);
      expect(deleteRes.status).toBe(204);

      const getRes = await request(port, 'GET', `/api/todos/${id}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const res = await request(port, 'DELETE', '/api/todos/999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/stats', () => {
    it('should return correct statistics', async () => {
      await request(port, 'POST', '/api/todos', { title: 'Pending 1' });
      await request(port, 'POST', '/api/todos', { title: 'Pending 2' });
      const { data: { todo } } = await request(port, 'POST', '/api/todos', { title: 'Completed' });
      await request(port, 'PUT', `/api/todos/${todo.id}`, { completed: true });

      const res = await request(port, 'GET', '/api/stats');
      expect(res.status).toBe(200);
      expect(res.data).toEqual({
        total: 3,
        completed: 1,
        pending: 2,
      });
    });
  });
});
