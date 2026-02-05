import { describe, it, expect } from 'vitest';
import React from 'react';
import { createServer } from '../server.js';
import { Server, Route, Get } from '../components.js';
import type { RouteNode, MethodNode } from '../types.js';

describe('createServer', () => {
  it('should create a server and expose getTree()', () => {
    const app = createServer(
      <Server port={3000}>
        <Route path="/test">
          <Get handler={() => ({ ok: true })} />
        </Route>
      </Server>
    );
    const tree = app.getTree();
    expect(tree).not.toBeNull();
    expect(tree!.type).toBe('server');
  });

  it('should build correct route tree', () => {
    const handler = () => ({ ok: true });
    const app = createServer(
      <Server port={3000}>
        <Route path="/api">
          <Route path="/users">
            <Get handler={handler} />
          </Route>
        </Route>
      </Server>
    );
    const tree = app.getTree()!;
    const apiRoute = tree.children[0] as RouteNode;
    expect(apiRoute.path).toBe('/api');
    const usersRoute = apiRoute.children[0] as RouteNode;
    expect(usersRoute.path).toBe('/users');
    const getNode = usersRoute.children[0] as MethodNode;
    expect(getNode.method).toBe('GET');
    expect(getNode.handler).toBe(handler);
  });

  it('should return empty children when no routes are rendered', () => {
    const app = createServer(React.createElement('server', {}));
    const tree = app.getTree();
    expect(tree).not.toBeNull();
    expect(tree!.children).toEqual([]);
  });

  it('listen() should start an HTTP server and close() should stop it', async () => {
    const app = createServer(
      <Server port={0}>
        <Route path="/health">
          <Get handler={() => ({ status: 'ok' })} />
        </Route>
      </Server>
    );
    const httpServer = await app.listen(0);
    const address = httpServer.address();
    expect(address).not.toBeNull();
    await app.close();
  });
});
