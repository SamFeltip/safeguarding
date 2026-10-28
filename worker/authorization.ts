import type { MiddlewareHandler } from 'hono';
import type { WorkerContext } from './context';

export function requirePermission(
  permission: string,
  message: string,
): MiddlewareHandler<WorkerContext> {
  return async (context, next) => {
    if (!context.get('identity').permissions.includes(permission)) {
      return context.json({ error: message }, 403);
    }
    await next();
  };
}
