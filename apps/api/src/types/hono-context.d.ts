/**
 * Global Hono context variable augmentation.
 * Every middleware that sets variables on the context is reflected here so
 * routes can read them without per-file generics.
 */
import 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}
