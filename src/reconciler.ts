import ReactReconciler from 'react-reconciler';
import { DefaultEventPriority } from 'react-reconciler/constants.js';
import type { ServerNode, RouteNode, MethodNode, MiddlewareNode, HttpMethod } from './types.js';

type Container = { children: ServerNode[] };
type Instance = ServerNode;

function createInstance(type: string, props: Record<string, any>): Instance {
  switch (type) {
    case 'server':
      return {
        type: 'server',
        port: props.port || 3000,
        children: [],
        middlewares: [],
      };
    case 'route':
      return {
        type: 'route',
        path: props.path || '/',
        children: [],
        middlewares: [],
      } as RouteNode;
    case 'get':
    case 'post':
    case 'put':
    case 'delete':
    case 'patch':
    case 'options':
    case 'head':
      return {
        type: 'method',
        method: type.toUpperCase() as HttpMethod,
        path: props.path,
        handler: props.handler,
      } as MethodNode;
    case 'middleware':
      return {
        type: 'middleware',
        handler: props.use,
      } as MiddlewareNode;
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
}

const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  createInstance,
  createTextInstance() {
    throw new Error('Text nodes are not supported in react-http');
  },

  appendInitialChild(parent: Instance, child: Instance) {
    if (child.type === 'middleware') {
      if (!parent.middlewares) parent.middlewares = [];
      parent.middlewares.push((child as MiddlewareNode).handler);
    } else {
      if (!parent.children) parent.children = [];
      parent.children.push(child);
    }
  },

  appendChild(parent: Instance, child: Instance) {
    if (child.type === 'middleware') {
      if (!parent.middlewares) parent.middlewares = [];
      parent.middlewares.push((child as MiddlewareNode).handler);
    } else {
      if (!parent.children) parent.children = [];
      parent.children.push(child);
    }
  },

  appendChildToContainer(container: Container, child: Instance) {
    container.children.push(child);
  },

  removeChild(parent: Instance, child: Instance) {
    if (parent.children) {
      const index = parent.children.indexOf(child);
      if (index !== -1) parent.children.splice(index, 1);
    }
  },

  removeChildFromContainer(container: Container, child: Instance) {
    const index = container.children.indexOf(child);
    if (index !== -1) container.children.splice(index, 1);
  },

  insertBefore(parent: Instance, child: Instance, beforeChild: Instance) {
    if (!parent.children) parent.children = [];
    const index = parent.children.indexOf(beforeChild);
    if (index !== -1) {
      parent.children.splice(index, 0, child);
    } else {
      parent.children.push(child);
    }
  },

  insertInContainerBefore(container: Container, child: Instance, beforeChild: Instance) {
    const index = container.children.indexOf(beforeChild);
    if (index !== -1) {
      container.children.splice(index, 0, child);
    } else {
      container.children.push(child);
    }
  },

  finalizeInitialChildren() {
    return false;
  },

  prepareUpdate(_instance: Instance, _type: string, oldProps: Record<string, any>, newProps: Record<string, any>) {
    const updatePayload: Record<string, any> = {};
    for (const key in newProps) {
      if (oldProps[key] !== newProps[key]) {
        updatePayload[key] = newProps[key];
      }
    }
    return Object.keys(updatePayload).length > 0 ? updatePayload : null;
  },

  commitUpdate(instance: Instance, updatePayload: Record<string, any>) {
    Object.assign(instance, updatePayload);
  },

  shouldSetTextContent() {
    return false;
  },

  getRootHostContext() {
    return { currentPath: '' };
  },

  getChildHostContext(parentContext: { currentPath: string }) {
    return parentContext;
  },

  getPublicInstance(instance: Instance) {
    return instance;
  },

  prepareForCommit() {
    return null;
  },

  resetAfterCommit() {},

  preparePortalMount() {},

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1 as const,

  isPrimaryRenderer: true,

  getCurrentEventPriority() {
    return DefaultEventPriority;
  },

  getInstanceFromNode() {
    return null;
  },

  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},

  prepareScopeUpdate() {},

  getInstanceFromScope() {
    return null;
  },

  detachDeletedInstance() {},

  clearContainer(container: Container) {
    container.children = [];
  },
};

export const reconciler = ReactReconciler(hostConfig as any);

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  version: '0.1.0',
  rendererPackageName: 'react-http',
});
