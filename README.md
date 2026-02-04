# react-http

A React renderer for HTTP servers. Define your routes declaratively with JSX.

## Setup

```bash
npm install
```

## Quick Start

```tsx
import React from 'react';
import { createServer, Server, Route, Get, Post, Middleware } from './src';

function App() {
  return (
    <Server port={3000}>
      <Route path="/users">
        <Get handler={(ctx) => [{ id: 1, name: 'Alice' }]} />
        <Post handler={(ctx) => ({ created: true, user: ctx.body })} />

        <Route path="/:id">
          <Get handler={(ctx) => ({ id: ctx.params.id })} />
        </Route>
      </Route>
    </Server>
  );
}

createServer(<App />).listen();
```

## Run examples

```bash
npm start              # Basic example
npm run start:advanced # Full CRUD API with auth
```

## API Reference

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `<Server>` | `port` | Root server container |
| `<Route>` | `path` | Route group with path prefix |
| `<Get>` | `handler`, `path?` | GET endpoint |
| `<Post>` | `handler`, `path?` | POST endpoint |
| `<Put>` | `handler`, `path?` | PUT endpoint |
| `<Delete>` | `handler`, `path?` | DELETE endpoint |
| `<Middleware>` | `use` | Middleware function |

### Request Context

Handlers receive a `RequestContext` object:

```ts
interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;  // URL params like :id
  query: Record<string, string>;   // Query string
  path: string;
  method: HttpMethod;
  body?: any;                      // Parsed JSON body
}
```

---

## Advanced Usage

### Middleware Patterns

#### Logging middleware

```tsx
const logger: MiddlewareHandler = async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(`${ctx.method} ${ctx.path} - ${ctx.res.statusCode} - ${Date.now() - start}ms`);
};
```

#### CORS middleware

```tsx
const cors: MiddlewareHandler = async (ctx, next) => {
  ctx.res.setHeader('Access-Control-Allow-Origin', '*');
  ctx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

  if (ctx.method === 'OPTIONS') {
    ctx.res.statusCode = 204;
    ctx.res.end();
    return;
  }
  await next();
};
```

#### Authentication middleware

```tsx
const authRequired: MiddlewareHandler = async (ctx, next) => {
  const token = ctx.req.headers.authorization?.slice(7);

  if (!token || token !== 'secret') {
    ctx.res.statusCode = 401;
    ctx.res.setHeader('Content-Type', 'application/json');
    ctx.res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  await next();
};
```

### Nested Routes with Scoped Middleware

```tsx
function App() {
  return (
    <Server port={3000}>
      {/* Global middlewares */}
      <Middleware use={logger} />
      <Middleware use={cors} />

      {/* Public API */}
      <Route path="/api">
        <Route path="/users">
          <Get handler={listUsers} />
          <Post handler={createUser} />

          <Route path="/:id">
            <Get handler={getUser} />
            <Put handler={updateUser} />
            <Delete handler={deleteUser} />

            {/* Nested: /api/users/:id/posts */}
            <Route path="/posts">
              <Get handler={getUserPosts} />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Protected routes - middleware only applies here */}
      <Route path="/admin">
        <Middleware use={authRequired} />
        <Route path="/stats">
          <Get handler={getStats} />
        </Route>
      </Route>
    </Server>
  );
}
```

### Query Parameters & Filtering

```tsx
function listUsers(ctx: RequestContext) {
  const { role, search, limit = '10' } = ctx.query;

  let users = db.users;

  if (role) {
    users = users.filter(u => u.role === role);
  }
  if (search) {
    users = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  }

  return {
    users: users.slice(0, parseInt(limit)),
    count: users.length
  };
}

// Usage: GET /api/users?role=admin&search=alice&limit=5
```

### Error Handling

```tsx
function getUser(ctx: RequestContext) {
  const id = parseInt(ctx.params.id);
  const user = db.users.find(u => u.id === id);

  if (!user) {
    ctx.res.statusCode = 404;
    return { error: 'User not found' };
  }

  return user;
}

function createUser(ctx: RequestContext) {
  const { name, email } = ctx.body || {};

  if (!name || !email) {
    ctx.res.statusCode = 400;
    return { error: 'Validation failed', fields: ['name', 'email'] };
  }

  const user = { id: nextId++, name, email };
  db.users.push(user);

  ctx.res.statusCode = 201;
  return user;
}
```

### Custom Response Headers

```tsx
function downloadFile(ctx: RequestContext) {
  ctx.res.setHeader('Content-Disposition', 'attachment; filename="data.json"');
  ctx.res.setHeader('Content-Type', 'application/octet-stream');

  return { data: 'file content' };
}
```

### Streaming Response

```tsx
function streamData(ctx: RequestContext) {
  ctx.res.setHeader('Content-Type', 'text/event-stream');
  ctx.res.setHeader('Cache-Control', 'no-cache');

  let count = 0;
  const interval = setInterval(() => {
    ctx.res.write(`data: ${JSON.stringify({ count: ++count })}\n\n`);
    if (count >= 5) {
      clearInterval(interval);
      ctx.res.end();
    }
  }, 1000);

  // Return undefined to prevent auto-end
  return undefined;
}
```

---

## Full Example

See `example/advanced.tsx` for a complete CRUD API with:
- User & Post resources
- Query filtering
- Authentication
- Error handling
- Multiple middleware layers
