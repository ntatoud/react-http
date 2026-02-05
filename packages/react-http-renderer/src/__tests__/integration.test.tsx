import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import http from 'http';
import { createServer } from '../server.js';
import { Server, Route, Get, Post, Middleware } from '../components.js';
import type { RequestContext, MiddlewareHandler, ReactHttpServer } from '../index.js';

function request(
  port: number,
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>,
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode!, body: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Integration: full HTTP request/response cycle', () => {
  let app: ReactHttpServer;
  let port: number;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('should handle GET requests and return JSON', async () => {
    app = createServer(
      <Server>
        <Route path="/hello">
          <Get handler={() => ({ message: 'world' })} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const res = await request(port, 'GET', '/hello');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'world' });
  });

  it('should return 404 for unknown routes', async () => {
    app = createServer(
      <Server>
        <Route path="/exists">
          <Get handler={() => ({ ok: true })} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const res = await request(port, 'GET', '/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });

  it('should parse URL params', async () => {
    app = createServer(
      <Server>
        <Route path="/users">
          <Route path="/:id">
            <Get handler={(ctx: RequestContext) => ({ id: ctx.params.id })} />
          </Route>
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const res = await request(port, 'GET', '/users/42');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: '42' });
  });

  it('should parse query parameters', async () => {
    app = createServer(
      <Server>
        <Route path="/search">
          <Get handler={(ctx: RequestContext) => ({ q: ctx.query.q })} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const res = await request(port, 'GET', '/search?q=hello');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ q: 'hello' });
  });

  it('should parse JSON request body', async () => {
    app = createServer(
      <Server>
        <Route path="/echo">
          <Post handler={(ctx: RequestContext) => ctx.body} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const res = await request(port, 'POST', '/echo', { name: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'Alice' });
  });

  it('should run middlewares before handler', async () => {
    const order: string[] = [];
    const mw1: MiddlewareHandler = async (_ctx, next) => {
      order.push('mw1');
      await next();
    };
    const mw2: MiddlewareHandler = async (_ctx, next) => {
      order.push('mw2');
      await next();
    };

    app = createServer(
      <Server>
        <Route path="/test">
          <Middleware use={mw1} />
          <Middleware use={mw2} />
          <Get handler={() => {
            order.push('handler');
            return { ok: true };
          }} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    await request(port, 'GET', '/test');
    expect(order).toEqual(['mw1', 'mw2', 'handler']);
  });

  it('should support middleware short-circuiting (auth)', async () => {
    const authGuard: MiddlewareHandler = async (ctx, next) => {
      if (!ctx.req.headers.authorization) {
        ctx.res.statusCode = 401;
        ctx.res.setHeader('Content-Type', 'application/json');
        ctx.res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      await next();
    };

    app = createServer(
      <Server>
        <Route path="/protected">
          <Middleware use={authGuard} />
          <Get handler={() => ({ secret: 'data' })} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const res1 = await request(port, 'GET', '/protected');
    expect(res1.status).toBe(401);

    const res2 = await request(port, 'GET', '/protected', undefined, {
      Authorization: 'Bearer token',
    });
    expect(res2.status).toBe(200);
    expect(res2.body).toEqual({ secret: 'data' });
  });

  it('should handle multiple HTTP methods on the same route', async () => {
    const users = [{ id: 1, name: 'Alice' }];

    app = createServer(
      <Server>
        <Route path="/users">
          <Get handler={() => users} />
          <Post handler={(ctx: RequestContext) => {
            const user = { id: 2, ...ctx.body };
            users.push(user);
            return user;
          }} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const getRes = await request(port, 'GET', '/users');
    expect(getRes.body).toHaveLength(1);

    const postRes = await request(port, 'POST', '/users', { name: 'Bob' });
    expect(postRes.body.name).toBe('Bob');
  });

  it('should handle handler errors with 500 status', async () => {
    app = createServer(
      <Server>
        <Route path="/error">
          <Get handler={() => { throw new Error('boom'); }} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    port = (httpServer.address() as any).port;

    const res = await request(port, 'GET', '/error');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
