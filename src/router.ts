import type { IncomingMessage, ServerResponse } from "http";
import type {
  ServerNode,
  RouteNode,
  MethodNode,
  RequestContext,
  MiddlewareHandler,
  HttpMethod,
} from "./types.js";

interface MatchedRoute {
  node: MethodNode;
  params: Record<string, string>;
  middlewares: MiddlewareHandler[];
}

function parseQueryString(queryString: string): Record<string, string> {
  const query: Record<string, string> = {};
  if (!queryString) return query;

  const pairs = queryString.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
    }
  }
  return query;
}

function matchPath(
  pattern: string,
  path: string,
): { match: boolean; params: Record<string, string> } {
  const params: Record<string, string> = {};

  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { match: false, params };
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return { match: false, params };
    }
  }

  return { match: true, params };
}

function findRoute(
  nodes: ServerNode[],
  method: HttpMethod,
  path: string,
  basePath: string = "",
  middlewares: MiddlewareHandler[] = [],
): MatchedRoute | null {
  for (const node of nodes) {
    if (node.type === "route") {
      const routeNode = node as RouteNode;
      const fullPath = joinPaths(basePath, routeNode.path);
      const accumulatedMiddlewares = [
        ...middlewares,
        ...(routeNode.middlewares || []),
      ];

      // First check if any method nodes at this level match
      for (const child of routeNode.children || []) {
        if (child.type === "method") {
          const methodNode = child as MethodNode;
          if (methodNode.method === method) {
            const checkPath = methodNode.path
              ? joinPaths(fullPath, methodNode.path)
              : fullPath;
            const { match, params } = matchPath(checkPath, path);
            if (match) {
              return {
                node: methodNode,
                params,
                middlewares: accumulatedMiddlewares,
              };
            }
          }
        }
      }

      // Then check nested routes
      const nestedResult = findRoute(
        routeNode.children || [],
        method,
        path,
        fullPath,
        accumulatedMiddlewares,
      );
      if (nestedResult) return nestedResult;
    } else if (node.type === "method") {
      const methodNode = node as MethodNode;
      if (methodNode.method === method) {
        const checkPath = methodNode.path
          ? joinPaths(basePath, methodNode.path)
          : basePath;
        const { match, params } = matchPath(checkPath, path);
        if (match) {
          return { node: methodNode, params, middlewares };
        }
      }
    }
  }

  return null;
}

function joinPaths(...paths: string[]): string {
  const joined = paths
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return "/" + joined;
}

async function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      if (!body) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(body);
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

export async function handleRequest(
  serverNode: ServerNode,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`,
  );
  const path = url.pathname;
  const method = (req.method || "GET").toUpperCase() as HttpMethod;
  const query = parseQueryString(url.search.slice(1));

  // Collect server-level middlewares
  const serverMiddlewares: MiddlewareHandler[] = serverNode.middlewares || [];

  const matched = findRoute(
    serverNode.children || [],
    method,
    path,
    "",
    serverMiddlewares,
  );

  if (!matched) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not Found", path, method }));
    return;
  }

  const body = await parseBody(req);

  const ctx: RequestContext = {
    req,
    res,
    params: matched.params,
    query,
    path,
    method,
    body,
  };

  // Run middlewares
  let index = 0;
  const allMiddlewares = matched.middlewares;

  const next = async (): Promise<void> => {
    if (index < allMiddlewares.length) {
      const middleware = allMiddlewares[index++];
      await middleware(ctx, next);
    }
  };

  try {
    await next();

    // After middlewares, call the handler
    const result = await matched.node.handler(ctx);

    if (!res.writableEnded) {
      if (result !== undefined) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
      } else {
        res.end();
      }
    }
  } catch (error) {
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      );
    }
  }
}
