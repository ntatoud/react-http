import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  matchPath,
  findRoute,
  parseQueryString,
  parseBody,
  joinPaths,
  handleRequest,
} from '../router.js';
import type { ServerNode, MethodNode, MiddlewareHandler } from '../types.js';

describe('parseQueryString', () => {
  it('should return empty object for empty string', () => {
    expect(parseQueryString('')).toEqual({});
  });

  it('should parse simple key-value pairs', () => {
    expect(parseQueryString('foo=bar&baz=qux')).toEqual({
      foo: 'bar',
      baz: 'qux',
    });
  });

  it('should handle URL-encoded values', () => {
    expect(parseQueryString('name=hello%20world')).toEqual({
      name: 'hello world',
    });
  });

  it('should handle keys without values', () => {
    expect(parseQueryString('flag')).toEqual({ flag: '' });
  });
});

describe('matchPath', () => {
  it('should match exact paths', () => {
    const result = matchPath('/users', '/users');
    expect(result).toEqual({ match: true, params: {} });
  });

  it('should not match different paths', () => {
    const result = matchPath('/users', '/posts');
    expect(result.match).toBe(false);
  });

  it('should extract named params', () => {
    const result = matchPath('/users/:id', '/users/42');
    expect(result).toEqual({ match: true, params: { id: '42' } });
  });

  it('should extract multiple params', () => {
    const result = matchPath('/users/:userId/posts/:postId', '/users/1/posts/5');
    expect(result).toEqual({
      match: true,
      params: { userId: '1', postId: '5' },
    });
  });

  it('should not match paths with different segment counts', () => {
    const result = matchPath('/users/:id', '/users');
    expect(result.match).toBe(false);
  });

  it('should match root path', () => {
    const result = matchPath('/', '/');
    expect(result).toEqual({ match: true, params: {} });
  });
});

describe('joinPaths', () => {
  it('should join two paths', () => {
    expect(joinPaths('/api', '/users')).toBe('/api/users');
  });

  it('should handle trailing/leading slashes', () => {
    expect(joinPaths('/api/', '/users/')).toBe('/api/users');
  });

  it('should handle empty segments', () => {
    expect(joinPaths('', '/users')).toBe('/users');
  });

  it('should return root for empty inputs', () => {
    expect(joinPaths('', '')).toBe('/');
  });
});

describe('findRoute', () => {
  it('should find a method node at root level', () => {
    const nodes: ServerNode[] = [
      { type: 'method', method: 'GET', handler: () => 'ok' } as MethodNode,
    ];
    const result = findRoute(nodes, 'GET', '/', '');
    expect(result).not.toBeNull();
    expect(result!.node.method).toBe('GET');
  });

  it('should find a method node inside a route', () => {
    const handler = () => 'users';
    const nodes: ServerNode[] = [
      {
        type: 'route',
        path: '/users',
        children: [
          { type: 'method', method: 'GET', handler } as MethodNode,
        ],
        middlewares: [],
      },
    ];
    const result = findRoute(nodes, 'GET', '/users', '');
    expect(result).not.toBeNull();
    expect(result!.node.handler).toBe(handler);
  });

  it('should find nested routes with params', () => {
    const handler = () => 'user-by-id';
    const nodes: ServerNode[] = [
      {
        type: 'route',
        path: '/users',
        children: [
          {
            type: 'route',
            path: '/:id',
            children: [
              { type: 'method', method: 'GET', handler } as MethodNode,
            ],
            middlewares: [],
          },
        ],
        middlewares: [],
      },
    ];
    const result = findRoute(nodes, 'GET', '/users/42', '');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({ id: '42' });
  });

  it('should accumulate middlewares through route nesting', () => {
    const mw1: MiddlewareHandler = async (_ctx, next) => next();
    const mw2: MiddlewareHandler = async (_ctx, next) => next();
    const handler = () => 'ok';
    const nodes: ServerNode[] = [
      {
        type: 'route',
        path: '/api',
        children: [
          {
            type: 'route',
            path: '/users',
            children: [
              { type: 'method', method: 'GET', handler } as MethodNode,
            ],
            middlewares: [mw2],
          },
        ],
        middlewares: [mw1],
      },
    ];
    const result = findRoute(nodes, 'GET', '/api/users', '');
    expect(result).not.toBeNull();
    expect(result!.middlewares).toHaveLength(2);
    expect(result!.middlewares[0]).toBe(mw1);
    expect(result!.middlewares[1]).toBe(mw2);
  });

  it('should return null for unmatched routes', () => {
    const nodes: ServerNode[] = [
      {
        type: 'route',
        path: '/users',
        children: [
          { type: 'method', method: 'GET', handler: () => 'ok' } as MethodNode,
        ],
        middlewares: [],
      },
    ];
    const result = findRoute(nodes, 'GET', '/posts', '');
    expect(result).toBeNull();
  });

  it('should return null for unmatched methods', () => {
    const nodes: ServerNode[] = [
      {
        type: 'route',
        path: '/users',
        children: [
          { type: 'method', method: 'GET', handler: () => 'ok' } as MethodNode,
        ],
        middlewares: [],
      },
    ];
    const result = findRoute(nodes, 'POST', '/users', '');
    expect(result).toBeNull();
  });

  it('should match method nodes with their own sub-paths', () => {
    const handler = () => 'specific';
    const nodes: ServerNode[] = [
      {
        type: 'route',
        path: '/api',
        children: [
          { type: 'method', method: 'GET', path: '/health', handler } as MethodNode,
        ],
        middlewares: [],
      },
    ];
    const result = findRoute(nodes, 'GET', '/api/health', '');
    expect(result).not.toBeNull();
    expect(result!.node.handler).toBe(handler);
  });
});

describe('parseBody', () => {
  function createMockRequest(body: string): IncomingMessage {
    const readable = new Readable({
      read() {
        if (body) this.push(body);
        this.push(null);
      },
    });
    return readable as unknown as IncomingMessage;
  }

  it('should parse JSON body', async () => {
    const req = createMockRequest('{"name":"Alice"}');
    const result = await parseBody(req);
    expect(result).toEqual({ name: 'Alice' });
  });

  it('should return raw string for non-JSON body', async () => {
    const req = createMockRequest('hello world');
    const result = await parseBody(req);
    expect(result).toBe('hello world');
  });

  it('should return undefined for empty body', async () => {
    const req = createMockRequest('');
    const result = await parseBody(req);
    expect(result).toBeUndefined();
  });
});

describe('handleRequest', () => {
  function createMockReqRes(method: string, url: string, body?: string) {
    const readable = new Readable({
      read() {
        if (body) this.push(body);
        this.push(null);
      },
    });
    const req = Object.assign(readable, {
      method,
      url,
      headers: { host: 'localhost:3000' },
    }) as unknown as IncomingMessage;

    const chunks: string[] = [];
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let ended = false;

    const res = {
      get statusCode() { return statusCode; },
      set statusCode(v: number) { statusCode = v; },
      get writableEnded() { return ended; },
      setHeader(k: string, v: string) { headers[k] = v; },
      end(data?: string) {
        if (data) chunks.push(data);
        ended = true;
      },
      write(data: string) { chunks.push(data); },
      getBody() { return chunks.join(''); },
      getHeaders() { return headers; },
    } as unknown as ServerResponse & { getBody(): string; getHeaders(): Record<string, string> };

    return { req, res };
  }

  it('should return 404 for unmatched routes', async () => {
    const serverNode: ServerNode = {
      type: 'server',
      port: 3000,
      children: [],
      middlewares: [],
    };
    const { req, res } = createMockReqRes('GET', '/nonexistent');
    await handleRequest(serverNode, req, res);
    expect(res.statusCode).toBe(404);
  });

  it('should call handler and return JSON response', async () => {
    const serverNode: ServerNode = {
      type: 'server',
      port: 3000,
      children: [
        {
          type: 'route',
          path: '/hello',
          children: [
            {
              type: 'method',
              method: 'GET',
              handler: () => ({ message: 'hi' }),
            },
          ],
          middlewares: [],
        },
      ],
      middlewares: [],
    };
    const { req, res } = createMockReqRes('GET', '/hello');
    await handleRequest(serverNode, req, res);
    expect(JSON.parse((res as any).getBody())).toEqual({ message: 'hi' });
  });

  it('should run middlewares before handler', async () => {
    const order: string[] = [];
    const mw: MiddlewareHandler = async (_ctx, next) => {
      order.push('middleware');
      await next();
    };
    const serverNode: ServerNode = {
      type: 'server',
      port: 3000,
      children: [
        {
          type: 'route',
          path: '/test',
          children: [
            {
              type: 'method',
              method: 'GET',
              handler: () => {
                order.push('handler');
                return { ok: true };
              },
            },
          ],
          middlewares: [mw],
        },
      ],
      middlewares: [],
    };
    const { req, res } = createMockReqRes('GET', '/test');
    await handleRequest(serverNode, req, res);
    expect(order).toEqual(['middleware', 'handler']);
  });
});
