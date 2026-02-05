import { createContext, useContext } from 'react';
import type { RequestContext } from './types.js';
import type { ServerResponse } from 'http';

export const RequestContextReact = createContext<RequestContext | null>(null);
export const ResponseContextReact = createContext<ServerResponse | null>(null);

export function useRequest(): RequestContext {
  const ctx = useContext(RequestContextReact);
  if (!ctx) {
    throw new Error('useRequest must be used within a request handler');
  }
  return ctx;
}

export function useResponse(): ServerResponse {
  const ctx = useContext(ResponseContextReact);
  if (!ctx) {
    throw new Error('useResponse must be used within a request handler');
  }
  return ctx;
}
