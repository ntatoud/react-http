# react-http-renderer

## 0.2.0

### Minor Changes

- [#4](https://github.com/ntatoud/react-http/pull/4) [`cc1a1f2`](https://github.com/ntatoud/react-http/commit/cc1a1f23252703c52872b22ecb255b880984571c) Thanks [@ntatoud](https://github.com/ntatoud)! - Initial release of react-http-renderer

  - Custom React Reconciler for HTTP server rendering
  - Declarative JSX components: `<Server>`, `<Route>`, `<Get>`, `<Post>`, `<Put>`, `<Delete>`, `<Patch>`, `<Options>`, `<Head>`, `<Middleware>`
  - React hooks: `useRequest()` and `useResponse()`
  - Middleware support with scoped execution and chaining
  - URL parameter extraction and query string parsing
  - JSON request body parsing
  - Full TypeScript support with typed RequestContext, handlers, and middleware
  - Zero external HTTP dependencies — built on Node.js `http` module

## 0.1.0

### Initial Release

- Custom React Reconciler for HTTP server rendering
- JSX components: `<Server>`, `<Route>`, `<Get>`, `<Post>`, `<Put>`, `<Delete>`, `<Patch>`, `<Options>`, `<Head>`, `<Middleware>`
- Hooks: `useRequest()`, `useResponse()`
- Middleware support with scoped execution
- URL parameter and query string parsing
- JSON body parsing
- TypeScript support with full type definitions
