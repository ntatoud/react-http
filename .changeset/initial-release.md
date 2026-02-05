---
"react-http-renderer": minor
---

Initial release of react-http-renderer

- Custom React Reconciler for HTTP server rendering
- Declarative JSX components: `<Server>`, `<Route>`, `<Get>`, `<Post>`, `<Put>`, `<Delete>`, `<Patch>`, `<Options>`, `<Head>`, `<Middleware>`
- React hooks: `useRequest()` and `useResponse()`
- Middleware support with scoped execution and chaining
- URL parameter extraction and query string parsing
- JSON request body parsing
- Full TypeScript support with typed RequestContext, handlers, and middleware
- Zero external HTTP dependencies — built on Node.js `http` module
