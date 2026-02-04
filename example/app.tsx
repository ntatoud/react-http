import React from 'react';
import {
  createServer,
  Server,
  Route,
  Get,
  Post,
  Middleware,
} from '../src/index.js';
import type { RequestContext, MiddlewareHandler } from '../src/index.js';

// Simple logging middleware
const logger: MiddlewareHandler = async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.path} - ${ms}ms`);
};

// Handlers
function getToto(ctx: RequestContext) {
  return { message: 'Hello from /toto!', query: ctx.query };
}

function getUsers(ctx: RequestContext) {
  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
}

function createUser(ctx: RequestContext) {
  return { created: true, user: ctx.body };
}

function getUserById(ctx: RequestContext) {
  return { id: ctx.params.id, name: `User ${ctx.params.id}` };
}

function healthCheck() {
  return { status: 'ok' };
}

function App() {
  return (
    <Server port={3000}>
      <Middleware use={logger} />

      <Route path="/toto">
        <Get handler={getToto} />
      </Route>

      <Route path="/users">
        <Get handler={getUsers} />
        <Post handler={createUser} />
        <Route path="/:id">
          <Get handler={getUserById} />
        </Route>
      </Route>

      <Route path="/health">
        <Get handler={healthCheck} />
      </Route>
    </Server>
  );
}

const server = createServer(<App />);

server.listen().then(() => {
  console.log('React HTTP server is running!');
  console.log('Try: curl http://localhost:3000/toto');
});
