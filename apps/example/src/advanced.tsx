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
} from 'react-http';
import type { RequestContext, MiddlewareHandler } from 'react-http';

// =============================================================================
// MIDDLEWARES
// =============================================================================

const logger: MiddlewareHandler = async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.path} - ${ctx.res.statusCode} - ${ms}ms`);
};

const cors: MiddlewareHandler = async (ctx, next) => {
  ctx.res.setHeader('Access-Control-Allow-Origin', '*');
  ctx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  ctx.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (ctx.method === 'OPTIONS') {
    ctx.res.statusCode = 204;
    ctx.res.end();
    return;
  }
  await next();
};

const authRequired: MiddlewareHandler = async (ctx, next) => {
  const authHeader = ctx.req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.res.statusCode = 401;
    ctx.res.setHeader('Content-Type', 'application/json');
    ctx.res.end(JSON.stringify({ error: 'Unauthorized', message: 'Bearer token required' }));
    return;
  }

  // Simulate token validation
  const token = authHeader.slice(7);
  if (token !== 'secret-token') {
    ctx.res.statusCode = 403;
    ctx.res.setHeader('Content-Type', 'application/json');
    ctx.res.end(JSON.stringify({ error: 'Forbidden', message: 'Invalid token' }));
    return;
  }

  await next();
};

// =============================================================================
// IN-MEMORY DATABASE
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface Post {
  id: number;
  userId: number;
  title: string;
  content: string;
  createdAt: string;
}

const db = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' as const },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' as const },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'user' as const },
  ],
  posts: [
    { id: 1, userId: 1, title: 'Hello World', content: 'My first post', createdAt: '2024-01-01' },
    { id: 2, userId: 1, title: 'React HTTP', content: 'Building servers with JSX', createdAt: '2024-01-02' },
    { id: 3, userId: 2, title: 'Node.js Tips', content: 'Some useful tips', createdAt: '2024-01-03' },
  ],
  nextUserId: 4,
  nextPostId: 4,
};

// =============================================================================
// HANDLERS
// =============================================================================

// Users handlers
function listUsers(ctx: RequestContext) {
  const { role, search } = ctx.query;

  let users = db.users;

  if (role) {
    users = users.filter(u => u.role === role);
  }
  if (search) {
    users = users.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  }

  return { users, count: users.length };
}

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
  const { name, email, role = 'user' } = ctx.body || {};

  if (!name || !email) {
    ctx.res.statusCode = 400;
    return { error: 'Name and email are required' };
  }

  const user: User = {
    id: db.nextUserId++,
    name,
    email,
    role,
  };

  db.users.push(user);
  ctx.res.statusCode = 201;
  return user;
}

function updateUser(ctx: RequestContext) {
  const id = parseInt(ctx.params.id);
  const user = db.users.find(u => u.id === id);

  if (!user) {
    ctx.res.statusCode = 404;
    return { error: 'User not found' };
  }

  const { name, email, role } = ctx.body || {};
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;

  return user;
}

function deleteUser(ctx: RequestContext) {
  const id = parseInt(ctx.params.id);
  const index = db.users.findIndex(u => u.id === id);

  if (index === -1) {
    ctx.res.statusCode = 404;
    return { error: 'User not found' };
  }

  db.users.splice(index, 1);
  ctx.res.statusCode = 204;
  return undefined;
}

// Posts handlers
function listPosts(ctx: RequestContext) {
  const { userId } = ctx.query;

  let posts = db.posts;
  if (userId) {
    posts = posts.filter(p => p.userId === parseInt(userId));
  }

  return { posts, count: posts.length };
}

function getUserPosts(ctx: RequestContext) {
  const userId = parseInt(ctx.params.id);
  const posts = db.posts.filter(p => p.userId === userId);
  return { posts, count: posts.length };
}

function getPost(ctx: RequestContext) {
  const id = parseInt(ctx.params.postId);
  const post = db.posts.find(p => p.id === id);

  if (!post) {
    ctx.res.statusCode = 404;
    return { error: 'Post not found' };
  }

  // Include author info
  const author = db.users.find(u => u.id === post.userId);
  return { ...post, author };
}

function createPost(ctx: RequestContext) {
  const { userId, title, content } = ctx.body || {};

  if (!userId || !title || !content) {
    ctx.res.statusCode = 400;
    return { error: 'userId, title and content are required' };
  }

  const post: Post = {
    id: db.nextPostId++,
    userId,
    title,
    content,
    createdAt: new Date().toISOString().split('T')[0],
  };

  db.posts.push(post);
  ctx.res.statusCode = 201;
  return post;
}

// Health & info
function healthCheck() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}

function serverInfo() {
  return {
    name: 'react-http-advanced-example',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'GET /api/users',
      'POST /api/users',
      'GET /api/users/:id',
      'PUT /api/users/:id',
      'DELETE /api/users/:id',
      'GET /api/users/:id/posts',
      'GET /api/posts',
      'POST /api/posts',
      'GET /api/posts/:postId',
      'GET /admin/stats (requires auth)',
    ],
  };
}

// Admin handlers (protected)
function getStats() {
  return {
    users: db.users.length,
    posts: db.posts.length,
    usersByRole: {
      admin: db.users.filter(u => u.role === 'admin').length,
      user: db.users.filter(u => u.role === 'user').length,
    },
  };
}

// =============================================================================
// APP COMPONENT
// =============================================================================

function App() {
  return (
    <Server port={3000}>
      {/* Global middlewares */}
      <Middleware use={logger} />
      <Middleware use={cors} />

      {/* Public endpoints */}
      <Route path="/health">
        <Get handler={healthCheck} />
      </Route>

      <Route path="/info">
        <Get handler={serverInfo} />
      </Route>

      {/* API routes */}
      <Route path="/api">
        {/* Users CRUD */}
        <Route path="/users">
          <Get handler={listUsers} />
          <Post handler={createUser} />

          <Route path="/:id">
            <Get handler={getUser} />
            <Put handler={updateUser} />
            <Delete handler={deleteUser} />

            <Route path="/posts">
              <Get handler={getUserPosts} />
            </Route>
          </Route>
        </Route>

        {/* Posts */}
        <Route path="/posts">
          <Get handler={listPosts} />
          <Post handler={createPost} />

          <Route path="/:postId">
            <Get handler={getPost} />
          </Route>
        </Route>
      </Route>

      {/* Protected admin routes */}
      <Route path="/admin">
        <Middleware use={authRequired} />

        <Route path="/stats">
          <Get handler={getStats} />
        </Route>
      </Route>
    </Server>
  );
}

// =============================================================================
// START SERVER
// =============================================================================

const server = createServer(<App />);

server.listen().then(() => {
  console.log('\nReact HTTP Advanced Example');
  console.log('============================\n');
  console.log('Try these commands:\n');
  console.log('  curl http://localhost:3000/info');
  console.log('  curl http://localhost:3000/api/users');
  console.log('  curl "http://localhost:3000/api/users?role=admin"');
  console.log('  curl http://localhost:3000/api/users/1');
  console.log('  curl http://localhost:3000/api/users/1/posts');
  console.log('  curl http://localhost:3000/api/posts');
  console.log('  curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d \'{"name":"Dave","email":"dave@example.com"}\'');
  console.log('  curl http://localhost:3000/admin/stats  # Will return 401');
  console.log('  curl http://localhost:3000/admin/stats -H "Authorization: Bearer secret-token"');
  console.log('');
});
