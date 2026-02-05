<p align="center">
  <img src="assets/banner.png" alt="react-http-renderer" width="200" />
</p>

<h1 align="center">react-http-renderer</h1>

<p align="center">
  <strong>A React renderer for HTTP servers. Define your routes declaratively with JSX.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/react-http-renderer"><img src="https://img.shields.io/npm/v/react-http-renderer?style=flat-square&color=0ea5e9" alt="npm version" /></a>
  <a href="https://github.com/ntatoud/react-http/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ntatoud/react-http/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="https://github.com/ntatoud/react-http/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#api-reference">API Reference</a> &bull;
  <a href="#advanced-usage">Advanced Usage</a> &bull;
  <a href="#example-app">Example App</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

> **Disclaimer:** This is a fun, experimental project built for learning and exploration. It is **not intended for production use**. If you need a battle-tested HTTP framework, check out [Express](https://expressjs.com), [Fastify](https://fastify.dev), or [Hono](https://hono.dev).

---

## Overview

**react-http-renderer** uses a custom [React Reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler) to transform JSX component trees into HTTP routing structures. Instead of rendering to the DOM, it renders to a fully functional HTTP server powered by Node's built-in `http` module.

```tsx
const App = () => (
  <Server port={3000}>
    <Route path="/api/todos">
      <Get handler={() => ({ todos: [] })} />
      <Post handler={(ctx) => ({ created: ctx.body })} />
    </Route>
  </Server>
);

createServer(<App />).listen();
```

### Why?

- **Declarative** &mdash; Define routes as a component tree, not imperative method chains
- **Composable** &mdash; Nest routes, scope middleware, and extract patterns into reusable components
- **Type-safe** &mdash; Full TypeScript support with typed request context, handlers, and middleware
- **Zero external dependencies** &mdash; Only React and `react-reconciler` &mdash; no Express, Koa, or Fastify
- **Familiar** &mdash; If you know React, you already know the mental model

## Quick Start

### Prerequisites

- **Node.js** &ge; 18
- **pnpm** &ge; 10 (recommended) or npm

### Installation

```bash
npm install react-http-renderer react
```

Or from source:

```bash
git clone https://github.com/ntatoud/react-http.git
cd react-http
pnpm install
pnpm build
```

### Hello World

```tsx
import React from "react";
import { createServer, Server, Get } from "react-http-renderer";

const App = () => (
  <Server port={3000}>
    <Get handler={() => ({ message: "Hello, World!" })} />
  </Server>
);

createServer(<App />).listen();
// => Server listening on http://localhost:3000
```

## API Reference

### Components

| Component | Props | Description |
|---|---|---|
| `<Server>` | `port` | Root server container. Wraps all routes and middleware. |
| `<Route>` | `path` | Route group with a path prefix. Supports nesting. |
| `<Get>` | `handler`, `path?` | Handles `GET` requests. |
| `<Post>` | `handler`, `path?` | Handles `POST` requests. |
| `<Put>` | `handler`, `path?` | Handles `PUT` requests. |
| `<Delete>` | `handler`, `path?` | Handles `DELETE` requests. |
| `<Patch>` | `handler`, `path?` | Handles `PATCH` requests. |
| `<Options>` | `handler`, `path?` | Handles `OPTIONS` requests. |
| `<Head>` | `handler`, `path?` | Handles `HEAD` requests. |
| `<Middleware>` | `use` | Attaches a middleware function to the current scope. |

### Hooks

| Hook | Returns | Description |
|---|---|---|
| `useRequest()` | `RequestContext` | Access the current request context inside components. |
| `useResponse()` | `ServerResponse` | Access the raw Node.js response object. |

### Request Context

Every handler receives a `RequestContext` object:

```ts
interface RequestContext {
  req: IncomingMessage;                // Raw Node.js request
  res: ServerResponse;                 // Raw Node.js response
  params: Record<string, string>;      // URL params (e.g. :id)
  query: Record<string, string>;       // Parsed query string
  path: string;                        // Request path
  method: HttpMethod;                  // HTTP method
  body?: any;                          // Parsed JSON body
}
```

### Handler Return Values

| Return type | Behavior |
|---|---|
| `object` / `array` | Serialized as JSON with `Content-Type: application/json` |
| `string` | Sent as plain text |
| `undefined` | No automatic response &mdash; useful for streaming or manual `res.end()` |

## Advanced Usage

### Middleware

Middleware functions receive the request context and a `next` function. Call `next()` to continue to the next middleware or handler. Skip `next()` to short-circuit the chain.

```tsx
import { type MiddlewareHandler } from "react-http-renderer";

// Logging
const logger: MiddlewareHandler = async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(`${ctx.method} ${ctx.path} ${ctx.res.statusCode} ${Date.now() - start}ms`);
};

// CORS
const cors: MiddlewareHandler = async (ctx, next) => {
  ctx.res.setHeader("Access-Control-Allow-Origin", "*");
  ctx.res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");

  if (ctx.method === "OPTIONS") {
    ctx.res.statusCode = 204;
    ctx.res.end();
    return; // short-circuit
  }
  await next();
};

// Authentication guard
const auth: MiddlewareHandler = async (ctx, next) => {
  const token = ctx.req.headers.authorization?.slice(7);
  if (!token) {
    ctx.res.statusCode = 401;
    ctx.res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  await next();
};
```

### Nested Routes with Scoped Middleware

Middleware is scoped to the `<Route>` it's declared in. This lets you apply different middleware to different parts of your API without global state.

```tsx
const App = () => (
  <Server port={3000}>
    {/* Global middleware */}
    <Middleware use={logger} />
    <Middleware use={cors} />

    <Route path="/api">
      {/* Public endpoints */}
      <Route path="/users">
        <Get handler={listUsers} />
        <Post handler={createUser} />

        <Route path="/:id">
          <Get handler={getUser} />
          <Put handler={updateUser} />
          <Delete handler={deleteUser} />

          {/* Deeply nested: /api/users/:id/posts */}
          <Route path="/posts">
            <Get handler={getUserPosts} />
          </Route>
        </Route>
      </Route>
    </Route>

    {/* Protected endpoints */}
    <Route path="/admin">
      <Middleware use={auth} />
      <Get path="/stats" handler={getStats} />
    </Route>
  </Server>
);
```

### URL Parameters & Query Strings

```tsx
// URL params: GET /users/42 => ctx.params.id === "42"
<Route path="/users/:id">
  <Get handler={(ctx) => db.getUser(ctx.params.id)} />
</Route>

// Query strings: GET /search?q=react&limit=10
<Get path="/search" handler={(ctx) => {
  const { q, limit = "10" } = ctx.query;
  return db.search(q, parseInt(limit));
}} />
```

### Error Handling

Control HTTP status codes by setting `ctx.res.statusCode` before returning:

```tsx
const getUser = (ctx: RequestContext) => {
  const user = db.users.find((u) => u.id === ctx.params.id);

  if (!user) {
    ctx.res.statusCode = 404;
    return { error: "User not found" };
  }

  return user;
};

const createUser = (ctx: RequestContext) => {
  const { name, email } = ctx.body || {};

  if (!name || !email) {
    ctx.res.statusCode = 400;
    return { error: "Validation failed", fields: ["name", "email"] };
  }

  ctx.res.statusCode = 201;
  return db.createUser({ name, email });
};
```

### Streaming Responses

Return `undefined` to take full control of the response lifecycle:

```tsx
const streamEvents = (ctx: RequestContext) => {
  ctx.res.setHeader("Content-Type", "text/event-stream");
  ctx.res.setHeader("Cache-Control", "no-cache");

  let count = 0;
  const interval = setInterval(() => {
    ctx.res.write(`data: ${JSON.stringify({ count: ++count })}\n\n`);
    if (count >= 5) {
      clearInterval(interval);
      ctx.res.end();
    }
  }, 1000);

  return undefined;
};
```

## Example App

The repo includes a **full-stack Todo application** that demonstrates real-world usage of `react-http-renderer`.

```
apps/todo-app/
├── backend/     # REST API built with react-http-renderer
└── frontend/    # React + Vite client
```

### Running the Example

```bash
# Start both frontend and backend in development mode
pnpm dev

# Or run them individually
pnpm --filter @todo-app/backend dev    # API on http://localhost:3001
pnpm --filter @todo-app/frontend dev   # Client on http://localhost:5173
```

### Backend Highlights

The backend defines a full CRUD API in a single JSX tree:

```tsx
const App = () => (
  <Server port={3001}>
    <Middleware use={logger} />
    <Middleware use={cors} />

    <Route path="/api">
      <Get path="/health" handler={() => ({ status: "ok" })} />
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
```

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/stats` | Todo statistics |
| `GET` | `/api/todos` | List todos (supports `?completed=true\|false`) |
| `POST` | `/api/todos` | Create a todo |
| `GET` | `/api/todos/:id` | Get a todo by ID |
| `PUT` | `/api/todos/:id` | Update a todo |
| `DELETE` | `/api/todos/:id` | Delete a todo |

## Project Structure

```
react-http/
├── packages/
│   └── react-http-renderer/   # Core renderer library
│       └── src/
│           ├── index.ts       # Public API exports
│           ├── components.tsx  # JSX components (Server, Route, Get, etc.)
│           ├── reconciler.ts   # React Reconciler host config
│           ├── router.ts       # Path matching, middleware, request handling
│           ├── server.ts       # Server creation and lifecycle
│           ├── context.ts      # React context (useRequest, useResponse)
│           └── types.ts        # TypeScript type definitions
├── apps/
│   └── todo-app/
│       ├── backend/           # Example API server
│       └── frontend/          # Example React client
├── turbo.json                 # Turborepo pipeline config
└── pnpm-workspace.yaml        # Workspace definitions
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests across the monorepo
pnpm test

# Start dev mode (watches for changes)
pnpm dev

# Clean all build artifacts
pnpm clean
```

## Testing

The project has comprehensive test coverage across all packages:

```bash
# Run all tests
pnpm test

# Run tests for the core library only
pnpm --filter react-http-renderer test

# Run tests for the example app
pnpm --filter @todo-app/backend test
pnpm --filter @todo-app/frontend test
```

Tests include:
- **Unit tests** &mdash; Router path matching, query parsing, body parsing
- **Integration tests** &mdash; Full request/response cycles with middleware chains
- **API tests** &mdash; End-to-end CRUD operations on the todo example

## Tech Stack

| Layer | Technology |
|---|---|
| Renderer | [React Reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler) |
| Runtime | [Node.js](https://nodejs.org) built-in `http` module |
| Language | [TypeScript](https://www.typescriptlang.org) 5.3 |
| Monorepo | [Turborepo](https://turbo.build) + [pnpm](https://pnpm.io) workspaces |
| Testing | [Vitest](https://vitest.dev) |
| Frontend | [React](https://react.dev) + [Vite](https://vite.dev) |
| CI | [GitHub Actions](https://github.com/features/actions) |

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/my-feature`
3. **Commit** your changes: `git commit -m "feat: add my feature"`
4. **Push** to your branch: `git push origin feat/my-feature`
5. **Open** a Pull Request

Please make sure all tests pass before submitting:

```bash
pnpm build && pnpm test
```

## Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for version management and npm publishing.

### For Contributors

If your PR includes changes to the `react-http-renderer` package, add a changeset before submitting:

```bash
pnpm changeset
```

Follow the prompts to:
1. Select the `react-http-renderer` package
2. Choose the semver bump type (`patch` / `minor` / `major`)
3. Write a summary of your changes

Commit the generated `.changeset/*.md` file with your PR.

### How Releases Work

```
PR with changeset  ──>  Merge to main  ──>  "Version Packages" PR created automatically
                                                       │
                                                       v
                                              Merge Version PR  ──>  Published to npm
```

1. PRs that include `.changeset/*.md` files are merged into `main`
2. The [release workflow](.github/workflows/release.yml) automatically creates a **"Version Packages"** PR that:
   - Consumes all pending changesets
   - Bumps the version in `package.json`
   - Updates `CHANGELOG.md`
3. When the "Version Packages" PR is merged, the workflow publishes the new version to npm and creates a GitHub release

### Manual Release

For maintainers who need to publish manually:

```bash
pnpm build                  # Build all packages
pnpm version-packages       # Consume changesets and bump versions
pnpm release                # Build and publish to npm
```

### Setup (Maintainers)

This project uses [npm trusted publishing](https://docs.npmjs.com/generating-provenance-statements) via GitHub Actions OIDC — no static tokens required.

To enable automated publishing after the initial release:

1. Go to your package on [npmjs.com](https://www.npmjs.com) → **Settings** → **Publishing access**
2. Under **Trusted publishing**, add a publisher:
   - **Repository owner**: `ntatoud`
   - **Repository name**: `react-http`
   - **Workflow filename**: `release.yml`
3. Published packages will include verified [provenance statements](https://docs.npmjs.com/generating-provenance-statements)

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with React and a custom Reconciler.<br/>
  If you find this useful, consider giving it a star!
</p>
