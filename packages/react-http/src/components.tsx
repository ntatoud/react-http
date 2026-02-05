import React from 'react';
import type { ReactNode } from 'react';
import type { RequestHandler, MiddlewareHandler } from './types.js';

export interface ServerProps {
  port?: number;
  children?: ReactNode;
}

export function Server({ port, children }: ServerProps): React.ReactElement {
  return React.createElement('server', { port }, children);
}

export interface RouteProps {
  path: string;
  children?: ReactNode;
}

export function Route({ path, children }: RouteProps): React.ReactElement {
  return React.createElement('route', { path }, children);
}

export interface MethodProps {
  handler: RequestHandler;
  path?: string;
}

export function Get({ handler, path }: MethodProps): React.ReactElement {
  return React.createElement('get', { handler, path });
}

export function Post({ handler, path }: MethodProps): React.ReactElement {
  return React.createElement('post', { handler, path });
}

export function Put({ handler, path }: MethodProps): React.ReactElement {
  return React.createElement('put', { handler, path });
}

export function Delete({ handler, path }: MethodProps): React.ReactElement {
  return React.createElement('delete', { handler, path });
}

export function Patch({ handler, path }: MethodProps): React.ReactElement {
  return React.createElement('patch', { handler, path });
}

export function Options({ handler, path }: MethodProps): React.ReactElement {
  return React.createElement('options', { handler, path });
}

export function Head({ handler, path }: MethodProps): React.ReactElement {
  return React.createElement('head', { handler, path });
}

export interface MiddlewareProps {
  use: MiddlewareHandler;
}

export function Middleware({ use }: MiddlewareProps): React.ReactElement {
  return React.createElement('middleware', { use });
}
