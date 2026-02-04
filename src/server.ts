import { createServer as createHttpServer, Server as HttpServer } from 'http';
import type { ReactElement } from 'react';
import { reconciler } from './reconciler.js';
import { handleRequest } from './router.js';
import type { ServerNode } from './types.js';

interface Container {
  children: ServerNode[];
}

export interface ReactHttpServer {
  listen: (port?: number) => Promise<HttpServer>;
  close: () => Promise<void>;
  getTree: () => ServerNode | null;
}

export function createServer(element: ReactElement): ReactHttpServer {
  const container: Container = { children: [] };

  const root = (reconciler as any).createContainer(
    container,
    0, // LegacyRoot
    null,
    false,
    null,
    '',
    (error: Error) => console.error('Recoverable error:', error),
    null
  );

  reconciler.updateContainer(element, root, null, () => {});

  let httpServer: HttpServer | null = null;

  return {
    getTree() {
      return container.children[0] || null;
    },

    async listen(port?: number) {
      const serverNode = container.children[0];
      if (!serverNode) {
        throw new Error('No server element found');
      }

      const serverPort = port ?? serverNode.port ?? 3000;

      httpServer = createHttpServer((req, res) => {
        handleRequest(serverNode, req, res).catch((error) => {
          console.error('Request handling error:', error);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });
      });

      return new Promise((resolve, reject) => {
        httpServer!.on('error', reject);
        httpServer!.listen(serverPort, () => {
          console.log(`Server listening on http://localhost:${serverPort}`);
          resolve(httpServer!);
        });
      });
    },

    async close() {
      if (httpServer) {
        return new Promise((resolve, reject) => {
          httpServer!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    },
  };
}
