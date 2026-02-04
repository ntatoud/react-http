import type { IncomingMessage, ServerResponse } from 'http';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export type RequestHandler = (ctx: RequestContext) => any | Promise<any>;

export type MiddlewareHandler = (
  ctx: RequestContext,
  next: () => Promise<void>
) => void | Promise<void>;

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
  method: HttpMethod;
  body?: any;
}

export interface RouteNode {
  type: 'route';
  path: string;
  children: ServerNode[];
  middlewares: MiddlewareHandler[];
}

export interface MethodNode {
  type: 'method';
  method: HttpMethod;
  handler: RequestHandler;
  path?: string;
}

export interface MiddlewareNode {
  type: 'middleware';
  handler: MiddlewareHandler;
}

export interface ServerNode {
  type: 'server' | 'route' | 'method' | 'middleware';
  [key: string]: any;
}

export interface ServerConfig {
  port: number;
  children: ServerNode[];
}
