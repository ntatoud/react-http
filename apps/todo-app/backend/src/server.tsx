import React from 'react';
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
} from 'react-http-renderer';

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
// In-memory data store
// ============================================================================

const todos: Map<string, Todo> = new Map();
let nextId = 1;

// Seed some initial data
const seedTodos = () => {
  const initial: Omit<Todo, 'id' | 'createdAt'>[] = [
    { title: 'Learn React', completed: true },
    { title: 'Build a todo app', completed: false },
    { title: 'Deploy to production', completed: false },
  ];

  initial.forEach((todo) => {
    const id = String(nextId++);
    todos.set(id, {
      ...todo,
      id,
      createdAt: new Date().toISOString(),
    });
  });
};

seedTodos();

// ============================================================================
// Middleware
// ============================================================================

const logger: MiddlewareHandler = async (ctx, next) => {
  const start = Date.now();
  console.log(`→ ${ctx.method} ${ctx.path}`);
  await next();
  const duration = Date.now() - start;
  console.log(`← ${ctx.method} ${ctx.path} ${ctx.res.statusCode} (${duration}ms)`);
};

const cors: MiddlewareHandler = async (ctx, next) => {
  ctx.res.setHeader('Access-Control-Allow-Origin', '*');
  ctx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (ctx.method === 'OPTIONS') {
    ctx.res.statusCode = 204;
    ctx.res.end();
    return;
  }

  await next();
};

// ============================================================================
// Handlers
// ============================================================================

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

// ============================================================================
// Application
// ============================================================================

const App = () => (
  <Server port={3001}>
    <Middleware use={logger} />
    <Middleware use={cors} />

    <Route path="/api">
      {/* Health check */}
      <Get path="/health" handler={() => ({ status: 'ok' })} />

      {/* Stats */}
      <Get path="/stats" handler={getStats} />

      {/* Todos CRUD */}
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

// ============================================================================
// Start server
// ============================================================================

const server = createServer(<App />);

server.listen().then(() => {
  console.log('🚀 Todo API server running at http://localhost:3001');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /api/health     - Health check');
  console.log('  GET    /api/stats      - Get todo statistics');
  console.log('  GET    /api/todos      - List all todos');
  console.log('  POST   /api/todos      - Create a new todo');
  console.log('  GET    /api/todos/:id  - Get a todo by ID');
  console.log('  PUT    /api/todos/:id  - Update a todo');
  console.log('  DELETE /api/todos/:id  - Delete a todo');
});

export { App, createTodo, listTodos, getTodo, updateTodo, deleteTodo };
